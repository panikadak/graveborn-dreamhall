import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";
const JUMP_TIME = 45;
const GRAVITY = 3.0;
const MOVE_SPEED = 0.75;
export class Fungus extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.jumpTimer = 0;
        this.hasShot = false;
        this.shootRecover = 0;
        this.sprite.setFrame(5, 9);
        this.health = 8;
        this.attackPower = 4;
        this.dropProbability = 0.50;
        this.knockbackFactor = 1.5;
        this.friction.x = 0.15;
        this.friction.y = 0.075;
        this.target.y = GRAVITY;
        this.bounceFactor.x = 1.0;
        this.collisionBox.w = 8;
        this.jumpTimer = Math.floor(x / TILE_WIDTH) % 2 == 0 ? JUMP_TIME / 2 : JUMP_TIME;
        this.coinTypeWeights[0] = 0.60;
        this.coinTypeWeights[1] = 0.40;
    }
    shoot(event) {
        const KNOCKBACK = 1.5;
        const SHOOT_SPEED = 2.5;
        event.audio.playSample(event.assets.getSample("throw"), 0.50);
        this.speed.x = -this.dir * KNOCKBACK;
        this.target.x = 0;
        this.speed.y = 0;
        this.target.y = 0;
        this.projectiles?.next()?.spawn(this.pos.x, this.pos.y + 3, this.pos.x + this.dir * 4, this.pos.y + 3, this.dir * SHOOT_SPEED, 0.0, 3, 3, false);
        this.sprite.setFrame(7, 8);
    }
    updateLogic(event) {
        const SHOOT_RECOVER_TIME = 16;
        const JUMP_HEIGHT = -2.5;
        if (this.shootRecover > 0) {
            this.shootRecover -= event.tick;
            return;
        }
        this.target.y = GRAVITY;
        if (this.touchSurface) {
            this.target.x = 0;
            this.jumpTimer -= event.tick;
            if (this.jumpTimer <= 0) {
                this.hasShot = false;
                this.jumpTimer = JUMP_TIME;
                this.speed.y = JUMP_HEIGHT;
                this.speed.x = MOVE_SPEED * this.dir;
                event.audio.playSample(event.assets.getSample("jump2"), 0.30);
            }
            this.sprite.setFrame(5, 9);
        }
        else {
            let frame = 7;
            if (!this.hasShot) {
                frame = 6;
                this.target.x = MOVE_SPEED * this.dir;
                if (this.speed.y > 0) {
                    this.hasShot = true;
                    this.shootRecover = SHOOT_RECOVER_TIME;
                    this.shoot(event);
                    return;
                }
            }
            this.sprite.setFrame(frame, 9);
        }
    }
    playerEvent(player, event) {
        if (this.touchSurface) {
            const onRight = player.getPosition().x > this.pos.x;
            this.dir = onRight ? 1 : -1;
            this.flip = onRight ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        }
    }
    enemyCollisionEvent(enemy, event) {
        if (!this.didTouchSurface) {
            this.dir = -this.dir;
            this.speed.x = MOVE_SPEED * this.dir;
            this.flip = this.dir < 0 ? 0 /* Flip.None */ : 1 /* Flip.Horizontal */;
        }
    }
}
