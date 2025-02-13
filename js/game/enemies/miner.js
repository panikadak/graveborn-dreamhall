import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";
const THROW_TIME = 75;
export class Miner extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.throwTimer = 0;
        this.sprite.setFrame(4, 10);
        this.health = 7;
        this.attackPower = 2;
        this.dropProbability = 0.35;
        this.collisionBox.w = 10;
        this.hitbox.h = 14;
        this.hitbox.y = 0;
        this.throwTimer = Math.floor(x / TILE_WIDTH) % 2 == 0 ? Math.floor(THROW_TIME / 2) : THROW_TIME;
        this.coinTypeWeights[0] = 0.70;
        this.coinTypeWeights[1] = 0.30;
    }
    updateLogic(event) {
        const BASE_THROW_ANIMATION_SPEED = 4;
        const FINAL_FRAME_DURATION = 16;
        const THROW_SPEED_X = 1.25;
        const THROW_SPEED_Y = -2.75;
        if (this.sprite.getColumn() != 4) {
            this.sprite.animate(this.sprite.getRow(), 4, 8, this.sprite.getColumn() != 7 ? BASE_THROW_ANIMATION_SPEED : FINAL_FRAME_DURATION, event.tick);
            if (this.sprite.getColumn() == 8) {
                this.sprite.setFrame(4, 10);
            }
        }
        else {
            this.throwTimer -= event.tick;
            if (this.throwTimer <= 0) {
                this.throwTimer += THROW_TIME;
                this.projectiles?.next().spawn(this.pos.x, this.pos.y - 4, this.pos.x + this.dir * 8, this.pos.y, THROW_SPEED_X * this.dir, THROW_SPEED_Y, 5, 4, false, undefined, undefined, undefined, true);
                this.sprite.setFrame(5, 10);
                event.audio.playSample(event.assets.getSample("throw"), 0.50);
            }
        }
    }
    playerEvent(player, event) {
        this.dir = player.getPosition().x > this.pos.x ? 1 : -1;
        if (this.sprite.getColumn() == 4) {
            this.flip = this.dir > 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        }
    }
}
