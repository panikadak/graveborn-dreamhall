import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";
const BASE_SPEED = 0.5;
const ANIMATION_SPEED = [30, 8];
export class Caterpillar extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.sprite.setFrame(4, 2);
        this.health = 1;
        this.attackPower = 2;
        this.dropProbability = 0.10;
        this.dir = (Math.floor(x / TILE_WIDTH) % 2) == 0 ? 1 : -1;
        this.collisionBox.w = 8;
        this.friction.x = 0.1;
    }
    wallCollisionEvent(direction, event) {
        this.dir = -direction;
        this.target.x = BASE_SPEED * this.dir;
        this.speed.x = this.target.x;
    }
    updateLogic(event) {
        if (!this.touchSurface) {
            this.target.x = 0;
        }
        else {
            const speedMod = this.sprite.getColumn() % 2;
            this.target.x = this.computeSlopeSpeedFactor() * BASE_SPEED * this.dir * speedMod;
            this.sprite.animate(this.sprite.getRow(), 4, 7, ANIMATION_SPEED[this.sprite.getColumn() % 2], event.tick);
        }
        this.flip = this.dir > 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
    }
    enemyCollisionEvent(enemy, event) {
        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;
        // this.target.x = BASE_SPEED*this.dir;
        // this.speed.x = this.target.x;
    }
}
