import { ProgramEvent } from "../core/event.js";
import { GameObject } from "./gameobject.js";
import { CollisionObject } from "./collisionobject.js";
import { Sprite } from "../gfx/sprite.js";
import { Assets } from "../core/assets.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Vector } from "../math/vector.js";
import { clamp } from "../math/utility.js";


const BASE_FRICTION : number = 0.015;
const BASE_SPEED : number = 1.0;

const APPEAR_TIME : number = 60;


export const enum PlatformType {

    VerticallyMoving = 0,
    HorizontallyMoving = 1,
    Bumper = 2, 
    Swing = 3,
    Cloud = 4, 
    RectangularSwing = 5,
    // Misleading since this is not really static. Oh well.
    StaticUnmoving = 6,
};


export class Platform extends GameObject {


    private initialPos : Vector;

    private type : PlatformType;
    private sprite : Sprite;

    private dir : number = 0;
    private angle : number = 0;

    private renderOffsetY : number = 0;

    private touched : boolean = false;
    private waitTimer : number = 0;
    private disappearing : boolean = false;
    private disappeared : boolean = false;
    private recovering : boolean = false;

    private appearTimer : number = 0;
    private bumpTimer : number = 0;


    constructor(x : number, y : number, type : PlatformType,
        specialParam? : number) {

        super(x, y, true);

        this.initialPos = this.pos.clone();

        this.type = type;

        this.cameraCheckArea.x = 128;
        this.cameraCheckArea.y = 128;

        this.sprite = new Sprite(48, 24);

        switch (this.type) {

        case PlatformType.HorizontallyMoving:

            this.dir = Math.floor(this.pos.x/TILE_WIDTH) == 0 ? 1 : -1;
            this.friction.x = BASE_FRICTION;

            this.speed.x = this.dir*BASE_SPEED;

            break;

        case PlatformType.VerticallyMoving:

            this.dir = Math.floor(this.pos.y/TILE_HEIGHT) == 0 ? 1 : -1;
            this.friction.y = BASE_FRICTION;

            this.speed.y = this.dir*BASE_SPEED;

            break;

        case PlatformType.Swing:

            this.angle = (Math.floor(this.pos.x/TILE_WIDTH) % 2)*(Math.PI);

            this.computeSwingPosition();
            this.oldPos = this.pos.clone();

            this.cameraCheckArea.x = 256;
            this.cameraCheckArea.y = 256;

            this.sprite.setFrame(0, 1);

            break;

        case PlatformType.Cloud:

            this.renderOffsetY = -7;
            this.sprite.setFrame(0, 2);

            break;

        case PlatformType.RectangularSwing:

            this.angle = (specialParam ?? 0)*Math.PI;

            this.computeRectangularSwingPosition();
            this.oldPos = this.pos.clone();

            this.cameraCheckArea.x = 512;
            this.cameraCheckArea.y = 512;

            this.sprite.setFrame(4, 0);

            this.appearTimer = APPEAR_TIME;

            break;

        case PlatformType.StaticUnmoving:

            this.appearTimer = APPEAR_TIME;
            break;

        default:
            break;
        }
    }


    private animatePropeller(event : ProgramEvent) : void {

        const FRAME_LENGTH : number = 4;

        this.sprite.animate(0, 0, 3, FRAME_LENGTH, event.tick);
    }


    private updateVerticallyMovingPlatform(event : ProgramEvent) : void {

        const TRIGGER_DISTANCE : number = 8;

        this.animatePropeller(event);

        if ((this.dir > 0 && this.pos.y - this.initialPos.y > TRIGGER_DISTANCE) ||
            (this.dir < 0 && this.initialPos.y - this.pos.y > TRIGGER_DISTANCE)) {

            this.dir *= -1;
        }
        this.target.y = this.dir*BASE_SPEED;
    }


    private updateHorizontallyMovingPlatform(event : ProgramEvent) : void {

        const TRIGGER_DISTANCE : number = 8;

        this.animatePropeller(event);

        if ((this.dir > 0 && this.pos.x - this.initialPos.x > TRIGGER_DISTANCE) ||
            (this.dir < 0 && this.initialPos.x - this.pos.x > TRIGGER_DISTANCE)) {

            this.dir *= -1;
        }
        this.target.x = this.dir*BASE_SPEED;
    }


