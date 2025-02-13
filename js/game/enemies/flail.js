import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";
// Not really a flail, but meh
export class Flail extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.distance = 0.0;
        this.angle = 0.0;
        this.sprite.setFrame(4, 5);
        this.health = 256;
        this.attackPower = 4;
        this.dropProbability = 0.0;
        this.canBeHurt = false;
        this.canBeMoved = false;
        this.canMoveOthers = false;
        this.takeCollisions = false;
        this.cameraCheckArea.x = 64;
        this.cameraCheckArea.y = 64;
        this.dir = Math.floor(this.pos.x / TILE_WIDTH) % 2 == 0 ? -1 : 1;
        this.angle = Math.PI / 2 - this.dir * Math.PI / 2;
        this.speed.zeros();
        this.target.zeros();
        this.hitbox.w = 8;
        this.hitbox.h = 8;
    }
    updateLogic(event) {
        const MAX_DISTANCE = 32;
        const DISTANCE_DELTA = MAX_DISTANCE / 60;
        const ROTATION_SPEED = Math.PI * 2 / 150;
        const ANIMATION_SPEED = 5;
        this.sprite.animate(this.sprite.getRow(), 4, 5, ANIMATION_SPEED, event.tick);
        this.distance = Math.min(MAX_DISTANCE, this.distance + DISTANCE_DELTA * event.tick);
        this.pos.x = this.initialPos.x + this.dir * Math.cos(this.angle) * this.distance;
        this.pos.y = this.initialPos.y + Math.sin(this.angle) * this.distance;
        this.angle = (this.angle + ROTATION_SPEED * event.tick) % (Math.PI * 2);
    }
    draw(canvas, assets, bmp) {
        const CHAIN_COUNT = 5;
        if (!this.exist || !this.inCamera) {
            return;
        }
        const dx = this.pos.x - this.sprite.width / 2;
        const dy = this.pos.y - this.sprite.height / 2;
        // Chain
        const distDelta = this.distance / (CHAIN_COUNT);
        const c = this.dir * Math.cos(this.angle);
        const s = Math.sin(this.angle);
        for (let i = 0; i < CHAIN_COUNT; ++i) {
            const distance = distDelta * i;
            const chainx = Math.round(this.initialPos.x + c * distance);
            const chainy = Math.round(this.initialPos.y + s * distance);
            canvas.drawBitmap(bmp, 0 /* Flip.None */, chainx - 12, chainy - 12, 144, 120, 24, 24);
        }
        // Body
        this.sprite.draw(canvas, bmp, dx, dy, this.flip);
    }
}
