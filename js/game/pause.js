import { ConfirmationBox } from "../ui/confirmationbox.js";
import { Menu } from "../ui/menu.js";
import { MenuButton } from "../ui/menubutton.js";
import { TextBox } from "../ui/textbox.js";
import { Settings } from "./settings.js";
export class Pause {
    constructor(event, respawnEvent = undefined, saveEvent = undefined, quitEvent = undefined) {
        this.active = false;
        this.isActive = () => this.active;
        this.gameSavedBox = new TextBox();
        const menuText = event.localization?.getItem("pause_menu") ?? [];
        const strYes = event.localization?.getItem("yes")?.[0] ?? "null";
        const strNo = event.localization?.getItem("no")?.[0] ?? "null";
        this.menu = new Menu([
            // Resume
            new MenuButton(menuText[0] ?? "null", (event) => {
                event.audio.resumeMusic();
                this.deactivate();
                // resumeEvent(event);
            }),
            // Respawn
            new MenuButton(menuText[1] ?? "null", (event) => {
                this.respawnBox.activate(1);
            }),
            // Save game
            new MenuButton(menuText[2] ?? "null", (event) => {
                this.showGameSavedBox(saveEvent ?? (() => false), event);
            }),
            // Settings
            new MenuButton(menuText[3] ?? "null", (event) => {
                this.settings.activate(event);
            }),
            // Quit
            new MenuButton(menuText[4] ?? "null", (event) => {
                event.audio.stopMusic();
                this.quitBox.activate(1);
            }),
        ], false);
        // Respawn box
        this.respawnBox = new ConfirmationBox([strYes, strNo], event.localization?.getItem("respawn")?.[0] ?? "null", (event) => {
            respawnEvent?.(event);
            this.deactivate();
        }, (event) => {
            this.respawnBox.deactivate();
        });
        // Game saved box
        this.gameSavedBox = new TextBox();
        // Settings
        this.settings = new Settings(event);
        // Quit box
        this.quitBox = new ConfirmationBox([strYes, strNo], event.localization?.getItem("quit")?.[0] ?? "null", (event) => {
            quitEvent?.(event);
            this.deactivate();
        }, (event) => {
            this.quitBox.deactivate();
        });
    }
    showGameSavedBox(saveEvent, event) {
        const result = saveEvent(event);
        const text = event.localization?.getItem("savegame");
        this.gameSavedBox.addText([text[Number(result)]]);
        this.gameSavedBox.activate(true, null, (event) => {
            this.gameSavedBox.deactivate();
        });
    }
    update(event) {
        if (!this.active) {
            return;
        }
        if (this.gameSavedBox.isActive()) {
            this.gameSavedBox.update(event);
            return;
        }
        if (this.respawnBox.isActive()) {
            this.respawnBox.update(event);
            return;
        }
        if (this.settings.isActive()) {
            this.settings.update(event, true);
            return;
        }
        if (this.quitBox.isActive()) {
            this.quitBox.update(event);
            return;
        }
        if (event.input.getAction("back") == 3 /* InputState.Pressed */) {
            event.audio.resumeMusic();
            this.deactivate();
            event.audio.playSample(event.assets.getSample("pause"), 0.80);
            return;
        }
        this.menu.update(event);
    }
    draw(canvas, assets) {
        const DARKEN_MAGNITUDE = 0.50;
        if (!this.active) {
            return;
        }
        canvas.setColor(0, 0, 0, DARKEN_MAGNITUDE);
        canvas.fillRect();
        canvas.setColor();
        if (this.gameSavedBox.isActive()) {
            this.gameSavedBox.draw(canvas, assets);
            return;
        }
        if (this.respawnBox.isActive()) {
            this.respawnBox.draw(canvas, assets);
            return;
        }
        if (this.settings.isActive()) {
            this.settings.draw(canvas, assets);
            return;
        }
        if (this.quitBox.isActive()) {
            this.quitBox.draw(canvas, assets);
            return;
        }
        this.menu.draw(canvas, assets);
    }
    activate() {
        this.active = true;
        this.menu.activate(0);
        this.quitBox?.deactivate();
        this.respawnBox?.deactivate();
        this.gameSavedBox?.deactivate();
    }
    deactivate() {
        this.active = false;
        this.menu.deactivate();
        this.quitBox?.deactivate();
        this.respawnBox?.deactivate();
        this.gameSavedBox?.deactivate();
    }
}
