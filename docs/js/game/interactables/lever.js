import { Interactable } from "./interactable.js";
export class Lever extends Interactable {
    constructor(x, y, id, bitmap, dialogueBox) {
        super(x, y, bitmap);
        this.id = 0;
        this.pulled = false;
        this.id = id;
        this.dialogueBox = dialogueBox;
        this.hitbox.w = 12;
    }
    updateEvent(event) {
        // ...
    }
    playerEvent(player, event, initial) {
        if (this.pulled) {
            return;
        }
        if (initial) {
            this.pulled = player.stats.hasPulledLever(this.id);
            if (this.pulled) {
                this.canBeInteracted = false;
                this.sprite.setFrame(1, 0);
            }
        }
    }
    interactionEvent(player, event) {
        const PULL_TIME = 60;
        event.audio.pauseMusic();
        event.audio.playSample(event.assets.getSample("lever"), 0.70);
        this.pulled = true;
        this.canBeInteracted = false;
        this.sprite.setFrame(1, 0);
        const messageID = this.id == 5 ? 2 : 1;
        const itemText = event.localization?.getItem(`lever${messageID}`) ?? ["null"];
        player.stats.markLeverPulled(this.id);
        player.startWaiting(PULL_TIME, 3 /* WaitType.ToggleLever */, 0, (event) => {
            this.dialogueBox.addText(itemText);
            this.dialogueBox.activate(false, null, (event) => {
                player.stats.save();
                event.audio.resumeMusic();
            });
            player.setCheckpointObject(this);
        });
    }
}
