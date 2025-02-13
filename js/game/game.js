import { Stage } from "./stage.js";
import { Camera } from "./camera.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { ObjectManager } from "./objectmanager.js";
import { Progress } from "./progress.js";
import { drawGameSavingIcon, drawHUD, drawBossHealthbar, GAME_SAVE_ANIMATION_TIME } from "./hud.js";
import { RGBA } from "../math/rgba.js";
import { Pause } from "./pause.js";
import { TextBox } from "../ui/textbox.js";
import { ConfirmationBox } from "../ui/confirmationbox.js";
import { HintRenderer } from "./hintrenderer.js";
import { Cutscene } from "./cutscene.js";
import { constructShop } from "./shopbuilder.js";
const MAP_NAME_APPEAR_TIME = 90;
const MAP_NAME_FADE_TIME = 30;
const WORLD_DESTRUCTION_TIMER = 120;
export class Game {
    constructor(event) {
        this.stage = undefined;
        this.progress = undefined;
        this.objects = undefined;
        this.initialDialogueActivated = false;
        this.gameSaveTimer = 0;
        this.gameSaveMode = 0;
        this.fileIndex = 0;
        this.tilesetIndex = 0;
        this.transitionActive = false;
        this.mapName = "";
        this.mapNameTimer = 0;
        this.baseTrack = undefined;
        this.baseTrackVolume = 1.0;
        this.minibossName = "";
        this.finalbossName = "";
        // To-be-removed from the final version
        this.inProgressMessage = "";
        this.showInProgressMessage = false;
        this.inProgressMessageWidth = 0;
        this.inProgressMessageHeight = 0;
        this.worldDestructionStarted = false;
        this.worldDestructionTimer = 0;
        this.camera = new Camera(0, 0, event);
        this.dialogueBox = new TextBox(true, 30, 5);
        this.pause = new Pause(event, (event) => this.objects?.killPlayer(event), (event) => this.progress.save(), (event) => this.quitToMainMenu(event));
        this.hints = new HintRenderer();
        this.mapTransition = (mapName, spawnPos, pose, createPlayer, _event) => this.performMapTransition(mapName, spawnPos, pose, createPlayer, _event);
        this.cutscene = new Cutscene();
        this.shops = (new Array(2));
        for (let i = 0; i < 2; ++i) {
            this.shops[i] = constructShop((i + 1), event);
        }
        this.bossBattleConfirmationBox = new ConfirmationBox(event.localization?.getItem("yesno") ?? ["null", "null"], event.localization?.getItem("lick")?.[0] ?? "null", (event) => {
            // This will be overridden
        }, (event) => {
            this.bossBattleConfirmationBox.deactivate();
        });
        // TODO: Use the same box as above?
        this.finalBossBattleConfirmationBox = new ConfirmationBox(event.localization?.getItem("yesno") ?? ["null", "null"], event.localization?.getItem("touch")?.[0] ?? "null", (event) => {
            // This will be overridden
        }, (event) => {
            this.finalBossBattleConfirmationBox.deactivate();
        });
        this.destroyWorldCallback = () => this.initiateWorldDestruction();
    }
    initiateWorldDestruction() {
        this.worldDestructionStarted = true;
        this.worldDestructionTimer = 0;
    }
    triggerNPC(index, npcType, event) {
        this.dialogueBox.addText(event.localization?.getItem(`npc${index}`) ?? ["null"]);
        this.dialogueBox.activate(false, npcType);
    }
    setCutscene(id, event) {
        if (!this.progress.hasWatchedCutscene(id)) {
            event.audio.pauseMusic();
            event.transition.freeze();
            this.cutscene.activate(id, RGBA.invertUnsignedByte(event.transition.getColor()), event, (event) => {
                event.audio.resumeMusic();
                // Need to deactivate to get the proper frame to the
                // buffer for the wave effect.
                this.cutscene.deactivate();
                this.camera.update(event);
                this.stage.update(this.camera, event);
                if (event.transition.getEffectType() == 3 /* TransitionType.Waves */) {
                    event.cloneCanvasToBufferTexture(true);
                }
                event.transition.unfreeze();
            });
            this.progress.markCutsceneWatched(id);
        }
    }
    playSong(name, volume, event) {
        const theme = event.assets.getSample(name);
        if (theme === this.baseTrack && event.audio.isMusicPlaying()) {
            this.baseTrackVolume = volume;
            event.audio.resumeMusic(volume);
            return;
        }
        this.baseTrack = theme;
        event.audio.stopMusic();
        if (theme === undefined) {
            return;
        }
        event.audio.fadeInMusic(theme, volume, 1000);
        this.baseTrackVolume = volume;
    }
    performMapTransition(mapName, spawnPos, pose, createPlayer, event, save = true) {
        const baseMap = event.assets.getTilemap(mapName);
        if (baseMap === undefined) {
            throw new Error(`Required tilemap missing: ${mapName}`);
        }
        this.tilesetIndex = Number(baseMap.getProperty("tileset") ?? "0");
        const collisionMapName = `collisions_${this.tilesetIndex}`;
        const collisionMap = event.assets.getTilemap(collisionMapName);
        if (collisionMap === undefined) {
            throw new Error(`Required tilemap missing: ${collisionMapName}`);
        }
        this.progress.setAreaName(mapName);
        this.stage = new Stage(baseMap.getNumericProperty("background"), baseMap, collisionMap);
        // TODO: Maybe not recreate the whole object, but reset values etc. (Note: too late!)
        this.objects = new ObjectManager(this.progress, this.dialogueBox, this.hints, this.bossBattleConfirmationBox, this.finalBossBattleConfirmationBox, this.shops, this.stage, this.camera, Number(baseMap.getProperty("npctype") ?? 0), this.mapTransition, this.destroyWorldCallback, spawnPos, pose, createPlayer, event);
        this.objects.centerCamera(this.camera);
        this.limitCamera();
        this.stage.initializeBackground(this.camera);
        // Might help with portal transition?
        this.stage.update(this.camera, event);
        this.objects.initialCameraCheck(this.camera, event);
        if (save) {
            this.progress.save();
            if (spawnPos == 0) {
                // A lazy way to make sure that the animation is not triggered when 
                // loading the savefile was to put these inside if (save) check...
                const npcTriggered = Number(baseMap.getProperty("triggernpc") ?? -1);
                if (npcTriggered >= 0) {
                    const npcType = Number(baseMap.getProperty("npctype") ?? 0);
                    this.triggerNPC(npcTriggered, npcType, event);
                }
            }
        }
        this.hints.deactivate();
        // Start the background music
        const musicName = baseMap.getProperty("music");
        if (musicName !== undefined) {
            this.playSong(musicName, baseMap.getNumericProperty("musicvolume") ?? 0.50, event);
        }
        else {
            this.baseTrack = undefined;
            event.audio.stopMusic();
        }
        // Set cutscene
        const cutsceneIndex = baseMap.getProperty("cutscene");
        if (cutsceneIndex !== undefined) {
            const id = Number(cutsceneIndex);
            this.setCutscene(id, event);
        }
        // else {
        if (event.transition.getEffectType() == 3 /* TransitionType.Waves */) {
            event.cloneCanvasToBufferTexture(true);
        }
        // }
        // Set area name
        this.mapName = baseMap.getProperty("name") ?? "null";
        this.mapNameTimer = MAP_NAME_APPEAR_TIME;
        // Check if "in progress"
        this.showInProgressMessage = baseMap.getBooleanProperty("in_progress");
        // Needed in the case of resize in the title screen
        // TODO: Does not work properly...
        //this.camera.update(event);
        //this.limitCamera();
    }
    setInitialDialogue(event) {
        this.dialogueBox.addText(event.localization?.getItem("wakeup") ?? ["null"]);
        // this.dialogueBox.activate(false, 0);
    }
    activateInitialDialogue(event) {
        this.dialogueBox.activate(false, 1, (event) => {
            this.objects.initiateWakingUpAnimation(event);
        });
    }
    reset(event) {
        this.worldDestructionStarted = false;
        this.camera.shake(0, 0);
        // this.stage.toggleTopLayerRendering(true);
        this.stage.reset();
        this.progress.reset();
        this.objects.reset(this.progress, this.stage, this.camera, event);
        this.objects.centerCamera(this.camera);
        event.audio.fadeInMusic(this.baseTrack, this.baseTrackVolume, 1000);
    }
    quitToMainMenu(event) {
        try {
            this.progress.save();
        }
        catch (e) {
            console.error("Not-so-fatal error: Failed to save progress: " + e["message"]);
        }
        event.transition.activate(true, 2 /* TransitionType.Circle */, 1.0 / 30.0, event, (event) => {
            event.scenes.changeScene("title", event);
            // event.transition.activate(false, TransitionType.Circle, 1.0/60.0, event);
        });
    }
    startGameOverTransition(event) {
        event.transition.activate(true, 2 /* TransitionType.Circle */, 1.0 / 30.0, event, (event) => {
            this.reset(event);
            this.limitCamera();
            this.stage.initializeBackground(this.camera);
            event.transition.setCenter(this.objects.getRelativePlayerPosition(this.stage, this.camera));
            this.progress.save();
        }, new RGBA(0, 0, 0), this.objects.getRelativePlayerPosition(this.stage, this.camera));
    }
    updateWorldDestruction(event) {
        this.worldDestructionTimer += event.tick;
        if (this.worldDestructionTimer >= WORLD_DESTRUCTION_TIMER) {
            event.transition.activate(true, 1 /* TransitionType.Fade */, 1.0 / 30.0, event, (event) => {
                event.scenes.changeScene("ending", event);
            }, new RGBA(255, 255, 255));
            this.camera.shake(30, WORLD_DESTRUCTION_TIMER / 6);
            return;
        }
        const shakeAmount = Math.floor(this.worldDestructionTimer / 6);
        this.camera.shake(2, shakeAmount);
    }
    limitCamera() {
        this.camera.limit(0, this.stage.width * TILE_WIDTH, 0, this.stage.height * TILE_HEIGHT);
    }
    drawWorldDestruction(canvas) {
        const MAX_RADIUS = 288;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const t = this.worldDestructionTimer / WORLD_DESTRUCTION_TIMER;
        const radius = t * t * MAX_RADIUS;
        canvas.setColor();
        canvas.fillEllipse(cx, cy, radius * 2, radius * 2);
    }
    drawDialogueBox(canvas, assets) {
        if (this.transitionActive) {
            return;
        }
        const boxHeight = this.dialogueBox.getHeight() * 10;
        let dy = 0;
        if (this.objects.getRelativePlayerPosition(this.stage, this.camera).y > this.camera.height / 2 + boxHeight / 2) {
            dy = -canvas.height / 2 + boxHeight / 2 + 8;
        }
        else {
            dy = canvas.height / 2 - boxHeight / 2 - 10;
        }
        this.dialogueBox.draw(canvas, assets, 0, dy);
    }
    drawInProgressMessage(canvas, assets) {
        const POS_Y = 28;
        const bmpFontOutlines = assets.getBitmap("font_outlines");
        const dx = canvas.width / 2 - this.inProgressMessageWidth * 4;
        const dy = POS_Y;
        const dw = (this.inProgressMessageWidth + 1) * 8;
        const dh = (this.inProgressMessageHeight + 0.5) * 12;
        canvas.setColor(0, 0, 0, 0.50);
        canvas.fillRect(dx - 2, dy - 2, dw + 4, dh + 4);
        canvas.setColor(255, 255, 182);
        canvas.drawText(bmpFontOutlines, this.inProgressMessage, dx, dy, -8, -4);
        canvas.setColor();
        canvas.fillRect(dx - 3, dy - 3, dw + 6, 1);
        canvas.fillRect(dx - 3, dy + dh + 1, dw + 6, 1);
        canvas.fillRect(dx - 3, dy - 2, 1, dh + 3);
        canvas.fillRect(dx + dw + 2, dy - 2, 1, dh + 3);
    }
    init(param, event) {
        this.fileIndex = typeof (param) == "number" ? param : this.fileIndex;
        this.progress = new Progress(this.fileIndex);
        const fileLoaded = this.progress.loadGame(this.fileIndex);
        this.performMapTransition(this.progress.getAreaName(), 0, fileLoaded ? 0 /* Pose.None */ : 1 /* Pose.Sit */, !fileLoaded, event, !fileLoaded);
        event.transition.setCenter(this.objects.getRelativePlayerPosition(this.stage, this.camera));
        if (!fileLoaded) {
            event.transition.changeSpeed(1.0 / 90.0);
            this.setInitialDialogue(event);
        }
        this.initialDialogueActivated = fileLoaded;
        this.gameSaveMode = 0;
        this.gameSaveTimer = 0;
        this.minibossName = event.localization?.getItem("miniboss")?.[0] ?? "null";
        this.finalbossName = event.localization?.getItem("finalboss")?.[0] ?? "null";
        this.inProgressMessage = event.localization?.getItem("inprogress")?.[0] ?? "null";
        const lines = this.inProgressMessage.split("\n");
        this.inProgressMessageWidth = Math.max(...lines.map((s) => s.length));
        this.inProgressMessageHeight = lines.length;
    }
    update(event) {
        if (this.cutscene.isActive()) {
            this.cutscene.update(event);
            return;
        }
        if (this.worldDestructionStarted) {
            this.camera.update(event);
            if (event.transition.isActive()) {
                this.transitionActive = true;
                return;
            }
            this.updateWorldDestruction(event);
            return;
        }
        if (this.mapNameTimer > 0) {
            this.mapNameTimer -= event.tick;
        }
        this.transitionActive = event.transition.isActive();
        if (this.progress?.wasGameSaved()) {
            this.gameSaveMode = this.progress?.wasGameSavingSuccessful() ? 1 : 2;
            this.gameSaveTimer = GAME_SAVE_ANIMATION_TIME;
        }
        if (this.gameSaveTimer > 0) {
            this.gameSaveTimer -= event.tick;
            if (this.gameSaveTimer <= 0) {
                this.gameSaveMode = 0;
            }
        }
        if (this.pause.isActive() && !event.transition.isActive()) {
            this.pause.update(event);
            return;
        }
        if (!event.transition.isActive() ||
            event.transition.getEffectType() != 3 /* TransitionType.Waves */) {
            this.stage?.update(this.camera, event);
        }
        if (event.transition.isActive()) {
            this.objects?.initialCameraCheck(this.camera, event);
            this.objects?.animateNPCs(this.camera, event);
            return;
        }
        if (this.bossBattleConfirmationBox.isActive()) {
            this.bossBattleConfirmationBox.update(event);
            return;
        }
        if (this.finalBossBattleConfirmationBox.isActive()) {
            this.finalBossBattleConfirmationBox.update(event);
            return;
        }
        if (this.dialogueBox.isActive()) {
            this.mapNameTimer = 0;
            this.objects?.animateNPCs(this.camera, event);
            this.dialogueBox.update(event);
            return;
        }
        for (const s of this.shops) {
            if (s.isActive()) {
                s.update(this.progress, event);
                return;
            }
        }
        if (!this.initialDialogueActivated) {
            this.initialDialogueActivated = true;
            this.activateInitialDialogue(event);
            return;
        }
        if (event.input.getAction("pause") == 3 /* InputState.Pressed */) {
            event.audio.pauseMusic();
            this.pause.activate();
            event.audio.playSample(event.assets.getSample("pause"), 0.80);
            return;
        }
        this.objects?.update(this.camera, this.stage, this.hints, event);
        if (this.objects?.hasPlayerDied()) {
            this.startGameOverTransition(event);
        }
        this.progress?.update(event);
        this.camera.update(event);
        this.limitCamera();
    }
    redraw(canvas, assets, isCloningToBuffer) {
        canvas.moveTo();
        // canvas.clear(109, 182, 255);
        canvas.setColor();
        canvas.transform.setTarget(1 /* TransformTarget.Camera */);
        canvas.transform.view(canvas.width, canvas.height);
        canvas.transform.setTarget(0 /* TransformTarget.Model */);
        canvas.transform.loadIdentity();
        canvas.transform.apply();
        if (this.cutscene.isActive()) {
            return;
        }
        this.stage.drawBackground(canvas, assets, this.camera);
        if (this.worldDestructionStarted) {
            this.drawWorldDestruction(canvas);
        }
        this.camera.apply(canvas);
        this.stage?.draw(canvas, assets, this.tilesetIndex, this.camera);
        this.objects?.draw(canvas, assets);
        this.stage?.drawForeground(canvas, assets, this.camera, this.objects.getAbsolutePlayerPosition());
        canvas.transform.setTarget(0 /* TransformTarget.Model */);
        canvas.transform.loadIdentity();
        canvas.transform.apply();
        canvas.moveTo();
        for (const s of this.shops) {
            if (s.isActive()) {
                s.draw(canvas, assets, this.progress);
                return;
            }
        }
        if (!isCloningToBuffer &&
            (this.initialDialogueActivated && !this.dialogueBox.isActive())) { // ||
            // (this.dialogueBox.isActive() && this.transitionActive) ) {
            drawHUD(canvas, assets, this.progress);
            const miniBossHealth = this.objects?.getMinibossHealth();
            const finalBossHealth = this.objects?.getFinalBossHealth();
            if (miniBossHealth !== undefined) {
                drawBossHealthbar(canvas, assets, miniBossHealth, this.minibossName, 128);
            }
            if (finalBossHealth !== undefined) {
                drawBossHealthbar(canvas, assets, finalBossHealth, this.finalbossName, 160);
            }
        }
        this.pause.draw(canvas, assets);
        if (this.bossBattleConfirmationBox.isActive()) {
            this.bossBattleConfirmationBox.draw(canvas, assets);
        }
        if (this.finalBossBattleConfirmationBox.isActive()) {
            this.finalBossBattleConfirmationBox.draw(canvas, assets);
        }
        this.drawDialogueBox(canvas, assets);
        /*
                if (this.gameSaveTimer > 0) {
        
                    drawGameSavingIcon(canvas, assets, this.gameSaveTimer, this.gameSaveMode == 1);
                }
        */
        if (!this.pause.isActive() && !this.dialogueBox.isActive()) {
            this.hints.draw(canvas, assets);
            if (this.showInProgressMessage) {
                this.drawInProgressMessage(canvas, assets);
            }
        }
    }
    postDraw(canvas, assets) {
        canvas.moveTo();
        canvas.setColor();
        canvas.transform.setTarget(1 /* TransformTarget.Camera */);
        canvas.transform.view(canvas.width, canvas.height);
        canvas.transform.setTarget(0 /* TransformTarget.Model */);
        canvas.transform.loadIdentity();
        if (this.cutscene.isActive()) {
            this.cutscene.draw(canvas, assets);
            return;
        }
        // TODO: Split to own function
        if (!this.pause.isActive() && this.mapNameTimer > 0) {
            const bmpFontOutlines = assets.getBitmap("font_outlines");
            let alpha = 1.0;
            if (this.mapNameTimer <= MAP_NAME_FADE_TIME) {
                alpha = this.mapNameTimer / MAP_NAME_FADE_TIME;
            }
            canvas.setAlpha(alpha);
            canvas.drawText(bmpFontOutlines, this.mapName, canvas.width / 2, canvas.height / 2 - 8, -8, 0, 2 /* Align.Center */);
            canvas.setAlpha();
        }
        canvas.setColor();
        if (this.gameSaveTimer > 0) {
            drawGameSavingIcon(canvas, assets, this.gameSaveTimer, this.gameSaveMode == 1);
        }
    }
    dispose() {
        return undefined;
    }
}
