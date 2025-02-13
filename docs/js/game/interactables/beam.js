import { Vector } from "../../math/vector.js";
import { TILE_HEIGHT } from "../tilesize.js";
import { Interactable } from "./interactable.js";
export class Beam extends Interactable {
    constructor(x, y, id) {
        super(x, y);
        this.id = 0;
        this.width = 0;
        this.widthModifier = 0;
        this.disabled = false;
        this.id = id - 1;
        this.hitbox.w = 12;
        this.cameraCheckArea = new Vector(32, 128);
    }
    disable(stats) {
        if ((this.id == 8 && stats.hasDefeatedMiniboss()) ||
            (this.id <= 2 && stats.hasItem(this.id)) ||
            (this.id >= 3 && this.id < 16 && stats.hasPulledLever(this.id - 3)) ||
            (this.id == 16 && !stats.hasItem(13 /* Item.PowerfulSword */))) {
            this.disabled = true;
            if (this.id != 16) {
                this.exist = false;
            }
            return true;
        }
        this.disabled = false;
        return false;
    }
    updateEvent(event) {
        const MIN_WIDTH = 2;
        const MAX_WIDTH = 8;
        const ANIMATION_SPEED = Math.PI * 2 / 12;
        if (this.disabled) {
            return;
        }
        this.widthModifier = (this.widthModifier + ANIMATION_SPEED * event.tick) % (Math.PI);
        this.width = MIN_WIDTH + Math.round((1 + Math.sin(this.widthModifier)) * (MAX_WIDTH - MIN_WIDTH));
    }
    playerEvent(player, event, initial) {
        if (this.disable(player.stats)) {
            return;
        }
        if (!initial) {
            player.wallCollision(this.pos.x - 4, this.pos.y + TILE_HEIGHT / 2, TILE_HEIGHT * 3, 1, event);
            player.wallCollision(this.pos.x + 4, this.pos.y + TILE_HEIGHT / 2, TILE_HEIGHT * 3, -1, event);
        }
    }
    draw(canvas) {
        if (!this.isActive() || this.disabled) {
            return;
        }
        const halfWidth = Math.floor(this.width / 2);
        const foreColorOffset = 2; // Math.max(1, Math.round(this.width/3) - 2);
        canvas.setColor(0, 109, 182);
        canvas.fillRect(this.pos.x - halfWidth, this.pos.y + TILE_HEIGHT / 2, this.width, TILE_HEIGHT * 3);
        canvas.setColor(109, 182, 255);
        canvas.fillRect(this.pos.x - halfWidth + 1, this.pos.y + TILE_HEIGHT / 2, this.width - 2, TILE_HEIGHT * 3);
        const middleBarWidth = this.width - 2 - foreColorOffset * 2;
        if (middleBarWidth > 0) {
            canvas.setColor(219, 255, 255);
            canvas.fillRect(this.pos.x - halfWidth + 1 + foreColorOffset, this.pos.y + TILE_HEIGHT / 2, middleBarWidth, TILE_HEIGHT * 3);
        }
        canvas.setColor();
    }
}
