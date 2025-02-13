export class Keyboard {
    constructor() {
        this.anyPressed = false;
        this.used = false;
        this.isAnyPressed = () => this.anyPressed;
        this.wasUsed = () => this.used;
        this.states = new Map();
        this.prevent = new Array("ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "KeyA", "KeyS", "KeyD", "KeyW");
        window.addEventListener("keydown", (e) => {
            this.keyEvent(true, e.code);
            if (this.prevent.includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener("keyup", (e) => {
            this.keyEvent(false, e.code);
            if (this.prevent.includes(e.code)) {
                e.preventDefault();
            }
        });
    }
    keyEvent(down, key) {
        this.used = true;
        if (down) {
            if (this.states.get(key) === 1 /* InputState.Down */) {
                return;
            }
            this.states.set(key, 3 /* InputState.Pressed */);
            this.anyPressed = true;
            return;
        }
        if (this.states.get(key) === 0 /* InputState.Up */) {
            return;
        }
        this.states.set(key, 2 /* InputState.Released */);
    }
    update() {
        for (const k of this.states.keys()) {
            if (this.states.get(k) === 3 /* InputState.Pressed */) {
                this.states.set(k, 1 /* InputState.Down */);
            }
            else if (this.states.get(k) === 2 /* InputState.Released */) {
                this.states.set(k, 0 /* InputState.Up */);
            }
        }
        this.anyPressed = false;
        this.used = false;
    }
    getKeyState(name) {
        return this.states.get(name) ?? 0 /* InputState.Up */;
    }
    preventKey(key) {
        this.prevent.push(key);
    }
    flush() {
        for (const k of this.states.keys()) {
            this.states.set(k, 0 /* InputState.Up */);
        }
    }
}
