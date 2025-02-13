import { GameObject } from "./gameobject.js";
import { Vector } from "../math/vector.js";
import { Sprite } from "../gfx/sprite.js";
const ANIMATION_LENGTH = [
    4, 4,
];
const ANIMATION_SPEED = [
    8, 8
];
export class AnimatedParticle extends GameObject {
    constructor() {
        super(0, 0, false);
        this.flip = 0 /* Flip.None */;
        this.id = 0;
        this.sprite = new Sprite(16, 16);
        this.cameraCheckArea = new Vector(32, 32);
    }
    cameraEvent(enteredCamera, camera, event) {
        if (!this.inCamera) {
            this.exist = false;
        }
    }
    updateEvent(event) {
        this.sprite.animate(this.sprite.getRow(), 0, ANIMATION_LENGTH[this.id], ANIMATION_SPEED[this.id], event.tick);
        if (this.sprite.getColumn() == 4) {
            this.exist = false;
        }
    }
    draw(canvas, assets, bmp) {
        if (!this.exist || !this.inCamera) {
            return;
        }
        this.sprite.draw(canvas, bmp, this.pos.x - this.sprite.width / 2, this.pos.y - this.sprite.height / 2, this.flip);
    }
    spawn(x, y, speedx, speedy, id, flip = 0 /* Flip.None */) {
        this.pos = new Vector(x, y);
        this.speed = new Vector(speedx, speedy);
        this.target = this.speed.clone();
        this.id = id;
        this.flip = flip;
        this.dying = false;
        this.exist = true;
        this.sprite.setFrame(0, this.id);
    }
}
