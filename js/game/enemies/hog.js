import { Enemy } from "./enemy.js";
const BASE_SPEED = 0.65;
const JUMP_RECOVER_TIME = 30;
export class Hog extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.jumpRecoverTimer = JUMP_RECOVER_TIME;
        this.sprite.setFrame(0, 8);
        this.health = 8;
        this.attackPower = 3;
        this.dropProbability = 0.40;
        this.coinTypeWeights[0] = 0.80;
        this.coinTypeWeights[1] = 0.20;
        this.collisionBox.w = 12;
        this.knockbackFactor = 0.75;
        this.friction.x = 0.05;
        this.friction.y = 0.10;
        this.target.y = 3.0;
    }
    jump(event) {
        const JUMP_HEIGHT = -2.5;
        this.speed.y = JUMP_HEIGHT;
        event.audio.playSample(event.assets.getSample("jump2"), 0.30);
    }
    updateLogic(event) {
        const ANIMATION_SPEED = 4;
        const JUMP_FRAME_EPS = 0.5;
        if (this.touchSurface) {
            this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
            if (this.jumpRecoverTimer > 0) {
                this.jumpRecoverTimer -= event.tick;
            }
        }
        else {
            let frame = 5;
            if (this.speed.y < -JUMP_FRAME_EPS) {
                frame = 4;
            }
            else if (this.speed.y > JUMP_FRAME_EPS) {
                frame = 6;
            }
            this.sprite.setFrame(frame, this.sprite.getRow());
        }
        if (this.hurtTimer <= 0 && !this.touchSurface && this.didTouchSurface) {
            this.jump(event);
        }
        this.flip = this.dir > 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        this.target.x = this.computeSlopeSpeedFactor() * BASE_SPEED * this.dir;
        // this.speed.x = this.target.x;
    }
    playerEvent(player, event) {
        const JUMP_TRIGGER = 48;
        if (!this.touchSurface) {
            return;
        }
        const ppos = player.getPosition();
        this.dir = Math.sign(ppos.x - this.pos.x);
        if (this.jumpRecoverTimer <= 0 &&
            (ppos.y < this.pos.y - JUMP_TRIGGER ||
                (this.hurtTimer <= 0 && player.isAttacking()))) {
            this.jump(event);
            this.jumpRecoverTimer = JUMP_RECOVER_TIME;
        }
    }
}
