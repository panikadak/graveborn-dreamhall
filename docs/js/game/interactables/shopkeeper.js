import { Sprite } from "../../gfx/sprite.js";
import { Interactable } from "./interactable.js";
export class Shopkeeper extends Interactable {
    constructor(x, y, shop, bitmap, id = 0) {
        super(x, y - 32, bitmap);
        this.hitbox.w = 24;
        this.hitbox.y = 32;
        this.shop = shop;
        this.sprite = new Sprite(32, 48);
        this.sprite.setFrame(0, id);
    }
    updateEvent(event) {
        const ANIMATION_SPEED = 10;
        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
    }
    playerEvent(player, event) {
        this.flip = player.getPosition().x < this.pos.x ? 0 /* Flip.None */ : 1 /* Flip.Horizontal */;
    }
    interactionEvent(player, event) {
        event.audio.playSample(event.assets.getSample("select"), 0.40);
        this.shop.activate(player.stats);
    }
}
