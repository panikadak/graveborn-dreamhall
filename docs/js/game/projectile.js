import { CollisionObject } from "./collisionobject.js";
import { Sprite } from "../gfx/sprite.js";
import { Vector } from "../math/vector.js";
import { Rectangle } from "../math/rectangle.js";
const LAST_ANIMATION_FRAME = [
    3, 2, 3, 2, 3, 3, 3, 3, 3, 3, 3
];
const ANIMATION_SPEED = [
    4, 4, 4, 4, 4, 5, 5, 4, 5, 5, 5
];
const HITBOX_WIDTHS = [
    8, 12, 4, 4, 8, 10, 4, 8, 12, 18, 10,
];
const HITBOX_HEIGHTS = [
    8, 12, 4, 4, 8, 10, 4, 8, 12, 18, 10
];
const CAMERA_CHECKAREA_X = [
    24, 24, 24, 24, 24, 64, 24, 24, 96,
];
const CAMERA_CHECKAREA_Y = [
    24, 24, 24, 24, 24, 64, 24, 24, 96,
];
const DEATH_SAMPLE_VOLUME = 0.50;
export class Projectile extends CollisionObject {
    constructor(progress) {
        super(0, 0, false);
        this.id = 0;
        this.attackID = -1;
        this.power = 0;
        this.friendly = false;
        this.flip = 0 /* Flip.None */;
        this.targetObject = undefined;
        this.followSpeed = 0;
        this.timer = 0;
        this.maxLifeTime = 0;
        this.volumeFactor = 1.0;
        this.stats = undefined;
        this.isFriendly = () => this.friendly;
        this.getID = () => this.id;
        this.destroyOnTouch = () => this.id != 1 && this.id != 9;
        this.getAttackID = () => this.attackID;
        this.sprite = new Sprite(24, 24);
        this.hitbox = new Rectangle(0, 0, 4, 4);
        this.collisionBox = new Rectangle(0, 0, 2, 2);
        this.cameraCheckArea = new Vector(32, 32);
        this.checkVerticalSlope = true;
        this.ignoreBottomLayer = true;
        // Probably not even need any more
        // this.ignoreEvenSlopes = true;
        this.stats = progress;
        this.computeFriction();
    }
    computeFriction() {
        if (this.id == 4) {
            this.friction.x = 0.0125;
            this.friction.y = 0.0125;
            return;
        }
        this.friction.x = 0.125;
        this.friction.y = 0.125;
    }
    die(event) {
        const DEATH_SPEED = 3;
        const lastFrame = Math.max(3, LAST_ANIMATION_FRAME[this.id] ?? 0);
        this.flip = 0 /* Flip.None */;
        this.sprite.animate(this.sprite.getRow(), lastFrame + 1, lastFrame + 5, DEATH_SPEED, event.tick);
        return this.sprite.getColumn() == lastFrame + 5;
    }
    cameraEvent(enteredCamera, camera, event) {
        if (!this.inCamera) {
            this.exist = false;
        }
    }
    updateEvent(event) {
        this.sprite.animate(this.id, 0, LAST_ANIMATION_FRAME[this.id] ?? 0, ANIMATION_SPEED[this.id] ?? 0, event.tick);
        if (this.targetObject !== undefined) {
            const dir = Vector.direction(this.pos, this.targetObject.getPosition());
            this.target.x = this.followSpeed * dir.x;
            this.target.y = this.followSpeed * dir.y;
        }
        this.computeFriction();
        this.flip = this.speed.x < 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        if (this.maxLifeTime > 0) {
            this.timer += event.tick;
            if (this.timer >= this.maxLifeTime) {
                this.kill(event);
                // Play or not to play (a sound effect), that's the question.
                // I say not to play.
                event.audio.playSample(event.assets.getSample("bullethit"), DEATH_SAMPLE_VOLUME * 0.75);
            }
        }
    }
    wallCollisionEvent(direction, event) {
        this.kill(event);
        event.audio.playSample(event.assets.getSample("bullethit"), this.volumeFactor * DEATH_SAMPLE_VOLUME);
    }
    slopeCollisionEvent(direction, event) {
        this.kill(event);
        event.audio.playSample(event.assets.getSample("bullethit"), this.volumeFactor * DEATH_SAMPLE_VOLUME);
    }
    spawn(originx, originy, x, y, speedx, speedy, id, power, friendly = true, attackID = -1, targetObject = undefined, followSpeed = 0.0, getGravity = false, doNotIgnoreBottomLayer = false, maxLifeTime = 0, useWideCameraArea = false) {
        const IGNORE_EVEN_THRESHOLD = 0.001;
        const BASE_GRAVITY = 4.0;
        this.oldPos = new Vector(originx, originy);
        this.pos = new Vector(x, y);
        this.speed = new Vector(speedx, speedy);
        this.target = this.speed.clone();
        this.id = id;
        this.friendly = friendly;
        this.attackID = attackID;
        this.power = power;
        this.sprite.setFrame(0, this.id);
        this.hitbox.w = HITBOX_WIDTHS[this.id] ?? 4;
        this.hitbox.h = HITBOX_HEIGHTS[this.id] ?? 4;
        this.cameraCheckArea.x = CAMERA_CHECKAREA_X[this.id] ?? 24;
        this.cameraCheckArea.y = CAMERA_CHECKAREA_Y[this.id] ?? 24;
        if (useWideCameraArea) {
            this.cameraCheckArea.x = 256;
            this.cameraCheckArea.y = 256;
        }
        this.dying = false;
        this.exist = true;
        this.ignoreEvenSlopes = Math.abs(this.speed.y) < IGNORE_EVEN_THRESHOLD;
        this.ignoreBottomLayer = !doNotIgnoreBottomLayer;
        this.takeCollisions = this.id != 7 && this.id != 10;
        this.targetObject = targetObject;
        this.followSpeed = followSpeed;
        if (getGravity) {
            this.target.y = BASE_GRAVITY;
        }
        this.flip = this.speed.x < 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        this.timer = 0;
        this.maxLifeTime = maxLifeTime;
        this.volumeFactor = 1.0;
        if (this.id == 6) {
            // A quick fix
            this.volumeFactor = 0.75;
        }
    }
    draw(canvas, assets, bmp) {
        if (!this.inCamera || !this.exist) {
            return;
        }
        if (bmp === undefined) {
            canvas.setColor(255, 0, 0);
            canvas.fillRect(this.pos.x - 4, this.pos.y - 4, 8, 8);
            canvas.setColor();
            return;
        }
        if (this.id == 7) {
            canvas.setAlpha(0.75);
        }
        this.sprite.draw(canvas, bmp, this.pos.x - this.sprite.width / 2, this.pos.y - this.sprite.height / 2, this.flip);
        if (this.id == 7) {
            canvas.setAlpha();
        }
    }
    kill(event) {
        this.sprite.setFrame((LAST_ANIMATION_FRAME[this.id] ?? 0) + 1, this.id);
        this.dying = true;
    }
    getPower() {
        return this.power;
    }
    makeIgnoreCollision() {
        this.takeCollisions = false;
    }
}
