import { Vector } from "../../math/vector.js";
import { Interactable } from "./interactable.js";
export class Door extends Interactable {
    constructor(x, y, id, targetMap, mapTransition, dialogueBox, requiredKey = undefined, requireMinibossDefeat = false, bmp = undefined) {
        super(x, y, bmp);
        this.targetMap = undefined;
        this.id = 0;
        this.requiredKey = undefined;
        this.opened = true;
        this.requireMinibossDefeat = false;
        this.id = id;
        this.requiredKey = requiredKey;
        this.opened = requiredKey === undefined;
        // this.hitbox.y = 12;
        this.hitbox.w = 8;
        this.cameraCheckArea = new Vector(32, 32);
        this.dialogueBox = dialogueBox;
        this.mapTransition = mapTransition;
        this.targetMap = targetMap;
        this.requireMinibossDefeat = requireMinibossDefeat;
    }
    playerEvent(player, event, initialEvent) {
        if (!initialEvent) {
            return;
        }
        if (this.requireMinibossDefeat) {
            this.opened = !player.stats.hasDefeatedMiniboss();
            if (!this.opened) {
                this.canBeInteracted = false;
            }
        }
        else if (this.requiredKey !== undefined) {
            this.opened = player.stats.isDoorOpen(this.requiredKey);
        }
        if (initialEvent && this.opened) {
            this.sprite.setFrame(0, 0);
        }
    }
    interactionEvent(player, event) {
        if (this.requiredKey !== undefined && !this.opened) {
            const colors = event.localization?.getItem("door_colors");
            if ((this.requiredKey != 4 && player.stats.hasItem(6 /* Item.RedKey */ + this.requiredKey)) ||
                (this.requiredKey == 4 && player.stats.hasItem(15 /* Item.PlatinumKey */))) {
                this.dialogueBox.addText(event.localization?.getItem("open_door") ?? ["null"], [[colors[this.requiredKey] ?? "null"]]);
                player.stats.markDoorOpened(this.requiredKey);
                this.opened = true;
                event.audio.playSample(event.assets.getSample("choose"), 0.50);
                player.setPose(2 /* Pose.UseDoor */);
                player.setPosition(this.pos.x, this.pos.y, false);
            }
            else {
                this.dialogueBox.addText(event.localization?.getItem("locked") ?? ["null"], [[colors[this.requiredKey] ?? "null"]]);
                event.audio.playSample(event.assets.getSample("deny"), 0.70);
            }
            this.dialogueBox.activate();
            return;
        }
        event.audio.pauseMusic();
        event.audio.playSample(event.assets.getSample("transition"), 0.70);
        player.setPosition(this.pos.x, this.pos.y, false);
        player.setPose(2 /* Pose.UseDoor */);
        event.cloneCanvasToBufferTexture(true);
        event.transition.activate(true, 1 /* TransitionType.Fade */, 1.0 / 20.0, event, (event) => {
            this.mapTransition(this.targetMap ?? "coast", this.id, 3 /* Pose.EnterRoom */, true, event);
        });
    }
    draw(canvas, assets) {
        if (!this.isActive() || this.opened || this.bitmap === undefined) {
            return;
        }
        let id = this.requiredKey ?? 0;
        if (this.requireMinibossDefeat) {
            id = 3;
        }
        canvas.drawBitmap(this.bitmap, 0 /* Flip.None */, this.pos.x - 8, this.pos.y - 24, id * 16, 0, 16, 32);
    }
}
