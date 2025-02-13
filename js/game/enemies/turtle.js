import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";
const BASE_SPEED = 0.25;
export class Turtle extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.sprite.setFrame(0, 2);
        this.health = 8;
        this.attackPower = 3;
        this.dropProbability = 0.33;
        this.dir = (Math.floor(x / TILE_WIDTH) % 2) == 0 ? 1 : -1;
        this.collisionBox.w = 8;
        this.knockbackFactor = 1.25;
    }
    wallCollisionEvent(direction, event) {
        this.dir = -direction;
        this.target.x = BASE_SPEED * this.dir;
        this.speed.x = this.target.x;
    }
    updateLogic(event) {
        const ANIMATION_SPEED = 6;
        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
        if (this.hurtTimer <= 0 && !this.touchSurface && this.didTouchSurface) {
            this.dir = -this.dir;
            this.pos.x += BASE_SPEED * this.dir;
            this.pos.y = this.oldPos.y;
            this.speed.x = BASE_SPEED * this.dir;
        }
        this.flip = this.dir > 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        this.target.x = this.computeSlopeSpeedFactor() * BASE_SPEED * this.dir;
        // this.speed.x = this.target.x;
    }
    enemyCollisionEvent(enemy, event) {
        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;
        this.target.x = BASE_SPEED * this.dir;
        this.speed.x = this.target.x;
    }
}
