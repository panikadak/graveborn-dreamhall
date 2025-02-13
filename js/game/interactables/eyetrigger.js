import { Interactable } from "./interactable.js";
export class EyeTrigger extends Interactable {
    constructor(x, y, confirmationBox, triggerEvent) {
        super(x, y, undefined);
        this.wave = 0;
        this.hitbox.w = 32;
        this.cameraCheckArea.x = 64;
        this.cameraCheckArea.y = 64;
        this.confirmationBox = confirmationBox;
        this.triggerEvent = triggerEvent;
    }
    updateEvent(event) {
        const WAVE_SPEED = Math.PI * 2 / 120.0;
        this.wave = (this.wave + WAVE_SPEED * event.tick) % (Math.PI * 2);
    }
    playerEvent(player, event, initial) {
        // ...
    }
    interactionEvent(player, event) {
        event.audio.playSample(event.assets.getSample("select"), 0.40);
        this.confirmationBox.activate(1, undefined, (event) => {
            player.setPosition(this.pos.x, this.pos.y);
            event.audio.playSample(event.assets.getSample("lick"), 0.60);
            this.confirmationBox.deactivate();
            player.startWaiting(90, 4 /* WaitType.Licking */, undefined, (event) => {
                this.triggerEvent();
            });
        });
    }
    draw(canvas, assets) {
        const PERIOD = 32;
        const AMPLITUDE = 2;
        if (!this.isActive()) {
            return;
        }
        const bmpEye = assets.getBitmap("eye");
        // canvas.drawBitmap(bmpEye, Flip.None, this.pos.x - 32, this.pos.y - 56, 0, 0, 64, 64);
        canvas.drawHorizontallyWavingBitmap(bmpEye, AMPLITUDE, PERIOD, this.wave, 0 /* Flip.None */, this.pos.x - 32 - Math.sin(this.wave) * AMPLITUDE, this.pos.y - 56, 0, 0, 64, 64);
    }
}
