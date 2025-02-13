import { Sprite } from "../../gfx/sprite.js";
import { Interactable } from "./interactable.js";
const DEATH_TIME = 60;
export class FinalBossTrigger extends Interactable {
    constructor(x, y, textbox, confirmationBox, triggerEvent) {
        super(x, y, undefined);
        this.wave = 0;
        this.deathTimer = 0;
        this.hitbox.w = 32;
        this.cameraCheckArea.x = 64;
        this.cameraCheckArea.y = 64;
        this.textbox = textbox;
        this.confirmationBox = confirmationBox;
        this.triggerEvent = triggerEvent;
        this.sprite = new Sprite(32, 32);
    }
    startHug(player, event) {
        player.setPosition(this.pos.x, this.pos.y);
        // TODO: This ain't no hugging
        // (eh, close enough. In practice there is barely
        //  any difference anyway)
        event.audio.playSample(event.assets.getSample("lick"), 0.60);
        this.confirmationBox.deactivate();
        player.startWaiting(90, 5 /* WaitType.Hugging */, undefined, (event) => {
            this.dying = true;
            this.triggerEvent();
        });
    }
    die(event) {
        this.deathTimer += event.tick;
        return this.deathTimer >= DEATH_TIME;
    }
    updateEvent(event) {
        const WAVE_SPEED = Math.PI * 2 / 90.0;
        const FRAME_TIME = 6;
        this.wave = (this.wave + WAVE_SPEED * event.tick) % (Math.PI * 2);
        this.sprite.animate(0, 0, 3, FRAME_TIME, event.tick);
    }
    playerEvent(player, event, initial) {
        // ...
    }
    interactionEvent(player, event) {
        if (player.stats.hasTemporaryFlag("hugged")) {
            this.startHug(player, event);
            return;
        }
        event.audio.playSample(event.assets.getSample("select"), 0.40);
        this.textbox.addText(event.localization?.getItem("spirit_prelude") ?? ["null"]);
        this.textbox.activate(false, null, (event) => {
            player.setCheckpointObject(this);
            this.confirmationBox.activate(1, undefined, (event) => {
                player.stats.setTemporaryFlag("hugged");
                this.startHug(player, event);
            });
        });
    }
    draw(canvas, assets) {
        const AMPLITUDE = 2;
        const YOFF = 26;
        if (!this.exist || !this.inCamera) {
            return;
        }
        const bmpSpirit = assets.getBitmap("spirit");
        const dx = this.pos.x - 16;
        const dy = this.pos.y - YOFF + Math.round(Math.sin(this.wave) * AMPLITUDE);
        if (this.dying) {
            const t = this.deathTimer / DEATH_TIME;
            canvas.setColor(255, 255, 255, 1.0 - t);
            canvas.drawFunnilyAppearingBitmap(bmpSpirit, 0 /* Flip.None */, dx, dy, 0, 0, 32, 32, t, 48, 4, 4);
            canvas.setColor();
            return;
        }
        // Body
        this.sprite.draw(canvas, bmpSpirit, dx, dy);
        // Eyes
        canvas.drawBitmap(bmpSpirit, 0 /* Flip.None */, dx, dy, 128, 0, 32, 32);
    }
}
