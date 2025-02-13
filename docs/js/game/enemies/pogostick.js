import { Enemy } from "./enemy.js";
const GRAVITY = 4.0;
const MOVE_SPEED = 0.6;
export class PogoStick extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.sprite.setFrame(7, 3);
        this.health = 8;
        this.attackPower = 4;
        this.dropProbability = 0.40;
        this.knockbackFactor = 0.75;
        this.friction.x = 0.025;
        this.friction.y = 0.075;
        this.target.y = GRAVITY;
        this.bounceFactor.x = 1.0;
        this.collisionBox.w = 8;
        this.collisionBox.h = 14;
        this.hitbox.w = 8;
        this.coinTypeWeights[0] = 0.80;
        this.coinTypeWeights[1] = 0.20;
    }
    updateLogic(event) {
        const JUMP_HEIGHT = -2.5;
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
}
