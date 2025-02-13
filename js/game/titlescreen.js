import { Vector } from "../math/vector.js";
import { drawUIBox } from "../ui/box.js";
import { ConfirmationBox } from "../ui/confirmationbox.js";
import { Menu } from "../ui/menu.js";
import { MenuButton } from "../ui/menubutton.js";
import { TextBox } from "../ui/textbox.js";
import { Background } from "./background.js";
import { Camera } from "./camera.js";
import { LOCAL_STORAGE_KEY } from "./progress.js";
import { Settings } from "./settings.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
const MUSIC_VOLUME = 0.50;
const CORNER_TILEMAP = [
    -1, 94, 95, -1,
    -1, 110, 111, 54,
    0, 1, 1, 1,
    16, 17, 17, 17,
];
const CORNER_TILEMAP_WIDTH = 4;
const CORNER_TILEMAP_HEIGHT = 4;
const SAVE_INFO_APPEAR_TIME = 30;
const APPEAR_TIME = 45;
export class TitleScreen {
    constructor(event) {
        this.clearDataIndex = 0;
        this.activeFileIndex = 0;
        this.activeMenu = undefined;
        this.activeMenuOffset = 1;
        this.logoWave = 0;
        this.enterPressed = false;
        this.enterTimer = 1.0;
        this.enterText = "null";
        this.showSaveInfo = false;
        this.saveInfoText = undefined;
        this.saveInfoAppearTimer = 0;
        this.saveInfoAppearPhase = 0;
        this.appearTimer = APPEAR_TIME;
        this.disabledButtons = (new Array(3)).fill(false);
        const text = event.localization?.getItem("titlescreen") ?? [];
        this.settings = new Settings(event, (event) => {
            this.activeMenu = this.menu;
            this.activeMenuOffset = 1;
        });
        this.menu = new Menu(this.constructInitialButtons(text), true);
        const emptyFileString = "--/--/----";
        // TODO: Create button in for loop to avoid repeating code
        this.fileMenu = new Menu([
            new MenuButton(emptyFileString, (event) => {
                this.goToGame(0, event);
            }),
            new MenuButton(emptyFileString, (event) => {
                this.goToGame(1, event);
            }),
            new MenuButton(emptyFileString, (event) => {
                this.goToGame(2, event);
            }),
            new MenuButton((event.localization?.getItem("back") ?? ["null"])[0], (event) => {
                this.fileMenu.deactivate();
                this.activeMenu = this.menu;
                this.activeMenuOffset = 1;
            })
        ]);
        // TODO: Repeating code, replace with a common method
        // that generates both of this menus
        this.clearDataMenu = new Menu([
            new MenuButton(emptyFileString, (event) => {
                this.toggleClearDataBox(0);
            }),
            new MenuButton(emptyFileString, (event) => {
                this.toggleClearDataBox(1);
            }),
            new MenuButton(emptyFileString, (event) => {
                this.toggleClearDataBox(2);
            }),
            new MenuButton((event.localization?.getItem("back") ?? ["null"])[0], (event) => {
                this.clearDataMenu.deactivate();
                this.activeMenu = this.menu;
                this.activeMenuOffset = 1;
            })
        ]);
        this.dataClearedMessage = new TextBox();
        this.confirmClearDataMenu = new ConfirmationBox(event.localization?.getItem("yesno") ?? ["null", "null"], (event.localization?.getItem("clear_data") ?? ["null"])[0], (event) => {
            this.clearData();
            this.confirmClearDataMenu.deactivate();
            this.dataClearedMessage.addText(event.localization?.getItem("data_cleared") ?? ["null"]);
            this.dataClearedMessage.activate(true, null, (event) => {
                this.activeMenu = this.clearDataMenu;
                this.activeMenuOffset = 1;
            });
            this.activeMenu = this.dataClearedMessage;
            this.activeMenuOffset = 0;
            this.setFileMenuButtonNames(this.clearDataMenu, true);
        }, (event) => {
            this.confirmClearDataMenu.deactivate();
            this.activeMenu = this.clearDataMenu;
            this.activeMenuOffset = 1;
        });
        this.background = new Background(event.screenHeight, 0 /* BackgroundType.Graveyard */);
        this.dummyCamera = new Camera(0, -256, event);
    }
    constructInitialButtons(text) {
        const buttons = [
            new MenuButton(text[0] ?? "null", (event) => {
                this.setFileMenuButtonNames(this.fileMenu);
                let cursorPos = 0;
                for (let i = 0; i < this.disabledButtons.length; ++i) {
                    if (!this.disabledButtons[i]) {
                        cursorPos = i;
                        break;
                    }
                }
                this.fileMenu.activate(cursorPos);
                this.activeMenu = this.fileMenu;
                this.activeMenuOffset = 1;
            }),
            new MenuButton(text[1] ?? "null", (event) => {
                this.setFileMenuButtonNames(this.clearDataMenu, true);
                this.clearDataMenu.activate(3);
                this.activeMenu = this.clearDataMenu;
                this.activeMenuOffset = 1;
            }),
            new MenuButton(text[2] ?? "null", (event) => {
                this.settings.activate(event);
                this.activeMenu = this.settings;
                this.activeMenuOffset = 1;
            }),
        ];
        // Only in nw.js
        if (window["nw"] !== undefined) {
            buttons.push(new MenuButton(text[3] ?? "null", (event) => {
                event.transition.activate(true, 2 /* TransitionType.Circle */, 1.0 / 20.0, event, (event) => {
                    this.settings.save(event);
                    window["nw"]?.["App"]?.["quit"]?.();
                });
            }));
        }
        return buttons;
    }
    setFileMenuButtonNames(menu, disableNonExisting = false) {
        for (let i = 0; i < 3; ++i) {
            this.disabledButtons[i] = true;
            let str = "--/--/----";
            try {
                const saveFile = window["localStorage"]["getItem"](LOCAL_STORAGE_KEY + String(i));
                if (saveFile !== null) {
                    const json = JSON.parse(saveFile) ?? {};
                    str = json["date"] ?? str;
                    this.disabledButtons[i] = false;
                }
                if (disableNonExisting) {
                    menu.toggleDeactivation(i, saveFile === null);
                }
            }
            catch (e) {
                console.error("Not-so-fatal error: failed to access the save files: " + e["message"]);
            }
            menu.changeButtonText(i, str);
        }
    }
    clearData() {
        try {
            window["localStorage"]["removeItem"](LOCAL_STORAGE_KEY + String(this.clearDataIndex));
        }
        catch (e) {
            console.error("Not so fatal error: failed to clear save data: " + e["message"]);
        }
    }
    toggleClearDataBox(file) {
        this.clearDataIndex = file;
        this.confirmClearDataMenu.activate(1);
        this.activeMenu = this.confirmClearDataMenu;
        this.activeMenuOffset = 0;
    }
    goToGame(file, event) {
        this.activeFileIndex = file;
        event.audio.stopMusic();
        this.menu.deactivate();
        const newGame = this.disabledButtons[file];
        event.transition.activate(true, newGame ? 1 /* TransitionType.Fade */ : 2 /* TransitionType.Circle */, 1.0 / 30.0, event, (event) => {
            if (newGame) {
                event.transition.deactivate();
                this.toggleSaveFileInfo();
                return;
            }
            event.scenes.changeScene("game", event);
        });
    }
    toggleSaveFileInfo() {
        this.saveInfoAppearPhase = 0;
        this.saveInfoAppearTimer = 0;
        this.showSaveInfo = true;
    }
    updateSaveInfo(event) {
        if (this.saveInfoAppearPhase != 1) {
            this.saveInfoAppearTimer += event.tick;
            if (this.saveInfoAppearTimer >= SAVE_INFO_APPEAR_TIME) {
                if (this.saveInfoAppearPhase == 0) {
                    this.saveInfoAppearPhase = 1;
                }
                else {
                    event.transition.activate(false, 2 /* TransitionType.Circle */, 1.0 / 30.0, event);
                    event.scenes.changeScene("game", event);
                }
            }
            return;
        }
        if (event.input.isAnyPressed()) {
            event.audio.playSample(event.assets.getSample("select"), 0.40);
            this.saveInfoAppearPhase = 2;
            this.saveInfoAppearTimer = 0.0;
        }
    }
    drawCornerTilemap(canvas, assets) {
        const PLAYER_X = -6;
        const PLAYER_Y = 13;
        const APPEAR_OFFSET = 64;
        const bmpTileset1 = assets.getBitmap("tileset_1");
        const bmpPlayer = assets.getBitmap("player");
        const bmpWeapons = assets.getBitmap("weapons");
        const shifty = (this.appearTimer / APPEAR_TIME) * APPEAR_OFFSET;
        canvas.setColor();
        canvas.moveTo(canvas.width - CORNER_TILEMAP_WIDTH * TILE_WIDTH, canvas.height - CORNER_TILEMAP_HEIGHT * TILE_HEIGHT + shifty);
        for (let y = 0; y < CORNER_TILEMAP_HEIGHT; ++y) {
            for (let x = 0; x < CORNER_TILEMAP_WIDTH; ++x) {
                const tile = CORNER_TILEMAP[y * CORNER_TILEMAP_WIDTH + x];
                if (tile < 0) {
                    continue;
                }
                const sx = tile % 16;
                const sy = Math.floor(tile / 16);
                canvas.drawBitmap(bmpTileset1, 0 /* Flip.None */, x * TILE_WIDTH, y * TILE_HEIGHT, sx * TILE_WIDTH, sy * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
            }
        }
        // Sword
        canvas.drawBitmap(bmpWeapons, 1 /* Flip.Horizontal */, PLAYER_X - 7, PLAYER_Y + 14, 139, 18, 16, 16);
        // Player
        canvas.drawBitmap(bmpPlayer, 0 /* Flip.None */, PLAYER_X, PLAYER_Y, 192, 72, 24, 24);
        canvas.moveTo();
    }
    drawSaveInfo(canvas, assets) {
        const BOX_WIDTH = 224;
        const BOX_HEIGHT = 160;
        const EDGE_OFFSET = 8;
        canvas.clear(0, 0, 0);
        let t = 0.0;
        if (this.saveInfoAppearPhase != 1) {
            t = this.saveInfoAppearTimer / SAVE_INFO_APPEAR_TIME;
            ;
        }
        const yoff = this.saveInfoAppearPhase == 0 ? (1.0 - t) * canvas.height : -t * canvas.height;
        const dy = canvas.height / 2 - BOX_HEIGHT / 2 + yoff;
        drawUIBox(canvas, canvas.width / 2 - BOX_WIDTH / 2, dy, BOX_WIDTH, BOX_HEIGHT);
        if (this.saveInfoText === undefined) {
            return;
        }
        const bmpFont = assets.getBitmap("font");
        const bmpHUD = assets.getBitmap("hud");
        const dx = canvas.width / 2 - BOX_WIDTH / 2;
        canvas.drawText(bmpFont, this.saveInfoText[0], dx + EDGE_OFFSET, dy + EDGE_OFFSET, -1, 2);
        // Save success icon
        const frame = Math.floor(this.enterTimer * 8);
        canvas.drawBitmap(bmpHUD, 0 /* Flip.None */, canvas.width / 2 - 16, dy + 32, frame * 16, 16, 16, 16);
        canvas.drawText(bmpFont, this.saveInfoText[1], dx + EDGE_OFFSET, dy + EDGE_OFFSET + 44, -1, 2);
        // Save failure icon
        canvas.drawBitmap(bmpHUD, 0 /* Flip.None */, canvas.width / 2 - 16, dy + 88, 52, 0, 8, 16);
        canvas.drawBitmap(bmpHUD, 0 /* Flip.None */, canvas.width / 2 - 8, dy + 88, 0, 16, 16, 16);
        canvas.drawText(bmpFont, this.saveInfoText[2], dx + EDGE_OFFSET, dy + EDGE_OFFSET + 102, -1, 2);
        canvas.drawText(bmpFont, this.saveInfoText[3], dx + EDGE_OFFSET, dy + EDGE_OFFSET + 128, -1, 2);
    }
    drawLogo(canvas, bmp) {
        const LOGO_YOFF = 16;
        const APPEAR_OFFSET = 96;
        const posy = LOGO_YOFF - APPEAR_OFFSET * (this.appearTimer / APPEAR_TIME);
        canvas.drawHorizontallyWavingBitmap(bmp, 2, 48, this.logoWave, 0 /* Flip.None */, canvas.width / 2 - (bmp?.width ?? 0) / 2, posy);
    }
    init(param, event) {
        if (typeof (param) === "number") {
            this.background.setCloudPosition(param);
        }
        this.menu.activate(0);
        this.activeMenu = this.menu;
        this.activeMenuOffset = 1;
        event.audio.fadeInMusic(event.assets.getSample("titlescreen"), MUSIC_VOLUME, 1000.0);
        this.enterText = event.localization?.getItem("press_enter")?.[0] ?? "null";
        this.saveInfoText = event.localization?.getItem("save_info");
        this.showSaveInfo = false;
        this.saveInfoAppearPhase = 0;
    }
    update(event) {
        const LOGO_WAVE_SPEED = Math.PI * 2 / 120.0;
        const ENTER_FLICKER_TIME = 1.0 / 60.0;
        this.dummyCamera.forceCenter(new Vector(0, -128 - this.appearTimer / APPEAR_TIME * 128));
        this.dummyCamera.update(event);
        this.logoWave = (this.logoWave + LOGO_WAVE_SPEED * event.tick) % (Math.PI * 2);
        this.background.update(this.dummyCamera, event);
        if (event.transition.isActive()) {
            return;
        }
        if (this.appearTimer > 0) {
            this.appearTimer -= event.tick;
            if (this.appearTimer < 0) {
                this.appearTimer = 0;
            }
            return;
        }
        this.enterTimer = (this.enterTimer + ENTER_FLICKER_TIME * event.tick) % 1.0;
        if (this.showSaveInfo) {
            this.updateSaveInfo(event);
            return;
        }
        if (!this.enterPressed) {
            if (event.input.getAction("start") == 3 /* InputState.Pressed */) {
                event.audio.playSample(event.assets.getSample("pause"), 0.60);
                this.enterPressed = true;
            }
            return;
        }
        if (this.activeMenu !== this.menu &&
            this.activeMenu !== this.confirmClearDataMenu &&
            event.input.getAction("back") == 3 /* InputState.Pressed */) {
            event.audio.playSample(event.assets.getSample("deny"), 0.60);
            this.activeMenu = this.menu;
            this.activeMenuOffset = 1;
            // this.menu.activate()
            return;
        }
        this.activeMenu?.update(event);
    }
    redraw(canvas, assets) {
        const MENU_YOFF = 48;
        const PRESS_ENTER_OFFSET = 56;
        const BACKGROUND_MASK_ALPHA = 0.25;
        if (this.showSaveInfo) {
            this.drawSaveInfo(canvas, assets);
            return;
        }
        const bmpFontOutlines = assets.getBitmap("font_outlines");
        const bmpLogo = assets.getBitmap("logo");
        const t = this.appearTimer / APPEAR_TIME;
        this.background.draw(canvas, assets, this.dummyCamera);
        if (this.appearTimer > 0) {
            canvas.setColor(0, 0, 0, BACKGROUND_MASK_ALPHA * t);
            canvas.fillRect();
            canvas.setColor();
        }
        this.drawCornerTilemap(canvas, assets);
        this.drawLogo(canvas, bmpLogo);
        if (!this.enterPressed) {
            if (this.enterTimer < 0.5) {
                canvas.drawText(bmpFontOutlines, this.enterText, canvas.width / 2, canvas.height - PRESS_ENTER_OFFSET, -9, 0, 2 /* Align.Center */);
            }
        }
        else {
            this.activeMenu?.draw(canvas, assets, 0, this.activeMenuOffset * MENU_YOFF);
        }
        const copyRightOffset = t * 32;
        canvas.setColor(146, 255, 73);
        canvas.drawText(bmpFontOutlines, "\u0008 Baes.so - Thanks to Jani Nyk\u0007nen", canvas.width / 2, canvas.height - 16 + copyRightOffset, -9, 0, 2 /* Align.Center */);
        canvas.setColor();
        // Draw version
        //const versionOffset : number = t*16;
        //canvas.drawText(bmpFontOutlines, VERSION, -1, -1 - versionOffset, -9, 0);
    }
    dispose() {
        return this.activeFileIndex;
    }
}
