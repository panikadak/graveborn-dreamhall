import { Rectangle } from "../../math/rectangle.js";
import { Enemy } from "./enemy.js";
const GRAVITY = 4.0;
const MOVE_SPEED = 0.7;
export class Spearman extends Enemy {
    constructor(x, y) {
        super(x, y - 36);
        this.sprite.setFrame(6, 14);
        this.health = 8;
        this.attackPower = 4;
        this.dropProbability = 0.80;
        this.knockbackFactor = 0.75;
        this.friction.x = 0.025;
        this.friction.y = 0.075;
        this.target.y = GRAVITY;
        this.bounceFactor.x = 1.0;
        this.collisionBox.y = 13;
        this.collisionBox.w = 4;
        this.collisionBox.h = 42;
        this.hitbox.y = 0;
        this.hitbox.h = -12;
        this.hitbox.w = 10;
        this.hitbox.h = 16;
        this.overriddenHurtbox = new Rectangle(0, 13, 4, 36);
        this.coinTypeWeights[0] = 0.10;
        this.coinTypeWeights[1] = 0.90;
        this.cameraCheckArea.y = 96;
    }
    updateLogic(event) {
        const JUMP_HEIGHT = -2.75;
        if (this.touchSurface && !this.didTouchSurface) {
            this.speed.y = JUMP_HEIGHT;
            event.audio.playSample(event.assets.getSample("jump2"), 0.30);
        }
        this.flip = this.dir > 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        this.target.x = this.dir * MOVE_SPEED;
    }
    playerEvent(player, event) {
        const ppos = player.getPosition();
        this.dir = Math.sign(ppos.x - this.pos.x);
    }
    wallCollisionEvent(direction, event) {
        this.dir = -direction;
        this.target.x = MOVE_SPEED * this.dir;
        this.flip = direction > 0 ? 0 /* Flip.None */ : 1 /* Flip.Horizontal */;
    }
    draw(canvas, assets, bmp) {
        if (!this.exist || !this.inCamera) {
            return;
        }
        // Flicker if hurt
        if (!this.dying && this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer / 4) % 2 != 0) {
            return;
        }
        const dx = this.pos.x - this.sprite.width / 2;
        const dy = this.pos.y - this.sprite.height / 2;
        // Main body
        this.sprite.draw(canvas, bmp, dx, dy, this.flip);
        // Pogo stick
        if (!this.dying) {
            canvas.drawBitmap(bmp, this.flip, dx, dy + 24, 168, 336, 24, 24);
        }
    }
}
