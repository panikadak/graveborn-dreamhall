import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { Interactable } from "./interactable.js";
const LIFT_TIME = 30;
const LIFT_AMOUNT = 6;
const TEXT_TIME = 60;
const TEXT_STOP_TIME = 45;
export class Checkpoint extends Interactable {
    constructor(x, y, bitmap) {
        super(x, y + 1, bitmap);
        this.activated = false;
        this.liftTimer = 0.0;
        this.initialY = 0.0;
        this.waveTimer = 0.0;
        this.orbitalTimer = 0.0;
        this.textTimer = 0;
        this.initialY = this.pos.y;
        this.hitbox = new Rectangle(0, -16, 16, 32);
        // Large area to ensure that the "Checkpoint!" text stays visible
        this.cameraCheckArea = new Vector(128, 128);
    }
    drawOrbital(canvas, id, behind = false) {
        const H_RADIUS = 12;
        const V_RADIUS = 6;
        if (!this.activated) {
            return;
        }
        const alpha = this.liftTimer / LIFT_TIME;
        const dir = id == 0 ? 1 : -1;
        const dx = this.pos.x + dir * Math.sin(this.orbitalTimer) * H_RADIUS;
        const dy = this.pos.y + Math.sin(this.orbitalTimer) * V_RADIUS;
        const sx = 56 + id * 8 + (behind ? 16 : 0);
        canvas.setAlpha(alpha);
        canvas.drawBitmap(this.bitmap, 0 /* Flip.None */, dx - 4, dy - 4, sx, 24, 8, 8);
        canvas.setAlpha();
    }
    updateEvent(event) {
        const ANIMATION_SPEED = 6;
        const WAVE_SPEED = Math.PI * 2 / 120.0;
        const AMPLITUDE = 2.0;
        if (!this.activated) {
            this.pos.y = this.initialY;
            this.sprite.setFrame(0, 0);
            return;
        }
        this.sprite.animate(0, 1, 4, ANIMATION_SPEED, event.tick);
        this.liftTimer = Math.min(LIFT_TIME, this.liftTimer + event.tick);
        if (this.liftTimer >= LIFT_TIME) {
            this.waveTimer = (this.waveTimer + WAVE_SPEED * event.tick) % (Math.PI * 2);
        }
        this.pos.y = this.initialY - (this.liftTimer / LIFT_TIME) * LIFT_AMOUNT + Math.round(Math.sin(this.waveTimer) * AMPLITUDE);
        if (this.textTimer > 0) {
            this.textTimer -= event.tick;
        }
        this.orbitalTimer = (this.orbitalTimer + WAVE_SPEED * event.tick) % (Math.PI * 2);
    }
    playerCollisionEvent(player, event, initial) {
        if (this.activated) {
            return;
        }
        player.setCheckpointObject(this, new Vector(0, -1));
        this.activated = true;
        if (initial) {
            this.sprite.setFrame(1, 0);
            this.liftTimer = LIFT_TIME;
            this.orbitalTimer = Math.PI / 2;
            this.textTimer = 0;
            this.pos.y = this.initialY - (this.liftTimer / LIFT_TIME) * LIFT_AMOUNT;
            return;
        }
        this.liftTimer = 0;
        this.textTimer = TEXT_TIME;
        player.stats.save();
        event.audio.playSample(event.assets.getSample("checkpoint"), 0.80);
    }
    playerEvent(player, event) {
        if (!this.activated) {
            return;
        }
        if (!player.isCheckpointObject(this)) {
            this.activated = false;
            this.textTimer = 0;
            this.liftTimer = 0;
            this.waveTimer = 0;
            this.orbitalTimer = 0;
            this.sprite.setFrame(0, 0);
        }
    }
    draw(canvas) {
        if (!this.isActive() || this.bitmap === undefined) {
            return;
        }
        const firstPhase = this.orbitalTimer >= Math.PI + Math.PI / 2 || this.orbitalTimer < Math.PI / 2;
        if (firstPhase) {
            this.drawOrbital(canvas, 0, true);
        }
        if (!firstPhase) {
            this.drawOrbital(canvas, 1, true);
        }
        this.sprite.draw(canvas, this.bitmap, this.pos.x - 12, this.pos.y - 12, this.flip);
        if (!firstPhase) {
            this.drawOrbital(canvas, 0);
        }
        if (firstPhase) {
            this.drawOrbital(canvas, 1);
        }
    }
    postDraw(canvas) {
        const TEXT_TARGET_Y = -24;
        if (!this.isActive() || this.bitmap === undefined || this.textTimer <= 0) {
            return;
        }
        const dy = this.initialY - 16 +
            TEXT_TARGET_Y * (1.0 - Math.max(0, (this.textTimer - TEXT_STOP_TIME) / (TEXT_TIME - TEXT_STOP_TIME)));
        canvas.drawBitmap(this.bitmap, 0 /* Flip.None */, this.pos.x - 24, dy, 0, 24, 48, 8);
    }
}
