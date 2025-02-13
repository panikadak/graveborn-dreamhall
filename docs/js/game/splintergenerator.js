import { Splinter } from "./splinter.js";
import { ObjectGenerator } from "./objectgenerator.js";
export class SplinterGenerator extends ObjectGenerator {
    constructor() {
        super(Splinter);
    }
    update(event, camera, stage) {
        for (let i = 0; i < this.objects.length; ++i) {
            const o = this.objects[i];
            // TODO: Should be redundant
            if (!o.doesExist()) {
                continue;
            }
            o.cameraCheck(camera, event);
            o.update(event);
            if (o.isActive()) {
                stage.objectCollision(o, event);
            }
            if (!o.isActive()) {
                this.objects.splice(i, 1);
            }
        }
    }
    draw(canvas, assets) {
        const bmp = assets.getBitmap("splinter");
        for (const p of this.objects) {
            p.draw(canvas, undefined, bmp);
        }
    }
    breakableCollision(o, event) {
        for (const p of this.objects) {
            o.objectCollision(p, event, false);
        }
    }
}
