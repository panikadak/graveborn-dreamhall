import { Enemy } from "./enemy.js";
const DROP_GRAVITY = 6.0;
const RETURN_SPEED = -0.75;
const WAIT_TIME = 60;
export class Brick extends Enemy {
    constructor(x, y) {
        super(x, y + 3);
        this.waitTimer = 0;
        this.mode = 0;
        this.sprite.setFrame(7, 5);
        this.health = 7;
        this.attackPower = 5;
        this.dropProbability = 0.25;
        this.target.y = 0.0;
        this.friction.y = 0.15;
        this.canBeHurt = false;
        this.canBeMoved = false;
        this.collisionBox.w = 16;
        this.collisionBox.h = 22;
        this.collisionBox.y = 0;
        this.hitbox.w = 14;
        this.hitbox.h = 16;
        this.sprite.setFrame(0, 7);
    }
    slopeCollisionEvent(direction, event) {
        if (direction == 1 && this.mode == 1) {
            this.mode = 2;
            this.waitTimer = WAIT_TIME;
            this.target.zeros();
            event.audio.playSample(event.assets.getSample("thwomp"), 0.50);
            this.shakeEvent?.(30, 2);
        }
        else if (direction == -1 && this.mode == 3) {
            this.mode = 0;
            this.target.zeros();
            this.pos.y = this.initialPos.y;
        }
    }
    updateLogic(event) {
        this.sprite.setFrame(this.mode, 7);
        this.attackPower = this.mode == 1 ? 10 : 5;
        if (this.mode == 2) {
            this.waitTimer -= event.tick;
            if (this.waitTimer <= 0) {
                this.mode = 3;
            }
        }
        // No "else if" here on purpose.
        if (this.mode == 3) {
            this.speed.y = RETURN_SPEED;
            this.target.y = this.speed.y;
            if (this.pos.y <= this.initialPos.y) {
                this.pos.y = this.initialPos.y;
                this.mode = 0;
                this.target.zeros();
                this.speed.zeros();
            }
        }
    }
    playerEvent(player, event) {
        const DROP_ACTIVATE_DISTANCE = 32;
        const ppos = player.getPosition();
        if (this.mode == 0 && ppos.y > this.pos.y - 8 &&
            Math.abs(this.pos.x - ppos.x) < DROP_ACTIVATE_DISTANCE) {
            this.mode = 1;
            this.target.y = DROP_GRAVITY;
        }
    }
}
