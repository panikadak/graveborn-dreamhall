import { Interactable } from "./interactable.js";
export class HintTrigger extends Interactable {
    constructor(x, y, id, hints) {
        super(x, y);
        this.id = 0;
        this.id = id;
        this.hints = hints;
        this.hitbox.w = 12;
        this.hitbox.h = 256;
    }
    updateEvent(event) {
        const ANIMATION_SPEED = 10;
        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
    }
    playerEvent(player, event, initialEvent) {
        if (initialEvent) {
            if (player.stats.hasShownHint(this.id)) {
                this.exist = false;
                return;
            }
        }
    }
    playerCollisionEvent(player, event, initialCollision) {
        const textKeyboard = event.localization?.getItem("hints")?.[this.id] ?? "null";
        const textGamepad = event.localization?.getItem("hints_gamepad")?.[this.id];
        this.hints.activate(this.pos, textKeyboard, textGamepad);
        this.exist = false;
        player.stats.markHintAsShown(this.id);
    }
}
