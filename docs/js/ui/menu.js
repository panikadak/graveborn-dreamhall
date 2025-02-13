import { negMod } from "../math/utility.js";
import { drawUIBox } from "./box.js";
export const MENU_ITEM_BASE_COLOR = [[255, 255, 255], [146, 146, 146]];
export const MENU_ITEM_SELECTED_COLOR = [[255, 255, 0], [182, 182, 36]];
export class Menu {
    constructor(buttons, makeActive = false, fixedWidth = undefined, fixedHeight = undefined) {
        this.cursorPos = 0;
        this.active = false;
        this.handAnimation = 0;
        this.isActive = () => this.active;
        this.isButtonDeactivated = (i) => this.buttons[i]?.isDeactivated() ?? false;
        this.getCursorPos = () => this.cursorPos;
        this.getButtonCount = () => this.buttons.length;
        this.buttons = buttons.map((_, i) => buttons[i].clone());
        this.active = makeActive;
        this.width = fixedWidth ?? (2 + Math.max(...this.buttons.map(b => b.getText().length)));
        this.height = fixedHeight ?? this.buttons.length;
    }
    activate(cursorPos = this.cursorPos) {
        if (cursorPos == -1) {
            cursorPos = this.buttons.length - 1;
        }
        this.cursorPos = cursorPos % this.buttons.length;
        this.active = true;
    }
    update(event) {
        const HAND_ANIMATION_SPEED = Math.PI * 2 / 60.0;
        if (!this.active) {
            return;
        }
        const oldPos = this.cursorPos;
        if (event.input.upPress()) {
            --this.cursorPos;
        }
        else if (event.input.downPress()) {
            ++this.cursorPos;
        }
        if (oldPos != this.cursorPos) {
            this.cursorPos = negMod(this.cursorPos, this.buttons.length);
            event.audio.playSample(event.assets.getSample("choose"), 0.50);
        }
        // Selection event
        if (event.input.getAction("select") == 3 /* InputState.Pressed */) {
            if (this.buttons[this.cursorPos].isDeactivated()) {
                event.audio.playSample(event.assets.getSample("deny"), 0.60);
            }
            else if (this.buttons[this.cursorPos].evaluateCallback(event)) {
                event.audio.playSample(event.assets.getSample("select"), 0.40);
            }
        }
        // Left & right events
        if ((event.input.leftPress() && this.buttons[this.cursorPos].evaluateLeftCallback(event)) ||
            (event.input.rightPress() && this.buttons[this.cursorPos].evaluateRightCallback(event))) {
            event.audio.playSample(event.assets.getSample("choose"), 0.70);
        }
        this.handAnimation = (this.handAnimation + HAND_ANIMATION_SPEED * event.tick) % (Math.PI * 2);
    }
    draw(canvas, assets, x = 0, y = 0, yoff = 12, drawBox = true, boxColors = undefined, drawShadow = true, shadowAlpha = 0.25, shadowOffset = 2) {
        const BOX_OFFSET = 2;
        const SIDE_OFFSET = 2;
        if (!this.active) {
            return;
        }
        const font = assets.getBitmap("font");
        const charDim = (font?.width ?? 128) / 16;
        const w = (this.width + 1) * charDim;
        const h = this.height * yoff;
        const dx = x + canvas.width / 2 - w / 2;
        const dy = y + canvas.height / 2 - h / 2;
        if (drawBox) {
            drawUIBox(canvas, dx - BOX_OFFSET, dy - BOX_OFFSET, w + BOX_OFFSET * 2, h + BOX_OFFSET * 2, boxColors, drawShadow, shadowAlpha, shadowOffset);
        }
        for (let i = 0; i < this.buttons.length; ++i) {
            // This is a beautiful line
            const buttonColor = (i == this.cursorPos ? MENU_ITEM_SELECTED_COLOR : MENU_ITEM_BASE_COLOR)[Number(this.buttons[i].isDeactivated())];
            canvas.setColor(...buttonColor);
            const xoff = Number(i == this.cursorPos) * 15;
            // Item text
            canvas.drawText(font, this.buttons[i].getText(), dx + xoff + SIDE_OFFSET, dy + SIDE_OFFSET + i * yoff);
            // Hand
            if (i == this.cursorPos) {
                canvas.setColor(...MENU_ITEM_SELECTED_COLOR[0]);
                canvas.drawBitmap(font, 0 /* Flip.None */, dx + SIDE_OFFSET + Math.round(Math.sin(this.handAnimation)), dy + SIDE_OFFSET + i * yoff, 8, 0, 16, 8);
            }
        }
        canvas.setColor();
    }
    deactivate() {
        this.active = false;
    }
    changeButtonText(index, text) {
        this.buttons[index]?.changeText(text);
    }
    changeButtonEvent(index, cb) {
        this.buttons[index]?.changeCallback(cb);
    }
    toggleDeactivation(index, state) {
        if (index < 0 || index >= this.buttons.length)
            return;
        this.buttons[index].toggleDeactivation(state);
    }
    callButtonEvent(index, event) {
        if (index < 0 || index >= this.buttons.length)
            return;
        this.buttons[index].evaluateCallback(event);
    }
}