    private computeSwingPosition() : void {

        const RADIUS : number = 64;

        this.pos.x = this.initialPos.x + Math.cos(this.angle)*RADIUS;
        this.pos.y = this.initialPos.y + Math.abs(Math.sin(this.angle)*RADIUS) + 4;
    }


    private computeRectangularSwingPosition() : void {

        const RADIUS_H : number = 96;
        const RADIUS_V : number = 40;

        const dx : number = Math.cos(this.angle);
        const dy : number = Math.sin(this.angle);

        let sx : number = 0;
        let sy : number = 0;
        
        // A simple projection from S^1 to [-1,1]^2
        if (Math.abs(dx) > Math.abs(dy)) {

            sx = Math.sign(dx);
            sy = dy/(Math.SQRT1_2);
        }
        else {

            sx = dx/(Math.SQRT1_2);
            sy = Math.sign(dy);
        }

        this.pos.x = this.initialPos.x + sx*RADIUS_H;
        this.pos.y = this.initialPos.y + sy*RADIUS_V + 4;
    }


    private updateSwing(event : ProgramEvent) : void {

        const SWING_SPEED : number = Math.PI*2/180;
        const SPEED_REDUCTION : number = 0.80;

        const speedFactor : number = 1.0 - Math.abs((this.angle % Math.PI) - Math.PI/2)/(Math.PI/2)*SPEED_REDUCTION;
        
        this.angle = (this.angle + SWING_SPEED*speedFactor*event.tick) % (Math.PI*2);
        this.computeSwingPosition();

        this.speed.zeros();
        this.target.zeros();
    }


    private updateRectangularSwing(event : ProgramEvent) : void {

        const SWING_SPEED : number = Math.PI*2/600;
        const SPEED_REDUCTION : number = 0.5;

        const speedFactor : number = 
            (this.angle >= Math.PI/4 && this.angle < Math.PI - Math.PI/4) ||
            (this.angle >= Math.PI + Math.PI/4 && this.angle < Math.PI*2 - Math.PI/4)
            ? 1.0 - SPEED_REDUCTION : 1.0;
        
        this.angle = (this.angle + SWING_SPEED*speedFactor*event.tick) % (Math.PI*2);
        this.computeRectangularSwingPosition();

        this.speed.zeros();
        this.target.zeros();
    }


