import { Vector } from "../math/vector.js";
const DEACTIVATION_DISTANCE = 160;
const FADE_TIME = 20;
class Message {
    constructor(body) {
        this.body = "";
        this.width = 0;
        this.height = 0;
        this.body = body;
        const lines = body.split("\n");
        this.width = Math.max(...lines.map((s) => s.length));
        this.height = lines.length;
    }
}
export class HintRenderer {
    constructor() {
        this.activeMessage = undefined;
        this.active = false;
        this.fadeTimer = 0;
        this.fadeMode = 0;
        this.startPos = new Vector();
        this.messages = new Array(2);
    }
    update(player, event) {
        if (this.fadeTimer > 0) {
            this.fadeTimer -= event.tick;
        }
        if (!this.active) {
            return;
        }
        // The third option hopefully never happens!
        if (event.input.isGamepadActive()) {
            this.activeMessage = this.messages[1];
        }
        else if (event.input.isKeyboardActive()) {
            this.activeMessage = this.messages[0];
        }
        const playerPos = player.getPosition();
        if (Vector.distance(playerPos, this.startPos) > DEACTIVATION_DISTANCE) {
            this.active = false;
            this.fadeTimer = FADE_TIME;
            this.fadeMode = 0;
        }
    }
    draw(canvas, assets) {
        const TOP_OFF = 36;
        const TEXT_YOFF_MODIFIER = -4;
        if ((!this.active && this.fadeTimer <= 0) || this.activeMessage === undefined) {
            return;
        }
        const bmpFont = assets.getBitmap("font_outlines");
        let alpha = 1.0;
        if (this.fadeTimer > 0) {
            const t = this.fadeTimer / FADE_TIME;
            alpha = this.fadeMode == 0 ? t : 1.0 - t;
        }
        const width = (this.activeMessage.width + 1) * 8;
        const height = this.activeMessage.height * (16 + TEXT_YOFF_MODIFIER);
        const dx = canvas.width / 2 - width / 2;
        const dy = TOP_OFF - height / 2;
        canvas.setColor(0, 0, 0, 0.33 * alpha);
        canvas.fillRect(dx - 2, dy - 2, width + 4, height + 8);
        canvas.setColor();
        canvas.setAlpha(alpha);
        canvas.drawText(bmpFont, this.activeMessage.body, dx, dy, -8, TEXT_YOFF_MODIFIER, 0 /* Align.Left */);
        canvas.setAlpha();
    }
    activate(startPos, keyboardMessage, gamepadMessage) {
        this.messages[0] = new Message(keyboardMessage);
        this.messages[1] = new Message(gamepadMessage ?? keyboardMessage);
        this.activeMessage = this.messages[0];
        this.startPos = startPos.clone();
        this.active = true;
        this.fadeTimer = FADE_TIME;
        this.fadeMode = 1;
    }
    deactivate() {
        this.active = false;
        this.fadeTimer = 0;
    }
}
