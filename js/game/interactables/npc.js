import { Interactable } from "./interactable.js";
export class NPC extends Interactable {
    constructor(x, y, id, bodyType, bitmap, dialogueBox) {
        super(x, y, bitmap);
        this.id = 0;
        this.id = id - 1;
        this.dialogueBox = dialogueBox;
        this.hitbox.w = 12;
        this.sprite.setFrame(Math.floor(Math.random() * 4), bodyType);
    }
    updateEvent(event) {
        const ANIMATION_SPEED = 10;
        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
    }
    playerEvent(player, event) {
        this.flip = player.getPosition().x < this.pos.x ? 0 /* Flip.None */ : 1 /* Flip.Horizontal */;
    }
    interactionEvent(player, event) {
        const text = event.localization?.getItem("npc" + String(this.id)) ?? ["null"];
        this.dialogueBox.addText(text);
        this.dialogueBox.activate(false, this.sprite.getRow());
        // TODO: Maybe a better sound effect?
        event.audio.playSample(event.assets.getSample("select"), 0.40);
    }
}
