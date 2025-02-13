export class VisibleObjectBuffer {
    constructor() {
        this.size = 0;
        this.objects = new Array();
    }
    refresh(masterPool) {
        this.size = 0;
        for (let o of masterPool) {
            if (o.isInCamera()) {
                this.objects[this.size] = o;
                ++this.size;
            }
        }
    }
    iterateThroughVisibleObjects(func, startIndex = 0) {
        for (let i = startIndex; i < this.size; ++i) {
            func(this.objects[i], i);
        }
    }
    clear() {
        this.size = 0;
    }
}
