import { Enemy } from "./enemy.js";
const INITIAL_WAIT_TIME = 30;
const BASE_WAIT_TIME = 90;
const GRAVITY = 3.0;
export class Fireball extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.timer = INITIAL_WAIT_TIME;
        this.active = false;
        this.sprite.setFrame(0, 12);
        this.health = 1;
        this.attackPower = 5;
        this.dropProbability = 0.0;
        this.takeCollisions = false;
        this.canBeHurt = false;
        this.canBeMoved = false;
        this.hitbox.w = 10;
        this.hitbox.h = 10;
        this.hitbox.y = 0;
        this.target.y = 0.0;
        this.friction.y = 0.10;
    }
    updateLogic(event) {
        const ANIMATION_SPEED = 6;
        const JUMP_SPEED = -5.0;
        if (!this.active) {
            this.timer -= event.tick;
            if (this.timer <= 0) {
                this.active = true;
                this.speed.y = JUMP_SPEED;
                this.target.y = GRAVITY;
                this.flip = 2 /* Flip.Vertical */;
                // TODO: Proper fireball sound?
                event.audio.playSample(event.assets.getSample("throw"), 0.40);
            }
            this.bodyOpacity = 0.0;
            return;
        }
        if (this.speed.y > 0.0) {
            this.flip = 0 /* Flip.None */;
        }
        this.bodyOpacity = 1.0;
        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
        if (this.speed.y > 0 && this.pos.y > this.initialPos.y) {
            this.active = false;
            this.pos.y = this.initialPos.y;
            this.timer = BASE_WAIT_TIME;
            this.target.y = 0;
            this.speed.y = 0;
        }
    }
}
