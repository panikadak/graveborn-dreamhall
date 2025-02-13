import { Vector } from "../math/vector.js";
import { updateSpeedAxis } from "./utility.js";
export class Camera {
    get width() {
        return this.size.x;
    }
    get height() {
        return this.size.y;
    }
    constructor(x = 0.0, y = 0.0, event) {
        this.shakeTimer = 0;
        this.shakeMagnitude = 0;
        this.getPosition = () => this.pos.clone();
        this.getCorner = () => this.corner.clone();
        this.getFollowedPoint = () => this.followedPoint.clone();
        this.pos = new Vector(x, y);
        this.targetPos = this.pos.clone();
        this.size = new Vector(event.screenWidth, event.screenHeight);
        this.corner = new Vector(x - this.size.x / 2, y - this.size.y / 2);
        this.shakeVector = new Vector();
        this.followedPoint = new Vector();
    }
    computeCorner() {
        this.corner.x = this.pos.x - this.size.x / 2;
        this.corner.y = this.pos.y - this.size.y / 2;
    }
    update(event) {
        const H_FACTOR = 8;
        const V_FACTOR = 6;
        const FLICKERING_REDUCTIONS_THRESHOLD = 2;
        this.size.x = event.screenWidth;
        this.size.y = event.screenHeight;
        this.computeCorner();
        // When near the target position, the camera might start to "flicker"
        // back and forth, so to avoid this we make the camera jump to the
        // target position if close enough.
        if (Math.abs(this.pos.x - this.targetPos.x) <= FLICKERING_REDUCTIONS_THRESHOLD) {
            this.targetPos.x = this.pos.x;
        }
        if (Math.abs(this.pos.y - this.targetPos.y) <= FLICKERING_REDUCTIONS_THRESHOLD) {
            this.targetPos.y = this.pos.y;
        }
        this.pos.x = updateSpeedAxis(this.pos.x, this.targetPos.x, (Math.abs(this.pos.x - this.targetPos.x) / H_FACTOR) * event.tick);
        this.pos.y = updateSpeedAxis(this.pos.y, this.targetPos.y, (Math.abs(this.pos.y - this.targetPos.y) / V_FACTOR) * event.tick);
        if (this.shakeTimer > 0) {
            this.shakeTimer -= event.tick;
            this.shakeVector.x = -this.shakeMagnitude + Math.round(Math.random() * this.shakeMagnitude * 2);
            this.shakeVector.y = -this.shakeMagnitude + Math.round(Math.random() * this.shakeMagnitude * 2);
        }
        else {
            this.shakeVector.zeros();
        }
    }
    limit(left, right, top, bottom) {
        if (right - left <= this.size.x) {
            this.pos.x = 0; // Not sure what this should really be
            this.corner.x = -(this.size.x - (right - left)) / 2;
        }
        else {
            if (this.corner.x + this.size.x > right) {
                this.corner.x = right - this.size.x;
                this.pos.x = this.corner.x + this.size.x / 2;
            }
            if (this.corner.x < left) {
                this.corner.x = left;
                this.pos.x = this.corner.x + this.size.x / 2;
            }
        }
        if (this.corner.y + this.size.y > bottom) {
            this.corner.y = bottom - this.size.y;
            this.pos.y = this.corner.y + this.size.y / 2;
        }
        if (this.corner.y < top) {
            this.corner.y = top;
            this.pos.y = this.corner.y + this.size.y / 2;
        }
    }
    apply(canvas) {
        //canvas.transform.setTarget(TransformTarget.Model); // TODO: Why not "Camera"...?
        //canvas.transform.translate(Math.floor(-this.corner.x), Math.floor(-this.corner.y));
        //canvas.transform.apply();
        // Using "moveTo" instead of modifying the transformation matrix
        // reduces "flickering" of the game objects since it is easier this
        // way to "floor" the rendering coordinates.
        canvas.moveTo(-this.corner.x + this.shakeVector.x, -this.corner.y + this.shakeVector.y);
    }
    followPoint(p) {
        const HORIZONTAL_THRESHOLD = 16;
        const VERTICAL_THRESHOLD = 16;
        const X_OFFSET = 0;
        const Y_OFFSET = 0;
        const target = new Vector(p.x + X_OFFSET, p.y + Y_OFFSET);
        if (Math.abs(target.x - this.pos.x) > HORIZONTAL_THRESHOLD) {
            this.targetPos.x = target.x - Math.sign(target.x - this.pos.x) * HORIZONTAL_THRESHOLD;
        }
        if (Math.abs(target.y - this.pos.y) > VERTICAL_THRESHOLD) {
            this.targetPos.y = target.y - Math.sign(target.y - this.pos.y) * VERTICAL_THRESHOLD;
        }
        this.followedPoint.x = p.x;
        this.followedPoint.y = p.y;
    }
    forceCenter(p) {
        this.pos = p.clone();
        this.targetPos = this.pos.clone();
        this.computeCorner();
    }
    isInsideVisibleArea(center, size) {
        const left = center.x - size.x / 2;
        const top = center.y - size.y / 2;
        return left + size.x >= this.corner.x &&
            top + size.y >= this.corner.y &&
            left <= this.corner.x + this.width &&
            top <= this.corner.y + this.height;
    }
    computeRelativePositionForPoint(p) {
        return new Vector(p.x - this.corner.x, p.y - this.corner.y);
    }
    shake(time, magnitude) {
        this.shakeTimer = time;
        this.shakeMagnitude = magnitude;
    }
}
