import { Interactable } from "./interactable.js";
const ITEM_HINT_LOOKUP = [
    undefined,
    2,
    3,
    undefined,
    4,
    5,
    undefined,
    undefined,
    undefined,
    7,
    8,
    9,
    11,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    10
];
const ITEM_GUIDE_LOOKUP = [
    undefined,
    undefined,
    undefined,
    undefined,
    0,
    1,
    undefined,
    undefined,
    undefined,
    2,
    3,
    4,
    5
];
export class Chest extends Interactable {
    constructor(x, y, id, type, bitmap, dialogueBox, hints) {
        super(x, y, bitmap);
        this.id = 0;
        this.type = 0 /* ChestType.Unknown */;
        this.opened = false;
        this.guideID = undefined;
        this.id = id - 1;
        this.type = type;
        this.dialogueBox = dialogueBox;
        this.hints = hints;
        this.hitbox.w = 12;
        this.sprite.setFrame(Math.floor(Math.random() * 4), type - 1);
    }
    updateEvent(event) {
        const ANIMATION_SPEED = 10;
        if (this.opened) {
            // this.sprite.setFrame(4, this.type - 1);
            return;
        }
        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
    }
    playerEvent(player, event, initial) {
        if (this.opened) {
            return;
        }
        this.flip = player.getPosition().x < this.pos.x ? 0 /* Flip.None */ : 1 /* Flip.Horizontal */;
        if (initial) {
            let opened = false;
            switch (this.type) {
                case 1 /* ChestType.Treasure */:
                    opened = player.stats.hasItem(this.id);
                    break;
                case 2 /* ChestType.Health */:
                    opened = player.stats.hasObtainedHealthUp(this.id);
                    break;
                case 3 /* ChestType.Bullets */:
                    opened = player.stats.hasObtainedAmmoUp(this.id);
                    break;
                case 4 /* ChestType.DreamOrb */:
                    opened = player.stats.hasDreamOrb(this.id);
                    break;
                default:
                    break;
            }
            if (opened) {
                this.opened = true;
                this.canBeInteracted = false;
                this.sprite.setFrame(4, this.type - 1);
                if (this.type == 1 /* ChestType.Treasure */) {
                    this.guideID = ITEM_GUIDE_LOOKUP[this.id];
                    if (this.guideID !== undefined) {
                        this.cameraCheckArea.y = 128; // TODO: Make constant
                    }
                }
            }
        }
    }
    interactionEvent(player, event) {
        const OPEN_TIME = 120;
        event.audio.pauseMusic();
        event.audio.playSample(event.assets.getSample("item"), 1.0);
        this.opened = true;
        this.canBeInteracted = false;
        this.sprite.setFrame(4, this.type - 1);
        let itemID = 0;
        let itemText = [];
        switch (this.type) {
            case 1 /* ChestType.Treasure */:
                player.stats.obtainItem(this.id);
                itemID = this.id;
                itemText = event.localization?.getItem("item" + String(this.id)) ?? ["null"];
                break;
            case 2 /* ChestType.Health */:
                player.stats.obtainHealthUp(this.id);
                itemID = 16;
                itemText = event.localization?.getItem("healthup") ?? ["null"];
                break;
            case 3 /* ChestType.Bullets */:
                player.stats.obtainAmmoUp(this.id);
                itemID = 17;
                itemText = event.localization?.getItem("ammoup") ?? ["null"];
                break;
            case 4 /* ChestType.DreamOrb */:
                player.stats.obtainDreamOrb(this.id);
                itemID = 18;
                itemText = event.localization?.getItem("dreamorb") ?? ["null"];
                break;
            default:
                break;
        }
        player.startWaiting(OPEN_TIME, 1 /* WaitType.HoldingItem */, itemID, (event) => {
            this.dialogueBox.addText(itemText);
            this.dialogueBox.activate(false, null, (event) => {
                player.stats.save();
                if (this.type == 1 /* ChestType.Treasure */) {
                    const hintID = ITEM_HINT_LOOKUP[this.id];
                    if (hintID !== undefined) {
                        const textKeyboard = event.localization?.getItem("hints")?.[hintID] ?? "null";
                        const textGamepad = event.localization?.getItem("hints_gamepad")?.[hintID];
                        this.hints.activate(this.pos, textKeyboard, textGamepad);
                        // This is actually redundant now
                        // (Is it? I don't recall...)
                        player.stats.markHintAsShown(hintID);
                    }
                    this.guideID = ITEM_GUIDE_LOOKUP[this.id];
                    if (this.guideID !== undefined) {
                        this.cameraCheckArea.y = 128;
                    }
                }
                event.audio.resumeMusic();
            });
            player.setCheckpointObject(this);
        });
    }
    draw(canvas, assets) {
        if (!this.isActive() || this.bitmap === undefined) {
            return;
        }
        if (this.opened && this.guideID !== undefined) {
            const bmpGuide = assets.getBitmap("guides");
            canvas.drawBitmap(bmpGuide, 0 /* Flip.None */, this.pos.x - bmpGuide.width / 2, this.pos.y - 48, 0, this.guideID * 32, 96, 32);
        }
        this.sprite.draw(canvas, this.bitmap, this.pos.x - this.sprite.width / 2 + this.spriteOffset.x, this.pos.y - 16 + this.spriteOffset.y, this.flip);
    }
}
