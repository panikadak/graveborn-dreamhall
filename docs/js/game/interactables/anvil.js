import { Interactable } from "./interactable.js";
const ANVIL_HINT = 12;
export class Anvil extends Interactable {
    constructor(x, y, dialogueBox, hints) {
        super(x, y, undefined);
        this.shine = 0;
        this.chunkPlaced = false;
        this.swordCreated = false;
        this.swordObtained = false;
        this.hitbox.w = 32;
        this.cameraCheckArea.x = 64;
        this.cameraCheckArea.y = 64;
        this.dialogueBox = dialogueBox;
        this.hints = hints;
    }
    obtainSword(player, event) {
        const HOLD_TIME = 120;
        const itemText = event.localization?.getItem(`item${13 /* Item.PowerfulSword */}`) ?? ["null"];
        event.audio.pauseMusic();
        event.audio.playSample(event.assets.getSample("item"), 1.0);
        player.startWaiting(HOLD_TIME, 1 /* WaitType.HoldingItem */, 13 /* Item.PowerfulSword */, (event) => {
            this.dialogueBox.addText(itemText);
            this.dialogueBox.activate(false, null, (event) => {
                player.setCheckpointObject(this);
                player.stats.obtainItem(13 /* Item.PowerfulSword */);
                player.stats.save();
                event.audio.resumeMusic();
            });
            const textKeyboard = event.localization?.getItem("hints")?.[ANVIL_HINT] ?? "null";
            const textGamepad = event.localization?.getItem("hints_gamepad")?.[ANVIL_HINT];
            this.hints.activate(this.pos, textKeyboard, textGamepad);
        });
    }
    updateEvent(event) {
        const SHINE_SPEED = Math.PI * 2 / 120.0;
        if (this.swordObtained) {
            this.shine = 0.0;
            return;
        }
        this.shine = (this.shine + SHINE_SPEED * event.tick) % (Math.PI * 2);
    }
    playerEvent(player, event, initial) {
        if (initial) {
            this.swordObtained = player.stats.hasItem(13 /* Item.PowerfulSword */);
            this.canBeInteracted = !this.swordObtained;
            return;
        }
        if (this.swordCreated && !this.swordObtained) {
            this.obtainSword(player, event);
            this.swordObtained = true;
        }
    }
    interactionEvent(player, event) {
        if (!player.stats.hasItem(20 /* Item.ObsidianChunk */)) {
            this.dialogueBox.addText(event.localization?.getItem("anvil_reject") ?? ["null"]);
            this.dialogueBox.activate();
            event.audio.playSample(event.assets.getSample("deny"), 0.70);
            return;
        }
        event.audio.playSample(event.assets.getSample("select"), 0.40);
        player.setPosition(this.pos.x, this.pos.y);
        player.setPose(6 /* Pose.Use */);
        this.chunkPlaced = true;
        this.dialogueBox.addText(event.localization?.getItem("anvil_accept") ?? ["null"]);
        this.dialogueBox.activate(false, null, (event) => {
            event.audio.playSample(event.assets.getSample("hammer"), 0.60);
            event.transition.activate(true, 1 /* TransitionType.Fade */, 1.0 / 30.0, event, (event) => {
                this.chunkPlaced = false;
                this.swordCreated = true;
                this.canBeInteracted = false;
            });
        });
    }
    draw(canvas, assets) {
        if (!this.isActive()) {
            return;
        }
        const bmpAnvil = assets.getBitmap("anvil");
        const dx = this.pos.x - 18;
        const dy = this.pos.y - 9;
        // Anvil
        const totalShine = 255 * (1.0 + 0.5 * Math.abs(Math.sin(this.shine)));
        canvas.setColor(totalShine, totalShine, totalShine);
        canvas.drawBitmap(bmpAnvil, 0 /* Flip.None */, dx, dy, 0, 14, 32, 18);
        canvas.setColor();
        // Hammer
        canvas.drawBitmap(bmpAnvil, 0 /* Flip.None */, dx + 8, dy - 10, 0, 0, 32, 14);
        if (this.chunkPlaced) {
            const bmpItemIcons = assets.getBitmap("item_icons");
            canvas.drawBitmap(bmpItemIcons, 0 /* Flip.None */, dx + 10, dy - 14, 64, 16, 16, 16);
        }
    }
}
