import { Sprite } from "../../gfx/sprite.js";
import { Interactable } from "./interactable.js";
export class Switch extends Interactable {
    constructor(x, y, stage, id, active, bitmap) {
        super(x, y, bitmap);
        this.id = 0;
        this.active = true;
        this.initialActivationState = true;
        this.sprite = new Sprite(24, 24);
        this.sprite.setFrame(id, Number(!active));
        this.id = id;
        this.active = active;
        this.initialActivationState = active;
        this.stage = stage;
        // this.spriteOffset.y = -8;
    }
    updateEvent(event) {
        this.active = this.stage.getSwitchState(this.id) != this.initialActivationState;
        this.sprite.setFrame(this.id, Number(!this.active));
    }
    playerEvent(player, event, initial) {
        // TODO: Perhaps extend "Spring" to avoid duplicate code?
        const SPEED_EPS = -0.5;
        const JUMP_SPEED = -2.75;
        const WIDTH = 16;
        const COLLISION_Y = 6;
        const NEAR_MARGIN = 2;
        const FAR_MARGIN = 8;
        if (!this.active) {
            return;
        }
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
        // TODO: Play "toggle" sound
        event.audio.playSample(event.assets.getSample("lever"), 0.50);
        this.sprite.setFrame(this.sprite.getColumn(), 1);
        this.active = false;
        this.stage.toggleSwitch(this.id);
    }
}
