import { Vector } from "../math/vector.js";
export class Mouse {
    constructor() {
        this.anyPressed = false;
        this.isAnyPressed = () => this.anyPressed;
        this.getPosition = () => this.scaledPos.clone();
        this.unitPos = new Vector();
        this.scaledPos = new Vector();
        this.prevent = new Array();
        this.buttonStates = new Map();
        window.addEventListener("mousedown", (ev) => {
            this.buttonEvent(true, ev.button);
            if (this.prevent.includes(ev.button)) {
                ev.preventDefault();
            }
            // TODO: Redundant?
            window.focus();
        });
        window.addEventListener("mouseup", (ev) => {
            this.buttonEvent(false, ev.button);
            if (this.prevent.includes(ev.button)) {
                ev.preventDefault();
            }
        });
        window.addEventListener("mousemove", (ev) => {
            this.unitPos.x = ev.clientX / window.innerWidth;
            this.unitPos.y = ev.clientY / window.innerHeight;
            // window.focus();
        });
        window.addEventListener("contextmenu", (ev) => { ev.preventDefault(); });
    }
    buttonEvent(down, button) {
        if (down) {
            if (this.buttonStates.get(button) === 1 /* InputState.Down */) {
                return;
            }
            this.buttonStates.set(button, 3 /* InputState.Pressed */);
            this.anyPressed = true;
            return;
        }
        if (this.buttonStates.get(button) === 0 /* InputState.Up */) {
            return;
        }
        this.buttonStates.set(button, 2 /* InputState.Released */);
    }
    computeScaledPosition(event) {
        this.scaledPos.x = Math.round(this.unitPos.x * event.screenWidth);
        this.scaledPos.y = Math.round(this.unitPos.y * event.screenHeight);
    }
    update(event) {
        this.computeScaledPosition(event);
        for (const k of this.buttonStates.keys()) {
            if (this.buttonStates.get(k) === 3 /* InputState.Pressed */) {
                this.buttonStates.set(k, 1 /* InputState.Down */);
            }
            else if (this.buttonStates.get(k) === 2 /* InputState.Released */) {
                this.buttonStates.set(k, 0 /* InputState.Up */);
            }
        }
        this.anyPressed = false;
    }
    getButtonState(button) {
        return this.buttonStates.get(button) ?? 0 /* InputState.Up */;
    }
    preventButton(button) {
        this.prevent.push(button);
    }
}
