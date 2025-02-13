import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { Enemy } from "./enemy.js";
export class Spook extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.wave = 0;
        this.sprite.setFrame(0, 10);
        this.health = 8;
        this.attackPower = 4;
        this.dropProbability = 0.40;
        this.dir = 0;
        this.target.y = 0.0;
        this.friction.x = 0.05;
        this.friction.y = 0.05;
        this.knockbackFactor = 0.75;
        this.coinTypeWeights[0] = 0.60;
        this.coinTypeWeights[1] = 0.40;
        this.collisionBox.w = 8;
        this.collisionBox.h = 8;
        this.hitbox.w = 12;
        this.hitbox.h = 12;
        this.overriddenHurtbox = new Rectangle(0, 0, 10, 10);
        this.takeCollisions = false;
        this.bodyOpacity = 0.75;
    }
    updateLogic(event) {
        const FRAME_LENGTH = 8;
        const WAVE_SPEED = Math.PI * 2 / 300.0;
        this.sprite.animate(this.sprite.getRow(), 0, 3, FRAME_LENGTH, event.tick);
        this.wave = (this.wave + WAVE_SPEED * event.tick) % (Math.PI * 2);
    }
    playerEvent(player, event) {
        const BASE_DISTANCE = 48;
        const FOLLOW_SPEED = 0.50;
        if (this.hurtTimer > 0) {
            this.target.zeros();
            return;
        }
        const ppos = player.getPosition();
        this.flip = ppos.x > this.pos.x ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        ppos.x += Math.sin(this.wave) * BASE_DISTANCE;
        ppos.y += Math.cos(this.wave) * BASE_DISTANCE;
        const dir = Vector.direction(this.pos, ppos);
        this.target.x = dir.x * FOLLOW_SPEED;
        this.target.y = dir.y * FOLLOW_SPEED;
    }
}