    private updateCloud(event : ProgramEvent) : void {

        const WAIT_TIME : number = 15;
        const VANISH_SPEED : number = 5;
        const RECOVER_TIME : number = 60;
        const WAVE_SPEED : number = Math.PI*2/120.0;
        const AMPLITUDE : number = 2;

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

            this.angle = (this.angle + WAVE_SPEED*event.tick) % (Math.PI*2);
            this.pos.y = this.initialPos.y + Math.sin(this.angle)*AMPLITUDE;

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


    private updateBumper(event : ProgramEvent) : void {

        const RECOVER_SPEED : number = 1.0/8.0;

        if (this.bumpTimer > 0) {

            this.bumpTimer = Math.max(0.0, this.bumpTimer - RECOVER_SPEED*event.tick);
        }
    }


    private checkBumperCollision(o : CollisionObject, event : ProgramEvent) : void {

        const BUMPER_RADIUS : number = 12;
        const BUMP_WEIGHT_X : number = 5.0;
        const BUMP_WEIGHT_Y : number = 4.0;

        
        // TODO: Not stable if object speed is high, but neither is any other
        // collision in this game.

        const distance : number = o.distanceTo(this);
        const r : number = o.getCollisionRadius() + BUMPER_RADIUS;

        if (distance < r) {

            const dir : Vector = Vector.direction(this.pos, o.getPosition());

            o.setSpeed(dir.x*BUMP_WEIGHT_X, dir.y*BUMP_WEIGHT_Y);
            // o.setPosition(this.pos.x + r*dir.x, this.pos.y + r*dir.y);

            this.bumpTimer = 1.0;

            event.audio.playSample(event.assets.getSample("bounce"), 0.50);
        }
    }


    private updateUnmovingPlatform(event : ProgramEvent) : void {

        const MAX_DISTANCE : number = 16.0;
        const MOVE_DELTA : number = 16.0/30.0;

        const dir : number = this.touched ? 1 : -1;

        this.pos.y = clamp(this.pos.y + MOVE_DELTA*dir*event.tick, 
            this.initialPos.y, this.initialPos.y + MAX_DISTANCE);

        this.animatePropeller(event);

        this.touched = false;
    }


    private drawChain(canvas : Canvas, bmp : Bitmap | undefined) : void {

        const CHAIN_COUNT = 7;

        const distance : number = Math.hypot(
            this.pos.x - this.initialPos.x, 
            this.pos.y - this.initialPos.y - 4);
        const distDelta : number = distance/CHAIN_COUNT;

        const c : number = Math.cos(this.angle);
        const s : number = Math.abs(Math.sin(this.angle));

        for (let i : number = 1; i < CHAIN_COUNT + 1; ++ i) {

            const distance : number = distDelta*i;

            const chainx : number = Math.round(this.initialPos.x + c*distance);
            const chainy : number = Math.round(this.initialPos.y + s*distance);

            canvas.drawBitmap(bmp, Flip.None, chainx - 8, chainy - 8, 64, 24, 16, 16);
        }
    }

    
    private drawBumper(canvas : Canvas, bmp : Bitmap | undefined) : void {

        const frame : number = Math.min(3, Math.floor(this.bumpTimer*4));

        const sx : number = frame == 3 ? 1 : frame;

        canvas.drawBitmap(bmp, Flip.None, this.pos.x - 16, this.pos.y - 16, sx*32, 72, 32, 32);
    }


    protected updateEvent(event : ProgramEvent) : void {

        if (this.appearTimer > 0) {

            this.appearTimer -= event.tick;
        }

        switch (this.type) {

        case PlatformType.HorizontallyMoving:

            this.updateHorizontallyMovingPlatform(event);
            break;

        case PlatformType.VerticallyMoving:

            this.updateVerticallyMovingPlatform(event);
            break;

        case PlatformType.Swing:

            this.updateSwing(event);
            break;

        case PlatformType.Cloud:

            this.updateCloud(event);
            break;

        case PlatformType.RectangularSwing:

            this.updateRectangularSwing(event);
            break;

        case PlatformType.Bumper:

            this.updateBumper(event);
            break;

        case PlatformType.StaticUnmoving:

            this.updateUnmovingPlatform(event);
            break;

        default:
            break;
        }
    }


    protected postMovementEvent(event: ProgramEvent) : void {

        if (this.type == PlatformType.Swing || 
            this.type == PlatformType.Cloud ||
            this.type == PlatformType.RectangularSwing) {

            this.speed.x = this.pos.x - this.oldPos.x;
            this.speed.y = this.pos.y - this.oldPos.y;
        }
    }


    public objectCollision(o : CollisionObject, event : ProgramEvent) : void {

        if (this.disappeared || this.recovering || !this.isActive() || !o.isActive() ||
            (this.type != PlatformType.Bumper && o.doesIgnoreBottomLayer())) {

            return;
        }

        if (this.type == PlatformType.Bumper) {

            this.checkBumperCollision(o, event);
            return;
        }

        this.touched = o.slopeCollision(
                this.pos.x - 24, this.pos.y - 12, 
                this.pos.x + 24, this.pos.y - 12, 1, event, 1, 1,
                1, 4, this) || this.touched;
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.isActive() || (this.disappeared && !this.recovering)) {

            return;
        }

        if (this.type == PlatformType.Bumper) {

            this.drawBumper(canvas, bmp);
            return;
        }

        if (this.type == PlatformType.Swing) {

            // Center orb
            canvas.drawBitmap(bmp, Flip.None, this.initialPos.x - 8, this.initialPos.y - 8, 48, 24, 16, 16);
            // Chain
            this.drawChain(canvas, bmp);
        }

        if (this.appearTimer > 0) {

            canvas.setAlpha(1.0 - this.appearTimer/APPEAR_TIME);
        }

        this.sprite.draw(canvas, bmp, 
            this.pos.x - 24, 
            this.pos.y - 12 + this.renderOffsetY, 
            Flip.None);

        if (this.appearTimer > 0) {

            canvas.setAlpha();
        }
    }
}
