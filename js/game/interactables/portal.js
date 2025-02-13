import { Sprite } from "../../gfx/sprite.js";
import { RGBA } from "../../math/rgba.js";
import { Vector } from "../../math/vector.js";
import { Interactable } from "./interactable.js";
export const LOCKED_HUGE_DOOR_INDEX = 3;
const REQUIRED_ORB_COUNT = 8;
// NOTE: This is basically the same class as "Door" with
// slightly different effects and such. This was writen before
// it occurred me that I could also use a *second* portal, but
// I'm also too lazy to merge this with door, so...
export class Portal extends Interactable {
    constructor(x, y, bitmap, mapTransition, dialogueBox, id, targetMap, locked = false, isSpecial = false) {
        super(x, y - 24, bitmap);
        this.id = 0;
        this.targetMap = undefined;
        this.locked = false;
        this.requirementMet = false;
        this.orbCount = 0;
        this.isSpecial = false;
        this.id = id;
        this.targetMap = targetMap;
        this.locked = locked;
        this.hitbox.y = 16;
        this.hitbox.w = 16;
        this.cameraCheckArea = new Vector(48, 64);
        this.sprite = new Sprite(32, 48);
        this.sprite.setFrame(0, isSpecial ? 2 : 0);
        this.mapTransition = mapTransition;
        if (this.locked) {
            this.sprite.setFrame(0, 1);
        }
        this.isSpecial = isSpecial;
        this.dialogueBox = dialogueBox;
    }
    updateEvent(event) {
        const ANIMATION_SPEED = 4;
        const FLICKER_SPEED = 15;
        if (this.locked) {
            if (this.requirementMet) {
                this.sprite.animate(1, 1, 2, FLICKER_SPEED, event.tick);
            }
        }
        else {
            const row = this.isSpecial ? 2 : 0;
            this.sprite.animate(row, 0, 7, ANIMATION_SPEED, event.tick);
        }
    }
    playerEvent(player, event, initialEvent) {
        if (!this.locked) {
            return;
        }
        if (this.locked && player.stats.isDoorOpen(LOCKED_HUGE_DOOR_INDEX)) {
            this.locked = false;
            return;
        }
        this.orbCount = player.stats.getOrbCount();
        this.requirementMet = this.orbCount >= REQUIRED_ORB_COUNT;
    }
    interactionEvent(player, event) {
        if (this.locked) {
            if (player.stats.getOrbCount() >= REQUIRED_ORB_COUNT) {
                this.dialogueBox.addText(event.localization?.getItem("open_huge_door") ?? ["null"]);
                player.stats.markDoorOpened(LOCKED_HUGE_DOOR_INDEX);
                this.locked = false;
                event.audio.playSample(event.assets.getSample("choose"), 0.50);
                player.setPose(2 /* Pose.UseDoor */);
                player.setPosition(this.pos.x, this.pos.y + 24, false);
            }
            else {
                this.dialogueBox.addText(event.localization?.getItem("locked_huge_door") ?? ["null"]);
                event.audio.playSample(event.assets.getSample("deny"), 0.70);
            }
            this.dialogueBox.activate();
            return;
        }
        event.audio.stopMusic();
        event.audio.playSample(event.assets.getSample("portal"), 0.70);
        player.setPosition(this.pos.x, this.pos.y + 24, false);
        player.setPose(2 /* Pose.UseDoor */);
        event.cloneCanvasToBufferTexture(true);
        event.transition.activate(true, 3 /* TransitionType.Waves */, 1.0 / 120.0, event, (event) => {
            this.mapTransition(this.targetMap ?? "coast", this.id, 3 /* Pose.EnterRoom */, true, event);
            // event.cloneCanvasToBufferTexture(true);
            player.setPose(4 /* Pose.EnterRight */);
        }, new RGBA(255, 255, 255));
    }
    postDraw(canvas, assets) {
        if (!this.locked) {
            return;
        }
        const bmpFontOutlines = assets.getBitmap("font_outlines");
        const str = `${this.orbCount}/${REQUIRED_ORB_COUNT}`;
        const dx = this.pos.x - str.length * 8;
        const dy = this.pos.y - 28;
        if (this.orbCount < REQUIRED_ORB_COUNT) {
            canvas.setColor(182, 182, 182);
        }
        canvas.drawText(bmpFontOutlines, str, dx + 11, dy, -8, 0);
        canvas.setColor();
        const bmpIcons = assets.getBitmap("icons");
        canvas.drawBitmap(bmpIcons, 0 /* Flip.None */, dx + 4, dy + 3, 32, 0, 11, 11);
    }
}
