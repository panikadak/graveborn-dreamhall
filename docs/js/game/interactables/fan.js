import { Sprite } from "../../gfx/sprite.js";
import { negMod } from "../../math/utility.js";
import { Interactable } from "./interactable.js";
const DIRX = [0, 1, 0, -1];
const DIRY = [-1, 0, 1, 0];
// I'm lazy
const FAN_LEVER = 5;
// There are only fans here
export class Fan extends Interactable {
    constructor(x, y, bitmap, direction) {
        super(x, y, bitmap);
        this.activated = false;
        this.windTimer = 0.0;
        this.sprite = new Sprite(24, 24);
        this.direction = negMod(Math.floor(direction), 4);
        this.computeHitbox();
        this.cameraCheckArea.x = 128;
        this.cameraCheckArea.y = 128;
    }
    computeHitbox() {
        const WIDTH = 16;
        const HEIGHT = 72;
        if (this.direction % 2 == 0) {
            this.hitbox.w = WIDTH;
            this.hitbox.h = HEIGHT;
            this.hitbox.y = -HEIGHT / 2;
            if (this.direction == 2) {
                this.hitbox.y *= -1;
            }
            return;
        }
        this.hitbox.h = WIDTH;
        this.hitbox.w = HEIGHT;
        this.hitbox.x = HEIGHT / 2;
        if (this.direction == 3) {
            this.hitbox.x *= -1;
        }
    }
    updateEvent(event) {
        const FRAME_TIME = 3.0;
        const WIND_SPEED = 1.0 / 8.0;
        if (this.activated) {
            this.sprite.animate(0, 0, 3, FRAME_TIME, event.tick);
            this.windTimer = (this.windTimer + WIND_SPEED * event.tick) % 1.0;
        }
    }
    playerEvent(player, event, initial) {
        this.activated = player.stats.hasPulledLever(FAN_LEVER);
    }
    playerCollisionEvent(player, event, initialCollision) {
        const BASE_SPEED = 0.40;
        if (!this.activated) {
            return;
        }
        player.alterSpeed(BASE_SPEED * DIRX[this.direction % 4], BASE_SPEED * DIRY[this.direction % 4], -4.0, 4.0, -3.0, 4.0);
    }
    draw(canvas, assets) {
        if (!this.isActive()) {
            return;
        }
        // This is required, just don't ask why...
        const cameraTranslation = canvas.getTranslation();
        canvas.toggleTranslation(false);
        canvas.transform.push();
        canvas.transform.translate(this.pos.x + Math.floor(cameraTranslation.x), this.pos.y + Math.floor(cameraTranslation.y));
        if (this.direction != 0) {
            canvas.transform.rotate(this.direction * Math.PI / 2);
        }
        canvas.transform.translate(0, -4);
        canvas.transform.apply();
        // Propeller
        this.sprite.draw(canvas, this.bitmap, -this.sprite.width / 2, -this.sprite.height / 2);
        if (this.activated) {
            // Wind
            const shift = this.windTimer * 16;
            for (let i = 0; i < 4; ++i) {
                canvas.drawBitmap(this.bitmap, 0 /* Flip.None */, -this.sprite.width / 2, -this.sprite.height / 2 - 8 - i * 16, 0, 24 + shift, 24, 16);
            }
        }
        canvas.transform.pop();
        canvas.transform.apply();
        canvas.toggleTranslation(true);
    }
}
