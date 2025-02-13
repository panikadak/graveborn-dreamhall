import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
import { GameObject } from "./gameobject.js";
export class CollisionObject extends GameObject {
    constructor(x = 0, y = 0, exist = false) {
        super(x, y, exist);
        this.collisionRadius = 8;
        this.takeCollisions = true;
        this.checkVerticalSlope = false;
        this.ignoreBottomLayer = false;
        // This flag is needed for projectiles.
        this.ignoreEvenSlopes = false;
        this.steepnessFactor = 0.0;
        this.touchSurface = false;
        this.dir = 0;
        this.getCollisionBox = () => this.collisionBox.clone();
        this.doesTakeCollisions = () => this.takeCollisions;
        this.doesIgnoreBottomLayer = () => this.ignoreBottomLayer;
        this.doesIgnoreEvenSlopes = () => this.ignoreEvenSlopes;
        this.doesTouchSurface = () => this.touchSurface;
        this.getCollisionRadius = () => this.collisionRadius;
        this.collisionBox = new Rectangle(0, 0, 16, 16);
        this.bounceFactor = new Vector(0.0, 0.0);
    }
    verticalSlopeCollision(x1, y1, x2, y2, direction, event) {
        const SAFE_MARGIN_NEAR = 1.0;
        const SAFE_MARGIN_FAR = 4.0;
        const TOO_CLOSE = 0.01;
        if (Math.abs(y1 - y2) < TOO_CLOSE) {
            return false;
        }
        // To make the collision work properly we need to assume that y1 is the upper point.
        if (y1 > y2) {
            return this.verticalSlopeCollision(x2, y2, x1, y1, direction, event);
        }
        const px = this.pos.x + this.collisionBox.x;
        const py = this.pos.y + this.collisionBox.y + this.collisionBox.h / 2 * direction;
        const oldX = this.oldPos.x + this.collisionBox.x + this.collisionBox.w / 2 * direction;
        // Check if the player is in the horizontal range and the direction of the speed is correct.
        if (py - this.collisionBox.h / 2 > y2 ||
            py + this.collisionBox.h / 2 < y1 ||
            this.speed.x * direction < 0) {
            return false;
        }
        // Find the collision y coordinate.
        const steepness = (x2 - x1) / (y2 - y1);
        const xshift = x1 - steepness * y1;
        const x0 = this.pos.y * steepness + xshift;
        // Check if in the collision range.
        if ((direction > 0 &&
            px >= x0 - (SAFE_MARGIN_NEAR) * event.tick &&
            oldX <= x0 + (SAFE_MARGIN_FAR + Math.abs(this.speed.x)) * event.tick) ||
            (direction < 0 &&
                px <= x0 + (SAFE_MARGIN_NEAR) * event.tick &&
                oldX >= x0 - (SAFE_MARGIN_FAR + Math.abs(this.speed.x)) * event.tick)) {
            this.pos.x = x0 - this.collisionBox.x - this.collisionBox.w / 2 * direction;
            this.speed.x *= -this.bounceFactor.x;
            this.slopeCollisionEvent?.(direction, event);
            return true;
        }
        return false;
    }
    overlayCollisionArea(x, y, w, h) {
        return this.pos.x + this.collisionBox.x + this.collisionBox.w / 2 >= x &&
            this.pos.x + this.collisionBox.x - this.collisionBox.w / 2 <= x + w &&
            this.pos.y + this.collisionBox.y + this.collisionBox.h / 2 >= y &&
            this.pos.y + this.collisionBox.y - this.collisionBox.h / 2 <= y + h;
    }
    computeSlopeSpeedFactor() {
        const SLOWDOWN_FACTOR = 0.10;
        const SPEEDUP_FACTOR = 0.20;
        const baseFactor = this.touchSurface ? -this.dir * this.steepnessFactor : 0.0;
        const speedFactor = baseFactor < 0 ? SLOWDOWN_FACTOR : SPEEDUP_FACTOR;
        return 1.0 - baseFactor * speedFactor;
    }
    slopeCollision(x1, y1, x2, y2, direction, event, leftMargin = 1, rightMargin = 1, safeMarginNear = 1.0, safeMarginFar = 4.0, setReference = undefined) {
        const TOO_CLOSE = 0.01;
        const MIN_SPEED = 0.01;
        if (!this.takeCollisions || !this.isActive()) {
            return false;
        }
        // Needed for bullets etc.
        if (this.checkVerticalSlope && Math.abs(y1 - y2) > TOO_CLOSE) {
            return this.verticalSlopeCollision(x1, y1, x2, y2, y2 > y1 ? -1 : 1, event);
        }
        if (Math.abs(x1 - x2) < TOO_CLOSE) {
            return false;
        }
        // A workaround to get collisions work properly with projectiles without
        // having to write proper collision detection...
        if (x1 > x2) {
            return this.slopeCollision(x2, y2, x1, y1, direction, event, leftMargin, rightMargin);
        }
        const px = this.pos.x + this.collisionBox.x;
        const py = this.pos.y + this.collisionBox.y + this.collisionBox.h / 2 * direction;
        const oldY = this.oldPos.y + this.collisionBox.y + this.collisionBox.h / 2 * direction;
        // Check if the player is in the horizontal range and the direction of the speed is correct.
        if (px - this.collisionBox.w / 2 * rightMargin > x2 ||
            px + this.collisionBox.w / 2 * leftMargin < x1 ||
            this.speed.y * direction <= -MIN_SPEED * direction) {
            return false;
        }
        // Find the collision y coordinate.
        const steepness = (y2 - y1) / (x2 - x1);
        const yshift = y1 - steepness * x1;
        const y0 = this.pos.x * steepness + yshift;
        const totalSpeed = this.speed.length;
        // Check if in the collision range.
        if ((direction > 0 &&
            py >= y0 - safeMarginNear * event.tick &&
            oldY <= y0 + (safeMarginFar + totalSpeed) * event.tick) ||
            (direction < 0 &&
                py <= y0 + safeMarginNear * event.tick &&
                oldY >= y0 - (safeMarginFar + totalSpeed) * event.tick)) {
            this.pos.y = y0 - this.collisionBox.y - this.collisionBox.h / 2 * direction;
            this.speed.y *= -this.bounceFactor.y;
            if (setReference !== undefined) {
                this.referenceObject = setReference;
            }
            this.steepnessFactor = steepness;
            this.touchSurface = true;
            this.slopeCollisionEvent?.(direction, event);
            return true;
        }
        return false;
    }
    wallCollision(x, y, height, direction, event) {
        const SAFE_MARGIN_NEAR = 1.0;
        const SAFE_MARGIN_FAR = 4.0;
        if (!this.takeCollisions || !this.isActive()) {
            return false;
        }
        const px = this.pos.x + this.collisionBox.x + this.collisionBox.w / 2 * direction;
        const py = this.pos.y + this.collisionBox.y - this.collisionBox.h / 2;
        const oldX = this.oldPos.x + this.collisionBox.x + this.collisionBox.w / 2 * direction;
        // Check if in vertical range.
        if (py > y + height || py + this.collisionBox.h < y || this.speed.x * direction < 0) {
            return false;
        }
        // Check if in the collision area.
        if ((direction > 0 &&
            px >= x - (SAFE_MARGIN_NEAR) * event.tick &&
            oldX <= x + (SAFE_MARGIN_FAR + Math.abs(this.speed.x)) * event.tick) ||
            (direction < 0 &&
                px <= x + (SAFE_MARGIN_NEAR) * event.tick &&
                oldX >= x - (SAFE_MARGIN_FAR + Math.abs(this.speed.x)) * event.tick)) {
            this.pos.x = x - this.collisionBox.x - this.collisionBox.w / 2 * direction;
            this.speed.x *= -this.bounceFactor.x;
            this.wallCollisionEvent?.(direction, event);
            return true;
        }
        return false;
    }
}
