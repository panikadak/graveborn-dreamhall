import { GameObject } from "./gameobject.js";
import { Sprite } from "../gfx/sprite.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Vector } from "../math/vector.js";
import { clamp } from "../math/utility.js";
const BASE_FRICTION = 0.015;
const BASE_SPEED = 1.0;
const APPEAR_TIME = 60;
;
export class Platform extends GameObject {
    constructor(x, y, type, specialParam) {
        super(x, y, true);
        this.dir = 0;
        this.angle = 0;
        this.renderOffsetY = 0;
        this.touched = false;
        this.waitTimer = 0;
        this.disappearing = false;
        this.disappeared = false;
        this.recovering = false;
        this.appearTimer = 0;
        this.bumpTimer = 0;
        this.initialPos = this.pos.clone();
        this.type = type;
        this.cameraCheckArea.x = 128;
        this.cameraCheckArea.y = 128;
        this.sprite = new Sprite(48, 24);
        switch (this.type) {
            case 1 /* PlatformType.HorizontallyMoving */:
                this.dir = Math.floor(this.pos.x / TILE_WIDTH) == 0 ? 1 : -1;
                this.friction.x = BASE_FRICTION;
                this.speed.x = this.dir * BASE_SPEED;
                break;
            case 0 /* PlatformType.VerticallyMoving */:
                this.dir = Math.floor(this.pos.y / TILE_HEIGHT) == 0 ? 1 : -1;
                this.friction.y = BASE_FRICTION;
                this.speed.y = this.dir * BASE_SPEED;
                break;
            case 3 /* PlatformType.Swing */:
                this.angle = (Math.floor(this.pos.x / TILE_WIDTH) % 2) * (Math.PI);
                this.computeSwingPosition();
                this.oldPos = this.pos.clone();
                this.cameraCheckArea.x = 256;
                this.cameraCheckArea.y = 256;
                this.sprite.setFrame(0, 1);
                break;
            case 4 /* PlatformType.Cloud */:
                this.renderOffsetY = -7;
                this.sprite.setFrame(0, 2);
                break;
            case 5 /* PlatformType.RectangularSwing */:
                this.angle = (specialParam ?? 0) * Math.PI;
                this.computeRectangularSwingPosition();
                this.oldPos = this.pos.clone();
                this.cameraCheckArea.x = 512;
                this.cameraCheckArea.y = 512;
                this.sprite.setFrame(4, 0);
                this.appearTimer = APPEAR_TIME;
                break;
            case 6 /* PlatformType.StaticUnmoving */:
                this.appearTimer = APPEAR_TIME;
                break;
            default:
                break;
        }
    }
    animatePropeller(event) {
        const FRAME_LENGTH = 4;
        this.sprite.animate(0, 0, 3, FRAME_LENGTH, event.tick);
    }
    updateVerticallyMovingPlatform(event) {
        const TRIGGER_DISTANCE = 8;
        this.animatePropeller(event);
        if ((this.dir > 0 && this.pos.y - this.initialPos.y > TRIGGER_DISTANCE) ||
            (this.dir < 0 && this.initialPos.y - this.pos.y > TRIGGER_DISTANCE)) {
            this.dir *= -1;
        }
        this.target.y = this.dir * BASE_SPEED;
    }
    updateHorizontallyMovingPlatform(event) {
        const TRIGGER_DISTANCE = 8;
        this.animatePropeller(event);
        if ((this.dir > 0 && this.pos.x - this.initialPos.x > TRIGGER_DISTANCE) ||
            (this.dir < 0 && this.initialPos.x - this.pos.x > TRIGGER_DISTANCE)) {
            this.dir *= -1;
        }
        this.target.x = this.dir * BASE_SPEED;
    }
    computeSwingPosition() {
        const RADIUS = 64;
        this.pos.x = this.initialPos.x + Math.cos(this.angle) * RADIUS;
        this.pos.y = this.initialPos.y + Math.abs(Math.sin(this.angle) * RADIUS) + 4;
    }
    computeRectangularSwingPosition() {
        const RADIUS_H = 96;
        const RADIUS_V = 40;
        const dx = Math.cos(this.angle);
        const dy = Math.sin(this.angle);
        let sx = 0;
        let sy = 0;
        // A simple projection from S^1 to [-1,1]^2
        if (Math.abs(dx) > Math.abs(dy)) {
            sx = Math.sign(dx);
            sy = dy / (Math.SQRT1_2);
        }
        else {
            sx = dx / (Math.SQRT1_2);
            sy = Math.sign(dy);
        }
        this.pos.x = this.initialPos.x + sx * RADIUS_H;
        this.pos.y = this.initialPos.y + sy * RADIUS_V + 4;
    }
    updateSwing(event) {
        const SWING_SPEED = Math.PI * 2 / 180;
        const SPEED_REDUCTION = 0.80;
        const speedFactor = 1.0 - Math.abs((this.angle % Math.PI) - Math.PI / 2) / (Math.PI / 2) * SPEED_REDUCTION;
        this.angle = (this.angle + SWING_SPEED * speedFactor * event.tick) % (Math.PI * 2);
        this.computeSwingPosition();
        this.speed.zeros();
        this.target.zeros();
    }
    updateRectangularSwing(event) {
        const SWING_SPEED = Math.PI * 2 / 600;
        const SPEED_REDUCTION = 0.5;
        const speedFactor = (this.angle >= Math.PI / 4 && this.angle < Math.PI - Math.PI / 4) ||
            (this.angle >= Math.PI + Math.PI / 4 && this.angle < Math.PI * 2 - Math.PI / 4)
            ? 1.0 - SPEED_REDUCTION : 1.0;
        this.angle = (this.angle + SWING_SPEED * speedFactor * event.tick) % (Math.PI * 2);
        this.computeRectangularSwingPosition();
        this.speed.zeros();
        this.target.zeros();
    }
    updateCloud(event) {
        const WAIT_TIME = 15;
        const VANISH_SPEED = 5;
        const RECOVER_TIME = 60;
        const WAVE_SPEED = Math.PI * 2 / 120.0;
        const AMPLITUDE = 2;
        this.speed.zeros();
        this.target.zeros();
        if (this.recovering) {
            this.sprite.animate(2, 4, 1, VANISH_SPEED, event.tick);
            if (this.sprite.getColumn() == 1) {
                this.waitTimer = 0,
                    this.recovering = false;
                this.touched = false;
                this.sprite.setFrame(0, 2);
            }
            return;
        }
        if (this.disappeared) {
            if (this.waitTimer > 0) {
                this.waitTimer -= event.tick;
            }
            else {
                this.recovering = true;
                this.disappeared = false;
                this.disappearing = false;
                this.sprite.setFrame(4, 2);
            }
            return;
        }
        if (!this.touched) {
            this.angle = (this.angle + WAVE_SPEED * event.tick) % (Math.PI * 2);
            this.pos.y = this.initialPos.y + Math.sin(this.angle) * AMPLITUDE;
            return;
        }
        if (this.touched && !this.disappearing) {
            this.disappearing = true;
            this.waitTimer = WAIT_TIME;
            this.sprite.setFrame(1, 2);
            return;
        }
        if (this.disappearing) {
            if (this.waitTimer > 0) {
                this.waitTimer -= event.tick;
                if (this.waitTimer <= 0) {
                    event.audio.playSample(event.assets.getSample("vaporize"), 1.0);
                }
            }
            else {
                this.sprite.animate(2, 2, 5, VANISH_SPEED, event.tick);
                if (this.sprite.getColumn() == 5) {
                    this.disappeared = true;
                    this.waitTimer = RECOVER_TIME;
                    this.angle = 0.0;
                }
            }
        }
    }
    updateBumper(event) {
        const RECOVER_SPEED = 1.0 / 8.0;
        if (this.bumpTimer > 0) {
            this.bumpTimer = Math.max(0.0, this.bumpTimer - RECOVER_SPEED * event.tick);
        }
    }
    checkBumperCollision(o, event) {
        const BUMPER_RADIUS = 12;
        const BUMP_WEIGHT_X = 5.0;
        const BUMP_WEIGHT_Y = 4.0;
        // TODO: Not stable if object speed is high, but neither is any other
        // collision in this game.
        const distance = o.distanceTo(this);
        const r = o.getCollisionRadius() + BUMPER_RADIUS;
        if (distance < r) {
            const dir = Vector.direction(this.pos, o.getPosition());
            o.setSpeed(dir.x * BUMP_WEIGHT_X, dir.y * BUMP_WEIGHT_Y);
            // o.setPosition(this.pos.x + r*dir.x, this.pos.y + r*dir.y);
            this.bumpTimer = 1.0;
            event.audio.playSample(event.assets.getSample("bounce"), 0.50);
        }
    }
    updateUnmovingPlatform(event) {
        const MAX_DISTANCE = 16.0;
        const MOVE_DELTA = 16.0 / 30.0;
        const dir = this.touched ? 1 : -1;
        this.pos.y = clamp(this.pos.y + MOVE_DELTA * dir * event.tick, this.initialPos.y, this.initialPos.y + MAX_DISTANCE);
        this.animatePropeller(event);
        this.touched = false;
    }
    drawChain(canvas, bmp) {
        const CHAIN_COUNT = 7;
        const distance = Math.hypot(this.pos.x - this.initialPos.x, this.pos.y - this.initialPos.y - 4);
        const distDelta = distance / CHAIN_COUNT;
        const c = Math.cos(this.angle);
        const s = Math.abs(Math.sin(this.angle));
        for (let i = 1; i < CHAIN_COUNT + 1; ++i) {
            const distance = distDelta * i;
            const chainx = Math.round(this.initialPos.x + c * distance);
            const chainy = Math.round(this.initialPos.y + s * distance);
            canvas.drawBitmap(bmp, 0 /* Flip.None */, chainx - 8, chainy - 8, 64, 24, 16, 16);
        }
    }
    drawBumper(canvas, bmp) {
        const frame = Math.min(3, Math.floor(this.bumpTimer * 4));
        const sx = frame == 3 ? 1 : frame;
        canvas.drawBitmap(bmp, 0 /* Flip.None */, this.pos.x - 16, this.pos.y - 16, sx * 32, 72, 32, 32);
    }
    updateEvent(event) {
        if (this.appearTimer > 0) {
            this.appearTimer -= event.tick;
        }
        switch (this.type) {
            case 1 /* PlatformType.HorizontallyMoving */:
                this.updateHorizontallyMovingPlatform(event);
                break;
            case 0 /* PlatformType.VerticallyMoving */:
                this.updateVerticallyMovingPlatform(event);
                break;
            case 3 /* PlatformType.Swing */:
                this.updateSwing(event);
                break;
            case 4 /* PlatformType.Cloud */:
                this.updateCloud(event);
                break;
            case 5 /* PlatformType.RectangularSwing */:
                this.updateRectangularSwing(event);
                break;
            case 2 /* PlatformType.Bumper */:
                this.updateBumper(event);
                break;
            case 6 /* PlatformType.StaticUnmoving */:
                this.updateUnmovingPlatform(event);
                break;
            default:
                break;
        }
    }
    postMovementEvent(event) {
        if (this.type == 3 /* PlatformType.Swing */ ||
            this.type == 4 /* PlatformType.Cloud */ ||
            this.type == 5 /* PlatformType.RectangularSwing */) {
            this.speed.x = this.pos.x - this.oldPos.x;
            this.speed.y = this.pos.y - this.oldPos.y;
        }
    }
    objectCollision(o, event) {
        if (this.disappeared || this.recovering || !this.isActive() || !o.isActive() ||
            (this.type != 2 /* PlatformType.Bumper */ && o.doesIgnoreBottomLayer())) {
            return;
        }
        if (this.type == 2 /* PlatformType.Bumper */) {
            this.checkBumperCollision(o, event);
            return;
        }
        this.touched = o.slopeCollision(this.pos.x - 24, this.pos.y - 12, this.pos.x + 24, this.pos.y - 12, 1, event, 1, 1, 1, 4, this) || this.touched;
    }
    draw(canvas, assets, bmp) {
        if (!this.isActive() || (this.disappeared && !this.recovering)) {
            return;
        }
        if (this.type == 2 /* PlatformType.Bumper */) {
            this.drawBumper(canvas, bmp);
            return;
        }
        if (this.type == 3 /* PlatformType.Swing */) {
            // Center orb
            canvas.drawBitmap(bmp, 0 /* Flip.None */, this.initialPos.x - 8, this.initialPos.y - 8, 48, 24, 16, 16);
            // Chain
            this.drawChain(canvas, bmp);
        }
        if (this.appearTimer > 0) {
            canvas.setAlpha(1.0 - this.appearTimer / APPEAR_TIME);
        }
        this.sprite.draw(canvas, bmp, this.pos.x - 24, this.pos.y - 12 + this.renderOffsetY, 0 /* Flip.None */);
        if (this.appearTimer > 0) {
            canvas.setAlpha();
        }
    }
}
