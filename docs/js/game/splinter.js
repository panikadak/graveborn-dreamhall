import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
import { CollisionObject } from "./collisionobject.js";
const EXISTENCE_TIME = 90;
const BASE_GRAVITY = 4.0;
export class Splinter extends CollisionObject {
    constructor() {
        super(0, 0, false);
        this.row = 0;
        this.frame = 0;
        this.timer = 0;
        this.collisionBox = new Rectangle(0, 0, 6, 6);
        this.target.x = 0;
        this.target.y = BASE_GRAVITY;
        this.friction.x = 0.02;
        this.friction.y = 0.15;
        this.cameraCheckArea = new Vector(8, 8);
        this.bounceFactor.x = 1.0;
        this.bounceFactor.y = 0.5;
    }
    updateEvent(event) {
        this.timer -= event.tick;
        if (this.timer <= 0) {
            this.exist = false;
        }
    }
    spawn(x, y, speedx, speedy, row, frame) {
        this.pos = new Vector(x, y);
        this.oldPos = this.pos.clone();
        this.speed = new Vector(speedx, speedy);
        // this.target = this.speed.clone();
        this.row = row;
        this.frame = frame;
        this.timer = EXISTENCE_TIME;
        this.dying = false;
        this.exist = true;
    }
    draw(canvas, assets, bmp) {
        if (!this.inCamera || !this.exist) {
            return;
        }
        const dx = this.pos.x - 8;
        const dy = this.pos.y - 8;
        canvas.setAlpha(this.timer / EXISTENCE_TIME);
        canvas.drawBitmap(bmp, 0 /* Flip.None */, dx, dy, this.frame * 16, this.row * 16, 16, 16);
        canvas.setAlpha();
    }
}
