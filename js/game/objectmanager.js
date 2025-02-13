import { Player } from "./player.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { ProjectileGenerator } from "./projectilegenerator.js";
import { CollectableGenerator } from "./collectablegenerator.js";
import { Breakable } from "./breakable.js";
import { VisibleObjectBuffer } from "./visibleobjectbuffer.js";
import { SplinterGenerator } from "./splintergenerator.js";
import { getEnemyByID } from "./enemies/index.js";
import { ObjectGenerator } from "./objectgenerator.js";
import { FlyingText } from "./flyingtext.js";
import { AnimatedParticle } from "./animatedparticle.js";
import { Vector } from "../math/vector.js";
import { clamp } from "../math/utility.js";
import { NPC } from "./interactables/npc.js";
import { Checkpoint } from "./interactables/checkpoint.js";
import { Chest } from "./interactables/chest.js";
import { Beam } from "./interactables/beam.js";
import { Portal } from "./interactables/portal.js";
import { HintTrigger } from "./interactables/hinttrigger.js";
import { Door } from "./interactables/door.js";
import { Shopkeeper } from "./interactables/shopkeeper.js";
import { Platform } from "./platform.js";
import { Spring } from "./interactables/spring.js";
import { Lever } from "./interactables/lever.js";
import { Switch } from "./interactables/switch.js";
import { EyeTrigger } from "./interactables/eyetrigger.js";
import { Eye } from "./enemies/eye.js";
import { Ghost } from "./enemies/ghost.js";
import { RGBA } from "../math/rgba.js";
import { Fan } from "./interactables/fan.js";
import { Anvil } from "./interactables/anvil.js";
import { FinalBossTrigger } from "./interactables/finalbosstrigger.js";
import { FinalBoss } from "./enemies/finalboss.js";
export class ObjectManager {
    constructor(progress, dialogueBox, hints, bossBattleConfirmationBox, finalBossBattleConfirmationBox, shops, stage, camera, npcType, mapTransition, destroyWorldCallback, spawnId, pose, createNewPlayer, event) {
        this.miniboss = undefined;
        this.finalboss = undefined;
        this.npcType = 0;
        this.spawnId = 0;
        this.getAbsolutePlayerPosition = () => this.player.getPosition();
        this.hasPlayerDied = () => !this.player.doesExist();
        this.flyingText = new ObjectGenerator(FlyingText);
        this.projectiles = new ProjectileGenerator();
        this.splinters = new SplinterGenerator();
        this.animatedParticles = new ObjectGenerator(AnimatedParticle);
        this.collectables = new CollectableGenerator(this.flyingText);
        this.breakables = new Array();
        this.visibleBreakables = new VisibleObjectBuffer();
        this.enemies = new Array();
        this.visibleEnemies = new VisibleObjectBuffer();
        this.platforms = new Array();
        this.visiblePlatforms = new VisibleObjectBuffer();
        this.interactables = new Array();
        this.player = new Player(0, 0, this.projectiles, this.animatedParticles, this.flyingText, progress, mapTransition, event);
        this.dialogueBox = dialogueBox;
        this.bossBattleConfirmationBox = bossBattleConfirmationBox;
        this.finalBossBattleConfirmationBox = finalBossBattleConfirmationBox;
        this.hints = hints;
        this.mapTransition = mapTransition;
        this.shops = shops;
        this.destroyWorldCallback = destroyWorldCallback;
        this.npcType = npcType;
        this.spawnId = spawnId;
        this.createObjects(stage, camera, !createNewPlayer, event);
        this.initialCameraCheck(camera, event);
        if (createNewPlayer) {
            progress.setCheckpointPosition(this.player.getPosition());
            this.player.setPose(pose);
        }
        else {
            const checkpoint = progress.getCheckpointPosition();
            this.player.setPosition(checkpoint.x, checkpoint.y, true);
        }
        // Open chests etc.
        for (const o of this.interactables) {
            o.playerCollision(this.player, event, true);
        }
    }
    createObjects(stage, camera, resetPlayer = false, event) {
        const bmpNPC = event.assets.getBitmap("npc");
        const bmpCheckpoint = event.assets.getBitmap("checkpoint");
        const bmpChest = event.assets.getBitmap("chest");
        const bmpPortal = event.assets.getBitmap("portal");
        const bmpShopkeeper = event.assets.getBitmap("shopkeeper");
        const bmpSpring = event.assets.getBitmap("spring");
        const bmpLever = event.assets.getBitmap("lever");
        const bmpSwitch = event.assets.getBitmap("switch");
        const bmpDoors = event.assets.getBitmap("locked_doors");
        const bmpFan = event.assets.getBitmap("fan");
        stage.iterateObjectLayer((x, y, objID, upperID) => {
            const dx = (x + 0.5) * TILE_WIDTH;
            const dy = (y + 0.5) * TILE_HEIGHT;
            const id = Math.max(0, upperID - 128);
            switch (objID) {
                // Door
                case 12:
                    this.interactables.push(new Door(dx, dy, id - 1, stage.baseMap.getProperty(`door${id - 1}`), this.mapTransition, this.dialogueBox));
                // Fallthrough
                // Player
                case 1:
                    if (!resetPlayer && id - 1 == this.spawnId) {
                        this.player.setPosition(dx, dy, resetPlayer);
                    }
                    break;
                // Crate & rubble
                case 2:
                case 14:
                    this.breakables.push(new Breakable(dx, dy, objID == 2 ? 1 /* BreakableType.Crate */ : 2 /* BreakableType.Rubble */, this.splinters, this.collectables));
                    break;
                // NPC:
                case 3:
                    this.interactables.push(new NPC(dx, dy, id, this.npcType, bmpNPC, this.dialogueBox));
                    break;
                // Checkpoint
                case 4:
                    this.interactables.push(new Checkpoint(dx, dy, bmpCheckpoint));
                    break;
                // Chests
                case 5:
                case 6:
                case 7:
                case 8:
                    this.interactables.push(new Chest(dx, dy, id, (objID - 4), bmpChest, this.dialogueBox, this.hints));
                    break;
                // Beam
                case 9:
                    this.interactables.push(new Beam(dx, dy, id));
                    break;
                // Portal
                case 89:
                case 77:
                case 10:
                    this.interactables.push(new Portal(dx, dy, bmpPortal, this.mapTransition, this.dialogueBox, id - 1, stage.baseMap.getProperty(`portal${id - 1}`), objID == 77, objID == 89));
                    if (!resetPlayer && id - 1 == this.spawnId) {
                        this.player.setPosition(dx, dy, resetPlayer);
                    }
                    break;
                // Hint trigger
                case 11:
                    this.interactables.push(new HintTrigger(dx, dy, id - 1, this.hints));
                    break;
                // Shopkeeper
                case 13:
                    this.interactables.push(new Shopkeeper(dx, dy, this.shops[id - 1], bmpShopkeeper, id - 1));
                    break;
                // Moving platforms
                case 15:
                case 16:
                    this.platforms.push(new Platform(dx, dy, 0 /* PlatformType.VerticallyMoving */ + (objID - 15)));
                    break;
                // Spring mushroom
                case 65:
                    this.interactables.push(new Spring(dx, dy, bmpSpring));
                    break;
                // Lever
                case 66:
                    this.interactables.push(new Lever(dx, dy, id - 1, bmpLever, this.dialogueBox));
                    break;
                // Switches
                case 67:
                case 68:
                case 69:
                case 70:
                case 71:
                case 72:
                    this.interactables.push(new Switch(dx, dy, stage, (objID - 67) % 3, objID <= 69, bmpSwitch));
                    break;
                // Swing
                case 73:
                    this.platforms.push(new Platform(dx, dy, 3 /* PlatformType.Swing */));
                    break;
                // Locked doors
                case 74:
                case 75:
                case 76:
                case 80:
                    this.interactables.push(new Door(dx, dy, id - 1, stage.baseMap.getProperty(`door${id - 1}`), this.mapTransition, this.dialogueBox, objID != 80 ? objID - 74 : undefined, objID == 80, bmpDoors));
                    if (!resetPlayer && id - 1 == this.spawnId) {
                        this.player.setPosition(dx, dy, resetPlayer);
                    }
                    break;
                // Cloud
                case 78:
                    this.platforms.push(new Platform(dx, dy, 4 /* PlatformType.Cloud */));
                    break;
                // Eye trigger
                case 79:
                    this.interactables.push(new EyeTrigger(dx + 8, dy, this.bossBattleConfirmationBox, () => this.initiateMiniBoss(stage, camera, event)));
                    break;
                // Fans
                case 81:
                case 82:
                case 83:
                case 84:
                    this.interactables.push(new Fan(dx, dy, bmpFan, objID - 81));
                    break;
                // Platinum door
                case 85:
                    this.interactables.push(new Door(dx, dy, id - 1, stage.baseMap.getProperty("door3"), this.mapTransition, this.dialogueBox, 4, false, bmpDoors));
                    if (!resetPlayer && id - 1 == this.spawnId) {
                        this.player.setPosition(dx, dy, resetPlayer);
                    }
                    break;
                // Bumper "platform"
                case 86:
                    this.platforms.push(new Platform(dx, dy, 2 /* PlatformType.Bumper */));
                    break;
                // Anvil
                case 87:
                    this.interactables.push(new Anvil(dx, dy, this.dialogueBox, this.hints));
                    break;
                // Scare face blocks
                case 88:
                    this.breakables.push(new Breakable(dx, dy, 3 /* BreakableType.ScaryFace */, this.splinters, this.collectables));
                    break;
                // Final boss trigger
                case 90:
                    this.interactables.push(new FinalBossTrigger(dx + 8, dy, this.dialogueBox, this.finalBossBattleConfirmationBox, () => this.initiateFinalBoss(stage, camera, event)));
                    break;
                default:
                    // Enemies
                    if (objID >= 17 && objID <= 64) {
                        const o = (new (getEnemyByID(objID - 17)).prototype.constructor(dx, dy));
                        this.enemies.push(o);
                        o.passGenerators(this.flyingText, this.collectables, this.projectiles);
                        o.passShakeEvent((shakeTime, shakeAmount) => camera.shake(shakeTime, shakeAmount));
                    }
                    break;
            }
        });
    }
    updatePlayer(camera, stage, event) {
        this.player.update(event);
        this.player.targetCamera(camera);
        stage.objectCollision(this.player, event);
    }
    updateEnemies(camera, stage, event) {
        for (const o of this.enemies) {
            o.cameraCheck(camera, event);
        }
        let somethingDied = false;
        this.visibleEnemies.refresh(this.enemies);
        this.visibleEnemies.iterateThroughVisibleObjects((o1, i) => {
            o1.update(event);
            stage.objectCollision(o1, event);
            this.visibleEnemies.iterateThroughVisibleObjects((o2) => {
                o1.enemyCollision(o2, event);
            }, i + 1);
            o1.playerCollision(this.player, event);
            if (!o1.doesExist()) {
                somethingDied = true;
                return;
            }
            this.projectiles.enemyCollision(o1, event);
        });
        if (somethingDied) {
            for (let i = 0; i < this.enemies.length; ++i) {
                if (!this.enemies[i].doesExist()) {
                    this.enemies.splice(i, 1);
                }
            }
        }
        /*
        if (this.miniboss !== undefined && !this.miniboss.hasReachedInitialPos()) {

            camera.followPoint(this.miniboss.getPosition());
        }
        */
    }
    updateBreakables(camera, stage, event) {
        for (const o of this.breakables) {
            o.cameraCheck(camera, event);
        }
        let somethingBroken = false;
        this.visibleBreakables.refresh(this.breakables);
        this.visibleBreakables.iterateThroughVisibleObjects((o1, i) => {
            o1.update(event);
            stage.objectCollision(o1, event);
            this.visibleBreakables.iterateThroughVisibleObjects((o2) => {
                o1.objectCollision(o2, event, true);
            }, i + 1);
            o1.playerCollision(this.player, event);
            o1.objectCollision(this.player, event, false, false, true);
            if (!o1.doesExist()) {
                somethingBroken = true;
                return;
            }
            this.projectiles.breakableCollision(o1, event);
            this.splinters.breakableCollision(o1, event);
            this.collectables.breakableCollision(o1, event);
            this.visibleEnemies.iterateThroughVisibleObjects((e) => {
                if (!e.doesTakeCollisions()) {
                    return;
                }
                o1.objectCollision(e, event, false);
            });
        });
        if (somethingBroken) {
            for (let i = 0; i < this.breakables.length; ++i) {
                if (!this.breakables[i].doesExist()) {
                    this.breakables.splice(i, 1);
                }
            }
        }
    }
    updateInteractables(camera, event, takePlayerEvent = true) {
        for (const o of this.interactables) {
            o.cameraCheck(camera, event);
            o.update(event);
            if (takePlayerEvent) {
                o.playerCollision(this.player, event);
            }
        }
    }
    updatePlatforms(camera, event) {
        for (const o of this.platforms) {
            o.cameraCheck(camera, event);
        }
        this.visiblePlatforms.refresh(this.platforms);
        this.visiblePlatforms.iterateThroughVisibleObjects((p, i) => {
            p.update(event);
            p.objectCollision(this.player, event);
            this.visibleEnemies.iterateThroughVisibleObjects((e) => {
                if (!e.doesTakeCollisions()) {
                    return;
                }
                p.objectCollision(e, event);
            });
        });
    }
    update(camera, stage, hintRenderer, event) {
        if (this.player.isWaiting()) {
            this.player.update(event);
            this.player.targetCamera(camera);
            this.animateNPCs(camera, event);
            return;
        }
        this.updateEnemies(camera, stage, event);
        this.updateBreakables(camera, stage, event);
        this.updatePlayer(camera, stage, event);
        this.updateInteractables(camera, event);
        this.updatePlatforms(camera, event);
        this.projectiles.update(event, camera, stage);
        this.projectiles.playerCollision(this.player, event);
        this.animatedParticles.update(event, camera);
        this.splinters.update(event, camera, stage);
        this.flyingText.update(event, camera);
        this.collectables.update(event, camera, stage);
        this.collectables.playerCollision(this.player, event);
        hintRenderer.update(this.player, event);
    }
    animateNPCs(camera, event) {
        this.updateInteractables(camera, event, false);
    }
    initialCameraCheck(camera, event) {
        for (const o of this.breakables) {
            o.cameraCheck(camera, event);
        }
        for (const o of this.enemies) {
            o.cameraCheck(camera, event);
        }
        for (const o of this.interactables) {
            o.cameraCheck(camera, event);
        }
        for (const o of this.platforms) {
            o.cameraCheck(camera, event);
        }
    }
    draw(canvas, assets) {
        const bmpPlatforms = assets.getBitmap("platforms");
        for (const o of this.platforms) {
            o.draw(canvas, assets, bmpPlatforms);
        }
        for (const o of this.interactables) {
            o.draw(canvas, assets);
        }
        const bmpBreakable = assets.getBitmap("breakable");
        for (const o of this.breakables) {
            o.draw(canvas, undefined, bmpBreakable);
        }
        this.animatedParticles.draw(canvas, undefined, assets.getBitmap("particles_1"));
        this.splinters.draw(canvas, assets);
        const bmpEnemies = assets.getBitmap("enemies");
        for (const o of this.enemies) {
            o.draw(canvas, assets, bmpEnemies);
        }
        this.collectables.draw(canvas, assets);
        this.player.draw(canvas, assets);
        this.projectiles.draw(canvas, assets);
        for (const o of this.interactables) {
            o.postDraw?.(canvas, assets);
        }
        this.player.postDraw(canvas, assets);
        this.finalboss?.postDraw(canvas, assets);
        this.flyingText.draw(canvas, undefined, assets.getBitmap("font_tiny"));
    }
    centerCamera(camera) {
        camera.forceCenter(this.player.getPosition());
    }
    getRelativePlayerPosition(stage, camera) {
        const v = new Vector();
        const ppos = this.player.getPosition();
        const camPos = camera.getCorner();
        v.x = Math.max(0, clamp(ppos.x, 0, stage.width * TILE_WIDTH - 1) - camPos.x) % camera.width;
        v.y = Math.max(0, clamp(ppos.y, 0, stage.height * TILE_HEIGHT - 1) - camPos.y) % camera.height;
        return v;
    }
    reset(progress, stage, camera, event) {
        this.flyingText.flush();
        this.projectiles.flush();
        this.splinters.clear();
        this.animatedParticles.flush();
        this.collectables.clear();
        this.breakables.length = 0;
        this.visibleBreakables.clear();
        this.enemies.length = 0;
        this.visibleEnemies.clear();
        this.platforms.length = 0;
        this.visiblePlatforms.clear();
        this.interactables.length = 0;
        this.createObjects(stage, camera, true, event);
        const checkpoint = progress.getCheckpointPosition();
        this.player.setPosition(checkpoint.x, checkpoint.y, true);
        this.centerCamera(camera);
        this.initialCameraCheck(camera, event);
        for (const o of this.interactables) {
            o.playerCollision(this.player, event, true);
        }
        this.miniboss = undefined;
        this.finalboss = undefined;
        // For debugging, if things go wrong
        // this.player.setPosition(128, 64);
    }
    killPlayer(event) {
        this.player.instantKill(event);
    }
    initiateWakingUpAnimation(event) {
        const WAIT_TIME = 90;
        this.player.startWaiting(WAIT_TIME, 2 /* WaitType.WakingUp */, undefined, (event) => {
            this.dialogueBox.addText(event.localization?.getItem("npc0") ?? ["null"]);
            this.dialogueBox.activate(false, 1);
            const keyboardHint = event.localization?.getItem("hints")?.[0] ?? "null";
            const gamepadHint = event.localization?.getItem("hints_gamepad")?.[0];
            this.hints.activate(this.player.getPosition(), keyboardHint, gamepadHint);
        });
    }
    setPlayerPose(pose) {
        this.player.setPose(pose);
    }
    initiateMiniBoss(stage, camera, event) {
        const MUSIC_VOL = 0.40;
        const spawnGhost = (dir) => {
            const minY = 32 + 12;
            const maxY = minY + (stage.height - 4) * TILE_HEIGHT - 12;
            const dx = dir > 0 ? -12 : stage.width * TILE_WIDTH + 12;
            const dy = minY + Math.random() * (maxY - minY);
            const o = new Ghost(dx, dy, dir, stage.width * TILE_WIDTH, 0);
            o.passGenerators(this.flyingText, this.collectables, this.projectiles);
            this.enemies.push(o);
        };
        const deathEvent = (event) => {
            const spawnIndex = stage.baseMap.getNumericProperty("boss_defeat_pos");
            const mapName = stage.baseMap.getProperty("boss_defeat_map");
            this.player.stats.markMinibossDefeated();
            event.transition.activate(true, 1 /* TransitionType.Fade */, 1.0 / 60.0, event, (event) => {
                this.mapTransition(mapName, spawnIndex, 1 /* Pose.Sit */, true, event, true);
            }, new RGBA(255, 255, 255));
        };
        const triggerDeathEvent = (event) => {
            for (const e of this.enemies) {
                if (e !== this.miniboss) {
                    e.softKill();
                }
            }
        };
        stage.toggleTopLayerRendering(false);
        stage.changeBackground(5 /* BackgroundType.StarField */);
        this.interactables.length = 0;
        this.player.startHarmlessKnockback(60);
        const playerPos = this.player.getPosition();
        this.miniboss = new Eye(playerPos.x, playerPos.y - 24, spawnGhost, deathEvent, triggerDeathEvent);
        this.enemies.push(this.miniboss);
        this.miniboss.passGenerators(this.flyingText, this.collectables, this.projectiles);
        this.miniboss.passShakeEvent((shakeTime, shakeAmount) => camera.shake(shakeTime, shakeAmount));
        event.audio.playSample(event.assets.getSample("thwomp"), 0.50);
        event.audio.fadeInMusic(event.assets.getSample("miniboss"), MUSIC_VOL, 1000);
        // Create platforms
        for (let i = 0; i < 2; ++i) {
            this.platforms.push(new Platform(playerPos.x, 120, 5 /* PlatformType.RectangularSwing */, i));
        }
        camera.shake(60, 4);
    }
    initiateFinalBoss(stage, camera, event) {
        const MUSIC_VOL = 0.30;
        const spawnGhost = (dir) => {
            const minY = TILE_HEIGHT * 10;
            const maxY = (stage.height - 4) * TILE_HEIGHT;
            const dx = dir > 0 ? -12 : stage.width * TILE_WIDTH + 12;
            const dy = minY + Math.random() * (maxY - minY);
            const o = new Ghost(dx, dy, dir, stage.width * TILE_WIDTH, 1);
            o.passGenerators(this.flyingText, this.collectables, this.projectiles);
            this.enemies.push(o);
        };
        const deathEvent = (event) => {
            event.audio.playSample(event.assets.getSample("destroy"), 0.50);
            this.destroyWorldCallback();
        };
        const triggerDeathEvent = (event) => {
            for (const e of this.enemies) {
                if (e !== this.finalboss) {
                    e.softKill();
                }
            }
        };
        // this.interactables.length = 0;
        this.player.startHarmlessKnockback(60);
        const playerPos = this.player.getPosition();
        this.finalboss = new FinalBoss(playerPos.x, playerPos.y - 24, stage, deathEvent, triggerDeathEvent, spawnGhost);
        this.enemies.push(this.finalboss);
        this.finalboss.passGenerators(this.flyingText, this.collectables, this.projectiles);
        this.finalboss.passShakeEvent((shakeTime, shakeAmount) => camera.shake(shakeTime, shakeAmount));
        event.audio.playSample(event.assets.getSample("thwomp"), 0.50);
        event.audio.fadeInMusic(event.assets.getSample("finalboss"), MUSIC_VOL, 1000);
        // Platforms
        const platformOffsetX = TILE_WIDTH * 7.5;
        for (let i = 0; i < 2; ++i) {
            this.platforms.push(new Platform(playerPos.x - (-1 + 2 * i) * platformOffsetX, playerPos.y - 56, 6 /* PlatformType.StaticUnmoving */));
        }
        this.platforms.push(new Platform(playerPos.x, playerPos.y - 96, 6 /* PlatformType.StaticUnmoving */));
        camera.shake(60, 4);
        stage.enableFinalBossArena();
    }
    getMinibossHealth() {
        return this.miniboss?.getHealthbarHealth();
    }
    getFinalBossHealth() {
        return this.finalboss?.getHealthbarHealth();
    }
}
