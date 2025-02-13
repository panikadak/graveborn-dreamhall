import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";
const THROW_TIME = 90;
export class Doppelganger extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.throwTimer = 0;
        this.sprite.setFrame(0, 5);
        this.health = 5;
        this.attackPower = 1;
        this.dropProbability = 0.25;
        this.collisionBox.w = 10;
        this.throwTimer = Math.floor(x / TILE_WIDTH) % 2 == 0 ? THROW_TIME / 2 : THROW_TIME;
        this.coinTypeWeights[0] = 0.85;
        this.coinTypeWeights[1] = 0.15;
    }
    updateLogic(event) {
        const BASE_THROW_ANIMATION_SPEED = 4;
        const FINAL_FRAME_DURATION = 16;
        const THROW_SPEED = 2.5;
        if (this.sprite.getColumn() != 0) {
            this.sprite.animate(this.sprite.getRow(), 1, 4, this.sprite.getColumn() != 3 ? BASE_THROW_ANIMATION_SPEED : FINAL_FRAME_DURATION, event.tick);
            if (this.sprite.getColumn() == 4) {
                this.sprite.setFrame(0, 5);
            }
        }
        else {
            this.throwTimer -= event.tick;
            if (this.throwTimer <= 0) {
                this.throwTimer += THROW_TIME;
                this.projectiles?.next().spawn(this.pos.x, this.pos.y, this.pos.x + this.dir * 8, this.pos.y, THROW_SPEED * this.dir, 0.0, 2, 3, false);
                this.sprite.setFrame(1, 5);
                event.audio.playSample(event.assets.getSample("throw"), 0.50);
            }
        }
    }
    playerEvent(player, event) {
        this.dir = player.getPosition().x > this.pos.x ? 1 : -1;
        if (this.sprite.getColumn() == 0) {
            this.flip = this.dir > 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        }
    }
}
