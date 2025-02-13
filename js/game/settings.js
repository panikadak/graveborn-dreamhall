import { Menu } from "../ui/menu.js";
import { MenuButton } from "../ui/menubutton.js";
export const SETTINGS_LOCAL_STORAGE_KEY = "the_end_of_dreams__settings";
export class Settings {
    constructor(event, backEvent) {
        this.backEvent = undefined;
        this.isActive = () => this.menu.isActive();
        this.backEvent = backEvent;
        const text = event.localization?.getItem("settings") ?? [];
        this.menu = new Menu(this.createMenuButtons(text));
    }
    createMenuButtons(text) {
        const buttons = [
            // NOTE: The actual button text will be set by the "activate" function, we just
            // pass something here to compute the correct size for the menu box.
            new MenuButton((text[0] ?? "null") + ": 100%", undefined, (event) => {
                event.audio.setSoundVolume(event.audio.getSoundVolume() - 10);
                this.updateSoundButtonText(event);
            }, (event) => {
                event.audio.setSoundVolume(event.audio.getSoundVolume() + 10);
                this.updateSoundButtonText(event);
            }),
            new MenuButton((text[1] ?? "null") + ": 100%", undefined, (event) => {
                event.audio.setMusicVolume(event.audio.getMusicVolume() - 10);
                this.updateSoundButtonText(event);
            }, (event) => {
                event.audio.setMusicVolume(event.audio.getMusicVolume() + 10);
                this.updateSoundButtonText(event);
            }),
        ];
        // Only in nw.js
        if (window["nw"] !== undefined) {
            buttons.push(new MenuButton(text[2] ?? "null", (event) => {
                window["nw"]?.["Window"]?.["get"]?.()?.["toggleFullscreen"]?.();
            }));
        }
        buttons.push(new MenuButton(text[3] ?? "null", (event) => {
            this.deactivate();
            this.backEvent?.(event);
            this.save(event);
        }));
        return buttons;
    }
    updateSoundButtonText(event) {
        const soundVolume = event.audio.getSoundVolume();
        const musicVolume = event.audio.getMusicVolume();
        const text = event.localization?.getItem("settings") ?? [];
        this.menu.changeButtonText(0, `${text[0]}: ${soundVolume}%`);
        this.menu.changeButtonText(1, `${text[1]}: ${musicVolume}%`);
    }
    save(event) {
        try {
            const output = {};
            output["musicvolume"] = String(event.audio.getMusicVolume());
            output["soundvolume"] = String(event.audio.getSoundVolume());
            if (window["nw"] !== undefined) {
                output["fullscreen"] = String(window["nw"]?.["Window"]?.["get"]?.()?.["isFullscreen"]);
            }
            window["localStorage"]["setItem"](SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(output));
        }
        catch (e) {
            console.error("Not-so-fatal error: failed to save settings: " + e["message"]);
        }
    }
    update(event, allowBack = false) {
        if (!this.isActive()) {
            return;
        }
        if (allowBack &&
            event.input.getAction("back") == 3 /* InputState.Pressed */) {
            this.deactivate();
            event.audio.playSample(event.assets.getSample("deny"), 0.60);
            return;
        }
        this.menu.update(event);
    }
    draw(canvas, assets, xoff = 0, yoff = 0) {
        this.menu.draw(canvas, assets, xoff, yoff);
    }
    activate(event) {
        this.updateSoundButtonText(event);
        this.menu.activate(2);
    }
    deactivate() {
        this.menu.deactivate();
    }
}
