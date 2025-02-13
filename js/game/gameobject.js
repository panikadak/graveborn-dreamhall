import { Vector } from "../math/vector.js";
import { Rectangle, overlayRect } from "../math/rectangle.js";
import { updateSpeedAxis } from "./utility.js";
export class GameObject {
    constructor(x = 0, y = 0, exist = false) {
        this.exist = true;
        this.dying = false;
        this.inCamera = false;
        this.referenceObject = undefined;
        this.doesExist = () => this.exist;
        this.isDying = () => this.dying;
        this.isInCamera = () => this.inCamera;
        this.isActive = () => this.exist && !this.dying && this.inCamera;
        this.getPosition = () => this.pos.clone();
        this.getSpeed = () => this.speed.clone();
        this.getHitbox = () => this.hitbox.clone();
        this.overlayRect = (shift, hitbox) => overlayRect(this.pos, this.hitbox, shift, hitbox);
        this.overlayObject = (o) => overlayRect(this.pos, this.hitbox, o.pos, o.hitbox);
        this.pos = new Vector(x, y);
        this.oldPos = this.pos.clone();
        this.speed = new Vector();
        this.target = new Vector();
        this.friction = new Vector(1, 1);
        this.cameraCheckArea = new Vector(128, 128);
        this.hitbox = new Rectangle(0, 0, 16, 16);
        this.exist = exist;
    }
    updateMovement(event) {
        this.speed.x = updateSpeedAxis(this.speed.x, this.target.x, this.friction.x * event.tick);
        this.speed.y = updateSpeedAxis(this.speed.y, this.target.y, this.friction.y * event.tick);
        this.pos.x += this.speed.x * event.tick;
        this.pos.y += this.speed.y * event.tick;
        if (this.referenceObject !== undefined) {
            this.pos.x += this.referenceObject.speed.x * event.tick;
            this.pos.y += this.referenceObject.speed.y * event.tick;
        }
    }
    update(event) {
        if (!this.exist) {
            return;
        }
        if (!this.inCamera) {
            if (this.dying) {
                this.dying = false;
                this.exist = false;
            }
            return;
        }
        this.oldPos = this.pos.clone();
        if (this.dying) {
            if (this.die?.(event) ?? true) {
                this.exist = false;
                this.dying = false;
            }
            return;
        }
        this.updateEvent?.(event);
        this.updateMovement(event);
        this.postMovementEvent?.(event);
        this.referenceObject = undefined;
    }
    cameraCheck(camera, event) {
        if (!this.exist) {
            return;
        }
        const wasInCamera = this.inCamera;
        this.inCamera = camera.isInsideVisibleArea(this.pos, this.cameraCheckArea);
        const enteredCamera = this.inCamera && this.inCamera != wasInCamera;
        this.cameraEvent?.(enteredCamera, camera, event);
        if (this.dying && !this.inCamera) {
            this.exist = false;
        }
    }
    forceKill() {
        this.exist = false;
        this.dying = false;
    }
    instantKill(event) {
        this.exist = false;
        this.dying = false;
    }
    distanceTo(o) {
        return Vector.distance(this.pos, o.pos);
    }
    setSpeed(speedx, speedy) {
        this.speed.x = speedx;
        this.speed.y = speedy;
    }
    setPosition(x, y) {
        this.pos.x = x;
        this.pos.y = y;
    }
}
