import { drawUIBox } from "./box.js";
import { Menu } from "./menu.js";
import { MenuButton } from "./menubutton.js";
export class ConfirmationBox {
    constructor(buttonText, message, yesEvent, noEvent) {
        this.isActive = () => this.menu.isActive();
        this.baseMessage = message;
        this.message = message.split("\n");
        this.width = Math.max(...this.message.map(s => s.length));
        this.height = this.message.length;
        this.menu = new Menu([
            new MenuButton(buttonText[0], (event) => {
                yesEvent(event);
                this.menu.deactivate();
            }),
            new MenuButton(buttonText[1], (event) => {
                noEvent(event);
                this.menu.deactivate();
            })
        ]);
    }
    update(event) {
        if (event.input.getAction("back") == 3 /* InputState.Pressed */) {
            event.audio.playSample(event.assets.getSample("deny"), 0.60);
            this.menu.callButtonEvent(1, event);
            this.deactivate();
            return;
        }
        this.menu.update(event);
    }
    draw(canvas, assets, x = 0, y = 0, drawBox = true, yoff = 10, menuYoff = 12, boxColors = undefined, drawShadow = true, shadowAlpha = 0.25, shadowOffset = 2) {
        const BOX_OFFSET = 2;
        const SIDE_OFFSET = 2;
        if (!this.menu.isActive()) {
            return;
        }
        const font = assets.getBitmap("font");
        const charDim = (font?.width ?? 128) / 16;
        const w = (this.width + 1) * charDim;
        const h = (this.height + 1) * yoff + 2 * menuYoff;
        const dx = x + canvas.width / 2 - w / 2;
        const dy = y + canvas.height / 2 - h / 2;
        if (drawBox) {
            drawUIBox(canvas, dx - BOX_OFFSET, dy - BOX_OFFSET, w + BOX_OFFSET * 2, h + BOX_OFFSET * 2, boxColors, drawShadow, shadowAlpha, shadowOffset);
        }
        for (let i = 0; i < this.message.length; ++i) {
            canvas.drawText(font, this.message[i], dx + SIDE_OFFSET, dy + SIDE_OFFSET + i * yoff);
        }
        const menuY = (dy + h - canvas.height / 2) - menuYoff;
        this.menu.draw(canvas, assets, x, menuY, menuYoff, false);
    }
    changeText(newText) {
        this.message = newText.split("\n");
        this.width = Math.max(...this.message.map(s => s.length));
        this.height = this.message.length;
    }
    activate(cursorPos = 0, messageParams, overrideYes) {
        if (messageParams !== undefined) {
            let newMessage = this.baseMessage;
            for (let i = 0; i < messageParams.length; ++i) {
                newMessage = newMessage.replace(`%${i + 1}`, messageParams[i]);
            }
            this.message = newMessage.split("\n");
            // Re-compute the dimensions
            this.width = Math.max(...this.message.map(s => s.length));
            this.height = this.message.length;
        }
        if (overrideYes !== undefined) {
            this.menu.changeButtonEvent(0, overrideYes);
        }
        this.menu.activate(cursorPos);
    }
    deactivate() {
        this.menu.deactivate();
    }
}
