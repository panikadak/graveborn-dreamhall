import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";
const JUMP_TIME = 30;
const GRAVITY = 3.0;
const MOVE_SPEED = 0.5;
export class Mushroom extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.jumpTimer = 0;
        this.sprite.setFrame(4, 0);
        this.health = 7;
        this.attackPower = 3;
        this.dropProbability = 0.33;
        this.knockbackFactor = 1.5;
        this.friction.x = 0.15;
        this.friction.y = 0.075;
        this.target.y = GRAVITY;
        this.bounceFactor.x = 1.0;
        this.collisionBox.w = 8;
        this.jumpTimer = Math.floor(x / TILE_WIDTH) % 2 == 0 ? JUMP_TIME / 2 : JUMP_TIME;
        this.coinTypeWeights[0] = 0.90;
        this.coinTypeWeights[1] = 0.10;
    }
    updateLogic(event) {
        const JUMP_HEIGHT = -2.0;
        const FRAME_EPS = 0.5;
        //const ANIMATION_SPEED : number = 8;
        // this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
        if (this.touchSurface) {
            this.target.x = 0;
            this.jumpTimer -= event.tick;
            if (this.jumpTimer <= 0) {
                this.jumpTimer = JUMP_TIME;
                this.speed.y = JUMP_HEIGHT;
                this.speed.x = MOVE_SPEED * this.dir;
                event.audio.playSample(event.assets.getSample("jump2"), 0.30);
            }
            this.sprite.setFrame(4, 0);
        }
        else {
            this.target.x = MOVE_SPEED * this.dir;
            let frame = 4;
            if (this.speed.y < -FRAME_EPS) {
                frame = 5;
            }
            else if (this.speed.y > FRAME_EPS) {
                frame = 6;
            }
            this.sprite.setFrame(frame, 0);
        }
    }
    playerEvent(player, event) {
        if (this.touchSurface) {
            const onRight = player.getPosition().x > this.pos.x;
            this.dir = onRight ? 1 : -1;
            this.flip = onRight ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        }
    }
    wallCollisionEvent(direction, event) {
        this.dir = -direction;
        if (!this.didTouchSurface) {
            this.speed.x = MOVE_SPEED * this.dir;
            this.flip = direction > 0 ? 0 /* Flip.None */ : 1 /* Flip.Horizontal */;
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
