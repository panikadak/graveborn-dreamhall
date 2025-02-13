import { Vector } from "../math/vector.js";
// Gamepad was taken...
export class GamePad {
    get stick() {
        return this.leftStick.clone();
    }
    constructor() {
        this.index = undefined;
        this.anyPressed = false;
        this.activePad = undefined;
        this.used = false;
        this.isAnyPressed = () => this.anyPressed;
        this.wasUsed = () => this.used;
        this.leftStick = new Vector();
        this.buttons = new Map();
        this.oldButtonStates = new Array();
        this.buttonStates = new Array();
        window.addEventListener("gamepadconnected", (ev) => {
            if (this.index === undefined) {
                console.log("Gamepad with index " +
                    String(ev["gamepad"]["index"]) +
                    " connected.");
            }
            else {
                console.log("Gamepad with index " +
                    String(ev["gamepad"].index) +
                    " connected but ignored since one gamepad is already connected.");
                return;
            }
            const pad = navigator.getGamepads()[ev["gamepad"]["index"]] ?? null;
            this.index = ev["gamepad"]["index"];
            this.activePad = pad;
            this.checkButtons();
        });
    }
    updateButtons() {
        if (this.activePad === null || this.activePad === undefined) {
            return;
        }
        for (const k of this.buttons.keys()) {
            if (this.buttons.get(k) === 3 /* InputState.Pressed */) {
                this.buttons.set(k, 1 /* InputState.Down */);
            }
            else if (this.buttons.get(k) === 2 /* InputState.Released */) {
                this.buttons.set(k, 0 /* InputState.Up */);
            }
        }
    }
    updateStick() {
        const DEADZONE = 0.25;
        if (this.activePad === null || this.activePad === undefined) {
            return;
        }
        let noLeftStick = true;
        this.leftStick.x = 0;
        this.leftStick.y = 0;
        if (Math.abs(this.activePad.axes[0]) >= DEADZONE) {
            this.leftStick.x = this.activePad.axes[0];
            noLeftStick = false;
            this.used = true;
        }
        if (Math.abs(this.activePad.axes[1]) >= DEADZONE) {
            this.leftStick.y = this.activePad.axes[1];
            noLeftStick = false;
            this.used = true;
        }
        // On Firefox dpad is considered
        // axes, not buttons (not sure if any more, though)
        if (this.activePad.axes.length >= 8 && noLeftStick) {
            if (Math.abs(this.activePad.axes[6]) >= DEADZONE) {
                this.leftStick.x = this.activePad.axes[6];
                this.used = true;
            }
            if (Math.abs(this.activePad.axes[7]) >= DEADZONE) {
                this.leftStick.y = this.activePad.axes[7];
                this.used = true;
            }
        }
    }
    checkButtons() {
        for (const k in this.activePad?.buttons) {
            const oldState = (this.oldButtonStates[k] = this.buttonStates[k] ?? false);
            const newState = (this.buttonStates[k] = this.activePad?.buttons[k].pressed ?? false);
            if (oldState != newState) {
                this.buttons.set(Number(k), newState ? 3 /* InputState.Pressed */ : 2 /* InputState.Released */);
                this.anyPressed = this.anyPressed || newState;
                this.used = true;
            }
        }
    }
    refreshGamepads() {
        const pads = navigator?.getGamepads() ?? [];
        this.activePad = pads[this.index];
        this.checkButtons();
    }
    update() {
        this.used = false;
        this.anyPressed = false;
        this.leftStick.x = 0.0;
        this.leftStick.y = 0.0;
        this.updateButtons();
        this.updateStick();
    }
    getButtonState(button) {
        return this.buttons.get(button) ?? 0 /* InputState.Up */;
    }
}
