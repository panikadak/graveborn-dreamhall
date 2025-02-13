import { Vector } from "../../math/vector.js";
import { Enemy } from "./enemy.js";
const BASE_SPEED = 0.25;
const FOLLOW_SPEED = 0.50;
export class Apple extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.initialHealth = 0;
        this.wave = 0;
        this.mode = 0;
        this.sprite.setFrame(4, 4);
        this.health = 8;
        this.initialHealth = this.health;
        this.attackPower = 3;
        this.dropProbability = 0.25;
        this.dir = 0;
        this.target.y = 0.0;
        this.wave = Math.random() * (Math.PI * 2);
        this.friction.x = 0.025;
        this.friction.y = 0.025;
        this.ignoreBottomLayer = true;
        this.knockbackFactor = 0.75;
        this.coinTypeWeights[0] = 0.90;
        this.coinTypeWeights[1] = 0.10;
    }
    wallCollisionEvent(direction, event) {
        this.dir = -direction;
        this.target.x = BASE_SPEED * this.dir;
        this.speed.x = this.target.x;
    }
    slopeCollisionEvent(direction, event) {
        const slopeDir = Math.sign(this.steepnessFactor);
        if (slopeDir == 0) {
            return;
        }
        this.wallCollisionEvent(-slopeDir, event);
    }
    updateLogic(event) {
        const ANIMATION_SPEED = 6;
        const WAVE_SPEED = Math.PI * 2 / 90.0;
        const AMPLITUDE = 4.0;
        this.sprite.animate(this.sprite.getRow(), this.mode * 4, this.mode * 4 + 3, ANIMATION_SPEED, event.tick);
        if (this.mode == 0) {
            this.target.x = BASE_SPEED * this.dir;
            // this.speed.x = this.target.x;
            this.wave = (this.wave + WAVE_SPEED * event.tick) % (Math.PI * 2);
            this.pos.y = this.initialPos.y + Math.sin(this.wave) * AMPLITUDE;
            this.flip = this.target.x > 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
            if (this.health != this.initialHealth) {
                this.mode = 1;
            }
        }
    }
    enemyCollisionEvent(enemy, event) {
        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;
        this.target.x = BASE_SPEED * this.dir;
        this.speed.x = this.target.x;
    }
    playerEvent(player, event) {
        const FOLLOW_DISTANCE = 64;
        const ppos = player.getPosition();
        if (this.mode == 1) {
            const dir = Vector.direction(this.pos, ppos);
            this.flip = ppos.x > this.pos.x ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
            if (this.hurtTimer > 0) {
                this.target.zeros();
                return;
            }
            this.target.x = dir.x * FOLLOW_SPEED;
            this.target.y = dir.y * FOLLOW_SPEED;
            return;
        }
        if (Vector.distance(this.pos, ppos) < FOLLOW_DISTANCE) {
            this.mode = 1;
            return;
        }
        if (this.dir == 0) {
            this.dir = Math.sign(player.getPosition().x - this.pos.x);
        }
    }
}
