export class Sprite {
    get width() {
        return this.frameWidth;
    }
    get height() {
        return this.frameHeight;
    }
    constructor(width = 0, height = 0) {
        this.column = 0;
        this.row = 0;
        this.timer = 0.0;
        this.getColumn = () => this.column;
        this.getRow = () => this.row;
        this.getFrameTime = () => this.timer;
        this.frameWidth = width;
        this.frameHeight = height;
    }
    nextFrame(dir, startFrame, endFrame) {
        this.column += dir;
        const min = Math.min(startFrame, endFrame);
        const max = Math.max(startFrame, endFrame);
        if (this.column < min)
            this.column = max;
        else if (this.column > max)
            this.column = min;
    }
    animate(row, startFrame, endFrame, frameTime, step) {
        // To avoid semi-infinite loops
        const MAX_FRAME_SKIP = 5;
        const dir = Math.sign(endFrame - startFrame);
        // Non-positive frame speed means that the frame changes
        // infinitely fast, thus we do not animate at all
        if (frameTime <= 0) {
            return;
        }
        if (row != this.row) {
            this.column = startFrame;
            this.timer = 0;
            this.row = row;
        }
        this.timer += step;
        let frameSkipCount = 0;
        while (this.timer >= frameTime) {
            this.timer -= frameTime;
            this.nextFrame(dir, startFrame, endFrame);
            ++frameSkipCount;
            if (frameSkipCount >= MAX_FRAME_SKIP) {
                this.timer = 0;
                break;
            }
        }
    }
    draw(canvas, bmp, dx, dy, flip = 0 /* Flip.None */, scalex = this.width, scaley = this.height) {
        this.drawWithShiftedRow(canvas, bmp, dx, dy, flip, 0, scalex, scaley);
    }
    drawWithShiftedRow(canvas, bmp, dx, dy, flip = 0 /* Flip.None */, rowShift, scalex = this.width, scaley = this.height) {
        canvas.drawBitmap(bmp, flip, dx, dy, this.column * this.width, (this.row + rowShift) * this.height, this.width, this.height, scalex, scaley);
    }
    setFrame(column, row, preserveTimer = false) {
        this.column = column;
        this.row = row;
        if (!preserveTimer) {
            this.timer = 0.0;
        }
    }
    resize(newWidth, newHeight) {
        this.frameWidth = newWidth;
        this.frameHeight = newHeight;
    }
}
