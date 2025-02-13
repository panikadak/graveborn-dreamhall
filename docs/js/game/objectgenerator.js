import { next } from "./existingobject.js";
export class ObjectGenerator {
    constructor(baseType) {
        this.baseType = baseType;
        this.objects = new Array();
    }
    next(param) {
        let o = next(this.objects);
        if (o === undefined) {
            o = new this.baseType.prototype.constructor(param);
            this.objects.push(o);
        }
        return o;
    }
    update(event, camera, stage) {
        for (let o of this.objects) {
            if (!o.doesExist()) {
                continue;
            }
            o.cameraCheck(camera, event);
            o.update(event);
        }
    }
    draw(canvas, assets, bmp) {
        for (let o of this.objects) {
            o.draw(canvas, assets, bmp);
        }
    }
    clear() {
        this.objects.length = 0;
    }
    flush() {
        for (const o of this.objects) {
            o.forceKill();
        }
    }
}
