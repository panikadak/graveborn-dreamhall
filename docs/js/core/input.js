import { Keyboard } from "./keyboard.js";
import { GamePad } from "./gamepad.js";
import { Vector } from "../math/vector.js";
import { Mouse } from "./mouse.js";
const INPUT_DIRECTION_DEADZONE = 0.1;
class InputAction {
    constructor(keys, gamepadButtons, mouseButtons) {
        this.keys = Array.from(keys);
        this.gamepadButtons = Array.from(gamepadButtons);
        this.mouseButtons = Array.from(mouseButtons);
    }
}
export class Input {
    get stick() {
        return this.vstick.clone();
    }
    constructor() {
        this.anyPressed = false;
        this.keyboardActive = true;
        this.gamepadActive = false;
        this.isAnyPressed = () => this.anyPressed;
        this.isKeyboardActive = () => this.keyboardActive;
        this.isGamepadActive = () => this.gamepadActive;
        this.actions = new Map();
        this.vstick = new Vector();
        this.oldStick = new Vector();
        this.stickDelta = new Vector();
        this.keyboard = new Keyboard();
        this.gamepad = new GamePad();
        this.mouse = new Mouse();
        // These are used to determine the player direction
        // more easily when using a keyboard
        this.addAction("right", ["ArrowRight"], [15]);
        this.addAction("up", ["ArrowUp"], [12]);
        this.addAction("left", ["ArrowLeft"], [14]);
        this.addAction("down", ["ArrowDown"], [13]);
    }
    addAction(name, keys, gamepadButtons = undefined, mouseButtons = undefined, prevent = true) {
        this.actions.set(name, new InputAction(keys, gamepadButtons ?? [], mouseButtons ?? []));
        if (prevent) {
            for (const k of keys) {
                this.keyboard.preventKey(k);
            }
        }
    }
    preUpdate() {
        const DEADZONE = 0.25;
        this.oldStick = this.vstick.clone();
        this.vstick.zeros();
        let stick = new Vector();
        // TODO: Replace the below with calls "getAction("left")" etc.
        if ((this.keyboard.getKeyState("ArrowLeft") & 1 /* InputState.DownOrPressed */) == 1 ||
            (this.keyboard.getKeyState("KeyA") & 1 /* InputState.DownOrPressed */) == 1 ||
            (this.gamepad.getButtonState(14) & 1 /* InputState.DownOrPressed */) == 1) {
            stick.x = -1;
        }
        else if ((this.keyboard.getKeyState("ArrowRight") & 1 /* InputState.DownOrPressed */) == 1 ||
            (this.keyboard.getKeyState("KeyD") & 1 /* InputState.DownOrPressed */) == 1 ||
            (this.gamepad.getButtonState(15) & 1 /* InputState.DownOrPressed */) == 1) {
            stick.x = 1;
        }
        if ((this.keyboard.getKeyState("ArrowUp") & 1 /* InputState.DownOrPressed */) == 1 ||
            (this.keyboard.getKeyState("KeyW") & 1 /* InputState.DownOrPressed */) == 1 ||
            (this.gamepad.getButtonState(12) & 1 /* InputState.DownOrPressed */) == 1) {
            stick.y = -1;
        }
        else if ((this.keyboard.getKeyState("ArrowDown") & 1 /* InputState.DownOrPressed */) == 1 ||
            (this.keyboard.getKeyState("KeyS") & 1 /* InputState.DownOrPressed */) == 1 ||
            (this.gamepad.getButtonState(13) & 1 /* InputState.DownOrPressed */) == 1) {
            stick.y = 1;
        }
        if (stick.length < DEADZONE) {
            stick = this.gamepad.stick;
        }
        if (stick.length >= DEADZONE) {
            this.vstick = stick;
        }
        this.stickDelta.x = this.vstick.x - this.oldStick.x;
        this.stickDelta.y = this.vstick.y - this.oldStick.y;
        this.anyPressed = this.keyboard.isAnyPressed() ||
            this.gamepad.isAnyPressed() ||
            this.mouse.isAnyPressed();
        if (this.gamepad.wasUsed()) {
            this.gamepadActive = true;
            this.keyboardActive = false;
        }
        if (this.keyboard.wasUsed()) {
            this.keyboardActive = true;
            this.gamepadActive = false;
        }
    }
    update(event) {
        this.keyboard.update();
        this.gamepad.update();
        this.mouse.update(event);
    }
    getAction(name) {
        const action = this.actions.get(name);
        if (action === undefined)
            return 0 /* InputState.Up */;
        for (const k of action.keys) {
            const state = this.keyboard.getKeyState(k);
            if (state != 0 /* InputState.Up */) {
                return state;
            }
        }
        for (let b of action.gamepadButtons) {
            const state = this.gamepad.getButtonState(b);
            if (state != 0 /* InputState.Up */) {
                return state;
            }
        }
        for (let b of action.mouseButtons) {
            const state = this.mouse.getButtonState(b);
            if (state != 0 /* InputState.Up */) {
                return state;
            }
        }
        return 0 /* InputState.Up */;
    }
    upPress() {
        return this.stick.y < 0 &&
            this.oldStick.y >= -INPUT_DIRECTION_DEADZONE &&
            this.stickDelta.y < -INPUT_DIRECTION_DEADZONE;
    }
    downPress() {
        return this.stick.y > 0 &&
            this.oldStick.y <= INPUT_DIRECTION_DEADZONE &&
            this.stickDelta.y > INPUT_DIRECTION_DEADZONE;
    }
    leftPress() {
        return this.stick.x < 0 &&
            this.oldStick.x >= -INPUT_DIRECTION_DEADZONE &&
            this.stickDelta.x < -INPUT_DIRECTION_DEADZONE;
    }
    rightPress() {
        return this.stick.x > 0 &&
            this.oldStick.x <= INPUT_DIRECTION_DEADZONE &&
            this.stickDelta.x > INPUT_DIRECTION_DEADZONE;
    }
}
