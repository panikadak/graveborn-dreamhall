import { drawUIBox } from "./box.js";
export class TextBox {
    constructor(fixedSize = false, fixedWidth = 0, fixedHeight = 0) {
        this.activeText = undefined;
        this.charPos = 0;
        this.charWait = 0;
        this.finished = false;
        this.active = false;
        this.width = 0;
        this.height = 0;
        this.fixedSize = false;
        this.waitWave = 0;
        this.portraitID = null;
        this.finishEvent = undefined;
        this.isActive = () => this.active;
        this.isFinished = () => this.finished;
        this.getWidth = () => this.width;
        this.getHeight = () => this.height;
        this.textBuffer = new Array();
        this.fixedSize = fixedSize;
        if (fixedSize) {
            this.width = fixedWidth;
            this.height = fixedHeight;
        }
    }
    computeDimensions() {
        if (this.activeText === undefined)
            return;
        const lines = this.activeText.split("\n");
        this.width = Math.max(...lines.map(s => s.length));
        this.height = lines.length;
    }
    drawIcon(canvas, x, y) {
        const WIDTH = 8;
        const HEIGHT = 8;
        const AMPLITUDE = 1;
        const dx = x;
        const dy = y + Math.round(Math.sin(this.waitWave) * AMPLITUDE);
        canvas.setColor(0, 0, 0);
        canvas.fillRect(dx, dy, WIDTH, HEIGHT);
        canvas.setColor(255, 255, 73);
        canvas.fillRect(dx + 1, dy + 1, WIDTH - 2, HEIGHT - 2);
        canvas.setColor();
    }
    addText(text, parameters) {
        if (parameters === undefined) {
            this.textBuffer.push(...text);
            return;
        }
        for (let i = 0; i < text.length; ++i) {
            let baseMessage = text[i];
            if (parameters?.[i] !== undefined) {
                for (let j = 0; j < parameters.length; ++j) {
                    baseMessage = baseMessage.replace(`%${j + 1}`, parameters[i][j]);
                }
            }
            this.textBuffer.push(baseMessage);
        }
    }
    activate(instant = false, portraitID = null, finishEvent = undefined) {
        this.portraitID = portraitID;
        if (this.textBuffer.length == 0) {
            return;
        }
        this.activeText = this.textBuffer.shift() ?? "";
        if (!this.fixedSize) {
            this.computeDimensions();
        }
        this.charPos = 0;
        this.charWait = 0;
        this.finished = false;
        this.active = true;
        // TODO: Works only if there is only one message
        // in the buffer
        if (instant) {
            this.finished = true;
            this.charPos = this.activeText?.length ?? 0;
        }
        this.finishEvent = finishEvent;
    }
    update(event) {
        const WAIT_WAVE_SPEED = Math.PI * 2 / 60;
        const CHAR_WAIT_TIME = 3;
        if (!this.active || this.activeText === undefined)
            return;
        if (!this.finished) {
            if (event.input.isAnyPressed()) {
                // event.audio.playSample(event.assets.getSample("choose"), 0.60);
                this.charPos = this.activeText.length;
                this.finished = true;
                return;
            }
            while ((this.charWait += event.tick) >= CHAR_WAIT_TIME) {
                ++this.charPos;
                if (this.charPos == this.activeText.length) {
                    this.finished = true;
                    break;
                }
                const c = this.activeText?.charAt(this.charPos);
                if (c != "\n" && c != " ") {
                    this.charWait -= CHAR_WAIT_TIME;
                }
            }
            return;
        }
        if (this.finished) {
            this.waitWave = (this.waitWave + WAIT_WAVE_SPEED * event.tick) % (Math.PI * 2);
            if (event.input.isAnyPressed()) {
                event.audio.playSample(event.assets.getSample("choose"), 0.50);
                this.activeText = this.textBuffer.shift();
                if (this.activeText === undefined) {
                    this.finishEvent?.(event);
                    this.active = false;
                    return;
                }
                if (!this.fixedSize) {
                    this.computeDimensions();
                }
                this.charPos = 0;
                this.charWait = 0;
                this.finished = false;
            }
        }
    }
    draw(canvas, assets, x = 0, y = 0, yoff = 2, drawBox = true, drawIcon = true, boxColors = undefined, drawShadow = true, shadowAlpha = 0.25, shadowOffset = 2) {
        const BOX_OFFSET = 2;
        const SIDE_OFFSET = 2;
        if (!this.active) {
            return;
        }
        const font = assets.getBitmap("font");
        const bmpPortraits = assets.getBitmap("portraits");
        const charDim = (font?.width ?? 128) / 16;
        const w = (this.width * charDim + SIDE_OFFSET * 2);
        const h = this.height * (charDim + yoff) + SIDE_OFFSET * 2;
        let dx = x + canvas.width / 2 - w / 2;
        const dy = y + canvas.height / 2 - h / 2;
        if (drawBox) {
            drawUIBox(canvas, dx - BOX_OFFSET, dy - BOX_OFFSET, w + BOX_OFFSET * 2, h + BOX_OFFSET * 2, boxColors, drawShadow, shadowAlpha, shadowOffset);
        }
        // Store this before modifying dx further, since the icon
        // should be drawn last
        const iconPosX = dx + w - 3;
        const ph = bmpPortraits?.height ?? 0;
        if (this.portraitID !== null) {
            canvas.setColor(0, 0, 0, 0.5);
            canvas.fillRect(dx + 4, dy + h / 2 - ph / 2, 48, 48);
            canvas.setColor();
            canvas.drawBitmap(bmpPortraits, 0 /* Flip.None */, dx + 4, dy + h / 2 - ph / 2, this.portraitID * ph, 0, ph, ph);
        }
        const textAreaShift = this.portraitID === null ? 0 : ph + 8;
        dx += textAreaShift;
        const str = this.activeText?.substring(0, this.charPos) ?? "";
        canvas.drawText(font, str, dx + SIDE_OFFSET, dy + SIDE_OFFSET, 0, yoff);
        if (this.finished && drawIcon) {
            this.drawIcon(canvas, iconPosX, dy + h - 3);
        }
    }
    deactivate() {
        this.active = false;
    }
    forceChangeText(newText) {
        this.activeText = newText;
        this.finished = true;
        this.charPos = this.activeText.length;
    }
    clear() {
        this.textBuffer = new Array();
    }
}
