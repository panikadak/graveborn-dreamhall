import { GameObject } from "../gameobject.js";
import { Sprite } from "../../gfx/sprite.js";
import { Vector } from "../../math/vector.js";
import { Rectangle } from "../../math/rectangle.js";
// Yes, "Interactable" is a word, I checked the
// dictionary.
export class Interactable extends GameObject {
    constructor(x, y, bitmap) {
        super(x, y, true);
        this.bitmap = undefined;
        this.flip = 0 /* Flip.None */;
        this.canBeInteracted = true;
        this.sprite = new Sprite(24, 24);
        this.spriteOffset = new Vector();
        this.cameraCheckArea = new Vector(32, 32);
        this.hitbox = new Rectangle(0, 2, 12, 12);
        this.bitmap = bitmap;
    }
    playerCollision(player, event, initial = false) {
        if (!initial && (!this.isActive() || !player.isActive())) {
            return;
        }
        this.playerEvent?.(player, event, initial);
        if (this.playerCollisionEvent !== undefined && this.overlayObject(player)) {
            this.playerCollisionEvent(player, event, initial);
        }
        if (this.canBeInteracted && player.doesTouchSurface()) {
            if (this.interactionEvent !== undefined && this.overlayObject(player)) {
                player.showIcon(1);
                if (event.input.upPress()) {
                    player.showIcon(0);
                    this.interactionEvent(player, event);
                }
            }
        }
    }
    draw(canvas, assets) {
        if (!this.isActive() || this.bitmap === undefined) {
            return;
        }
        this.sprite.draw(canvas, this.bitmap, this.pos.x - this.sprite.width / 2 + this.spriteOffset.x, this.pos.y - 16 + this.spriteOffset.y, this.flip);
    }
}
