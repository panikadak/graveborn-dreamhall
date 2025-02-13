import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
import { CollisionObject } from "./collisionobject.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { sampleTypeFromProgress } from "./collectablegenerator.js";
const BASE_GRAVITY = 5.0;
;
export class Breakable extends CollisionObject {
    constructor(x, y, type, splinters, collectables) {
        super(x, y, true);
        this.type = 0 /* BreakableType.Unknown */;
        this.collisionBox = new Rectangle(0, -1, 16, 16);
        this.hitbox = this.collisionBox.clone();
        // NOTE: as long as the stages are more horizontal than vertical, having
        // high vertical check area fixes problems with a pile of crates
        // (if the bottom-most crate is inactive, the one on the top of it will
        //  fall through)
        this.cameraCheckArea = new Vector(32, 1024);
        this.friction.y = 0.15;
        // No gravity for rubble!
        if (type == 1 /* BreakableType.Crate */) {
            this.oldPos.y += 1;
            this.pos.y += 1;
            this.target.y = BASE_GRAVITY;
        }
        this.type = type;
        this.splinters = splinters;
        this.collectables = collectables;
        // This fixes some problems
        if (this.type == 2 /* BreakableType.Rubble */) {
            this.collisionBox.w = 8;
            this.collisionBox.h = 8;
        }
    }
    spawnSplinters() {
        const SHIFT_X = [4, -4, -4, 4];
        const SHIFT_Y = [-4, -4, 4, 4];
        const FRAME_LOOKUP = [1, 0, 2, 3];
        const BASE_SPEED_MIN = 1.0;
        const BASE_SPEED_MAX = 2.0;
        const JUMP_Y_MIN = 2.0;
        const JUMP_Y_MAX = 1.0;
        for (let i = 0; i < 4; ++i) {
            const angle = Math.PI / 4 + Math.PI / 2 * i;
            const speed = BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN);
            const jumpSpeed = JUMP_Y_MIN + Math.random() * (JUMP_Y_MAX - JUMP_Y_MIN);
            const speedx = Math.cos(angle) * speed;
            const speedy = Math.sin(angle) * speed - jumpSpeed;
            const dx = this.pos.x + SHIFT_X[i];
            const dy = this.pos.y + SHIFT_Y[i];
            const o = this.splinters.next();
            o.spawn(dx, dy, speedx, speedy, this.type - 1, FRAME_LOOKUP[i]);
        }
    }
    spawnCollectables(progress, dir) {
        const LAUNCH_SPEED_X = 1.0;
        const LAUNCH_SPEED_Y = 2.0;
        const BASE_JUMP = -1.0;
        this.collectables.spawn(this.pos.x, this.pos.y, dir.x * LAUNCH_SPEED_X, dir.y * LAUNCH_SPEED_Y + BASE_JUMP, sampleTypeFromProgress(progress));
    }
    breakSelf(progress, dir, event) {
        const DROP_PROBABILITY = 0.50;
        this.exist = false;
        this.spawnSplinters();
        if (this.type == 1 /* BreakableType.Crate */ &&
            progress !== undefined &&
            Math.random() < DROP_PROBABILITY) {
            this.spawnCollectables(progress, dir);
        }
        event.audio.playSample(event.assets.getSample("break"), 0.60);
    }
    objectCollision(o, event, swapComparison = false, ignoreBottom = false, breakFromBottom = false) {
        const X_OFFSET = 1;
        const Y_OFFSET = 1;
        if (!this.isActive() || !o.isActive()) {
            return;
        }
        let x1 = this.pos.x - TILE_WIDTH / 2;
        let y1 = this.pos.y - TILE_HEIGHT / 2;
        let x2 = x1 + TILE_WIDTH;
        let y2 = y1 + TILE_HEIGHT;
        o.slopeCollision(x1 + X_OFFSET, y1, x2 - X_OFFSET * 2, y1, 1, event);
        if (!ignoreBottom) {
            const bottomTouch = o.slopeCollision(x1 + X_OFFSET, y2 + 2, x2 - X_OFFSET * 2, y2 + 2, -1, event);
            if (bottomTouch && breakFromBottom) {
                this.exist = false;
                this.breakSelf(undefined, Vector.direction(o.getPosition(), this.pos), event);
            }
        }
        o.wallCollision(x1, y1 + Y_OFFSET, y2 - y1 - Y_OFFSET * 2, 1, event);
        o.wallCollision(x2, y1 + Y_OFFSET, y2 - y1 - Y_OFFSET * 2, -1, event);
        if (!swapComparison || this.type != 1 /* BreakableType.Crate */) {
            return;
        }
        const opos = o.getPosition();
        x1 = opos.x - TILE_WIDTH / 2;
        y1 = opos.y - TILE_HEIGHT / 2;
        x2 = x1 + TILE_WIDTH;
        y2 = y2 + TILE_HEIGHT;
        this.slopeCollision(x1 + X_OFFSET, y1, x2 - X_OFFSET * 2, y1, 1, event);
        this.slopeCollision(x1 + X_OFFSET, y2, x2 - X_OFFSET * 2, y2, -1, event);
        this.wallCollision(x1, y1 + Y_OFFSET, y2 - y1 - Y_OFFSET * 2, 1, event);
        this.wallCollision(x2, y1 + Y_OFFSET, y2 - y1 - Y_OFFSET * 2, -1, event);
    }
    playerCollision(player, event) {
        if (!this.isActive() || !player.isActive()) {
            return;
        }
        if (player.overlaySwordAttackArea(this)) {
            if ((this.type == 2 /* BreakableType.Rubble */ &&
                player.isOrdinarilyAttacking() &&
                !player.stats.hasItem(13 /* Item.PowerfulSword */)) ||
                (this.type == 3 /* BreakableType.ScaryFace */ && !player.stats.hasItem(13 /* Item.PowerfulSword */))) {
                return;
            }
            this.breakSelf(player.stats, Vector.direction(player.getPosition(), this.pos), event);
            // player.performDownAttackJump();
            this.exist = false;
        }
    }
    projectileCollision(p, event) {
        if (!this.isActive() || !p.isActive()) { // || !p.isFriendly()) {
            return;
        }
        if (p.overlayObject(this)) {
            if (p.destroyOnTouch() ||
                (this.type == 3 /* BreakableType.ScaryFace */ && p.getID() < 8)) { // && p.getId() != something 
                p.kill(event);
            }
            // TODO: Also check for more powerful charge attack (if I decide
            // to implement it)
            if ((this.type == 2 /* BreakableType.Rubble */ && p.getID() != 1 && p.getID() < 8) ||
                (this.type == 3 /* BreakableType.ScaryFace */ && p.getID() < 8)) {
                return;
            }
            this.breakSelf(p.stats, Vector.direction(p.getPosition(), this.pos), event);
            this.exist = false;
            return;
        }
        this.objectCollision(p, event, false);
    }
    draw(canvas, assets, bmp) {
        if (!this.inCamera || !this.exist) {
            return;
        }
        canvas.drawBitmap(bmp, 0 /* Flip.None */, this.pos.x - 8, this.pos.y - 8, (this.type - 1) * 16, 0, 16, 16);
    }
}
