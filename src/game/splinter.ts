import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";
import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
import { CollisionObject } from "./collisionobject.js";


const EXISTENCE_TIME : number = 90;
const BASE_GRAVITY : number = 4.0;


export class Splinter extends CollisionObject {


    private row : number = 0;
    private frame : number = 0;

    private timer : number = 0;


    constructor() {

        super(0, 0, false);

        this.collisionBox = new Rectangle(0, 0, 6, 6);

        this.target.x = 0;
        this.target.y = BASE_GRAVITY;

        this.friction.x = 0.02;
        this.friction.y = 0.15;

        this.cameraCheckArea = new Vector(8, 8);

        this.bounceFactor.x = 1.0;
        this.bounceFactor.y = 0.5;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        this.timer -= event.tick;
        if (this.timer <= 0) {

            this.exist = false;
        }
    }


    public spawn(x : number, y : number, speedx : number, speedy : number, row : number, frame : number) : void {

        this.pos = new Vector(x, y);
        this.oldPos = this.pos.clone();

        this.speed = new Vector(speedx, speedy);
        // this.target = this.speed.clone();

        this.row = row;

        this.frame = frame;

        this.timer = EXISTENCE_TIME;

        this.dying = false;
        this.exist = true;
    }


    public draw(canvas: Canvas, assets: Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.inCamera || !this.exist) {

            return;
        }

        const dx : number = this.pos.x - 8;
        const dy : number = this.pos.y - 8;

        canvas.setAlpha(this.timer/EXISTENCE_TIME);
        canvas.drawBitmap(bmp, Flip.None, dx, dy, this.frame*16, this.row*16, 16, 16);
        canvas.setAlpha();
    }
}
