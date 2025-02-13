import { Sprite } from "../../gfx/sprite.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";
const JUMP_TIME = 30;
const GRAVITY = 3.0;
const MOVE_SPEED = 0.75;
const SHOOT_TIME = 15;
export class Orb extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.jumpTimer = 0;
        this.shootTimer = 0;
        this.sprite.setFrame(0, 13);
        this.health = 10;
        this.attackPower = 4;
        this.dropProbability = 0.60;
        this.knockbackFactor = 1.5;
        this.friction.x = 0.15;
        this.friction.y = 0.075;
        this.target.y = GRAVITY;
        this.bounceFactor.x = 1.0;
        this.collisionBox.w = 8;
        this.jumpTimer = Math.floor(x / TILE_WIDTH) % 2 == 0 ? JUMP_TIME / 2 : JUMP_TIME;
        this.coinTypeWeights[0] = 0.30;
        this.coinTypeWeights[1] = 0.70;
        this.flameSprite = new Sprite(24, 24);
        this.flameSprite.setFrame(4, 12);
        this.immuneToLava = true;
        // To make sure jumping won't make inactive
        this.cameraCheckArea.y = 80;
    }
    updateLogic(event) {
        const JUMP_HEIGHT = -3.0;
        const FRAME_EPS = 0.5;
        const FLAME_FRAME_LENGTH = 6;
        const FLAME_PROJECTILE_SPEED = 1.0;
        const INITIAL_SHOOT_TIME = -10;
        //const ANIMATION_SPEED : number = 8;
        // this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
        if (this.touchSurface) {
            this.target.x = 0;
            this.jumpTimer -= event.tick;
            if (this.jumpTimer <= 0) {
                this.jumpTimer = JUMP_TIME;
                this.shootTimer = INITIAL_SHOOT_TIME;
                this.speed.y = JUMP_HEIGHT;
                this.speed.x = MOVE_SPEED * this.dir;
                event.audio.playSample(event.assets.getSample("jump2"), 0.30);
            }
            this.sprite.setFrame(0, 13);
        }
        else {
            this.target.x = MOVE_SPEED * this.dir;
            let frame = 0;
            if (this.speed.y < -FRAME_EPS) {
                frame = 1;
            }
            else if (this.speed.y > FRAME_EPS) {
                frame = 2;
            }
            this.sprite.setFrame(frame, 13);
            if (this.speed.y < FRAME_EPS) {
                this.shootTimer += event.tick;
                if (this.shootTimer >= SHOOT_TIME) {
                    this.projectiles.next().spawn(this.pos.x, this.pos.y, this.pos.x, this.pos.y + 8, 0, Math.max(0, this.speed.y) + FLAME_PROJECTILE_SPEED, 6, 3, false, -1, undefined, 0.0, false, true);
                    this.shootTimer = 0;
                    event.audio.playSample(event.assets.getSample("throw"), 0.40);
                }
            }
        }
        this.flameSprite.animate(this.flameSprite.getRow(), 4, 7, FLAME_FRAME_LENGTH, event.tick);
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
    draw(canvas, assets, bmp) {
        if (!this.exist || !this.inCamera) {
            return;
        }
        // Flicker if hurt
        if (!this.dying && this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer / 4) % 2 != 0) {
            return;
        }
        const dx = this.pos.x - this.sprite.width / 2;
        const dy = this.pos.y - this.sprite.height / 2;
        if (!this.dying) {
            this.flameSprite.draw(canvas, bmp, dx, dy - 1, this.flip);
        }
        this.sprite.draw(canvas, bmp, dx, dy, this.flip);
    }
}
