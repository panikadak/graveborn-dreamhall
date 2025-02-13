import { RGBA } from "../math/rgba.js";
import { Vector } from "../math/vector.js";
import { GameObject } from "./gameobject.js";
const CHAR_DISTANCE = 6;
export class FlyingText extends GameObject {
    constructor() {
        super(0, 0, false);
        this.symbol = 0 /* FlyingTextSymbol.None */;
        this.value = 0;
        this.timer = 0;
        this.color = new RGBA();
        this.cameraCheckArea = new Vector(64, 64);
    }
    spawn(x, y, value, symbol = 0 /* FlyingTextSymbol.None */, color = new RGBA(255, 255, 255)) {
        this.pos.x = x;
        this.pos.y = y;
        this.value = value;
        this.symbol = symbol;
        this.timer = 0;
        this.color = color.clone();
        this.exist = true;
    }
    updateEvent(event) {
        const FLY_TIME = 16;
        const FLY_SPEED = -1.5;
        const WAIT_TIME = 30;
        this.timer += event.tick;
        if (this.timer < FLY_TIME) {
            this.pos.y += FLY_SPEED * event.tick;
        }
        if (this.timer >= FLY_TIME + WAIT_TIME) {
            this.exist = false;
        }
    }
    draw(canvas, assets, bmp) {
        if (!this.isActive()) {
            return;
        }
        const str = String(Math.floor(Math.abs(this.value)));
        let dx = this.pos.x - str.length * CHAR_DISTANCE / 2;
        const dy = this.pos.y - 8;
        if (this.symbol > 0) {
            dx -= CHAR_DISTANCE / 2;
        }
        canvas.setColor(this.color.r, this.color.g, this.color.b, this.color.a);
        // Sign
        const sign = this.value < 0 ? 1 : 0;
        canvas.drawBitmap(bmp, 0 /* Flip.None */, dx, dy, 80 + sign * 8, 8, 8, 8);
        dx += CHAR_DISTANCE;
        // Numbers
        for (let i = 0; i < str.length; ++i) {
            const c = Number(str.charAt(i));
            canvas.drawBitmap(bmp, 0 /* Flip.None */, dx, dy, c * 8, 8, 8, 8);
            dx += CHAR_DISTANCE;
        }
        canvas.setColor();
        // Symbol
        if (this.symbol > 0) {
            canvas.drawBitmap(bmp, 0 /* Flip.None */, dx, dy, (this.symbol - 1) * 8, 0, 8, 8);
        }
    }
}
