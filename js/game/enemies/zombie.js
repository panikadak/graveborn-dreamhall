import { Enemy } from "./enemy.js";
const BASE_SPEED = 0.25;
export class Zombie extends Enemy {
    constructor(x, y) {
        super(x, y + 1);
        this.initialHealth = 0;
        this.risenUp = false;
        this.rising = false;
        this.sprite.setFrame(4, 3);
        this.health = 6;
        this.initialHealth = this.health;
        this.attackPower = 2;
        this.dropProbability = 0.15;
        this.friction.x = 0.05;
        this.dir = -1;
    }
    wallCollisionEvent(direction, event) {
        this.dir = -direction;
        this.target.x = BASE_SPEED * this.dir;
        this.speed.x = this.target.x;
    }
    updateLogic(event) {
        const ANIMATION_SPEED = 8;
        const RISE_SPEED = 8;
        this.knockbackFactor = this.risenUp ? 1.0 : 0.0;
        if (!this.risenUp) {
            if (this.health != this.initialHealth) {
                this.rising = true;
            }
            if (this.rising) {
                this.sprite.animate(this.sprite.getRow(), 4, 7, RISE_SPEED, event.tick);
                if (this.sprite.getColumn() == 7) {
                    this.sprite.setFrame(0, this.sprite.getRow());
                    this.rising = false;
                    this.risenUp = true;
                    this.target.x = BASE_SPEED * this.dir;
                    this.speed.x = this.target.x;
                }
            }
            return;
        }
        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
        this.flip = this.dir > 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        this.target.x = this.computeSlopeSpeedFactor() * BASE_SPEED * this.dir;
        // this.speed.x = this.target.x;
    }
    enemyCollisionEvent(enemy, event) {
        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;
        this.target.x = BASE_SPEED * this.dir;
        this.speed.x = this.target.x;
    }
    playerEvent(player, event) {
        const ACTIVATION_DISTANCE = 96;
        if (this.risenUp || this.rising) {
            return;
        }
        const xpos = player.getPosition().x;
        const onRight = xpos > this.pos.x;
        this.flip = onRight ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        this.dir = onRight ? 1 : -1;
        if (Math.abs(this.pos.x - xpos) < ACTIVATION_DISTANCE) {
            this.rising = true;
        }
    }
}
