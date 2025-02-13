import { Sprite } from "../../gfx/sprite.js";
import { Interactable } from "./interactable.js";
export class Spring extends Interactable {
    constructor(x, y, bitmap) {
        super(x, y, bitmap);
        this.sprite = new Sprite(32, 24);
        // this.spriteOffset.y = -8;
    }
    updateEvent(event) {
        const FRAME_TIME = 6.0;
        if (this.sprite.getColumn() != 0) {
            this.sprite.animate(0, 1, 4, FRAME_TIME, event.tick);
            if (this.sprite.getColumn() == 4) {
                this.sprite.setFrame(0, 0);
            }
        }
    }
    playerEvent(player, event, initial) {
        const SPEED_EPS = -0.5;
        const JUMP_SPEED = -4.75;
        const WIDTH = 24;
        const COLLISION_Y = 8;
        const NEAR_MARGIN = 2;
        const FAR_MARGIN = 8;
        const yspeed = player.getSpeed().y;
        if (yspeed < SPEED_EPS) {
            return;
        }
        const ppos = player.getPosition();
        const cbox = player.getCollisionBox();
        const bottom = ppos.y + cbox.y + cbox.h / 2;
        const left = ppos.x + cbox.x - cbox.w / 2;
        const right = left + cbox.w;
        const level = this.pos.y - COLLISION_Y;
        if (right < this.pos.x - WIDTH / 2 || left > this.pos.x + WIDTH / 2 ||
            bottom < level - NEAR_MARGIN * event.tick ||
            bottom > level + (FAR_MARGIN + Math.abs(yspeed)) * event.tick) {
            return;
        }
        player.bounce(JUMP_SPEED);
        event.audio.playSample(event.assets.getSample("jump"), 0.80);
        this.sprite.setFrame(1, 0);
    }
}
