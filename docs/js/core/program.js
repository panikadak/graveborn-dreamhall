import { ProgramEvent } from "./event.js";
export class Program {
    constructor(ctx, type, canvasWidth, canvasHeight, preserveSquarePixels = true, dynamicCanvas = false, linearFilter = false, maxCanvasWidth = undefined, maxCanvasHeight = undefined) {
        this.timeSum = 0.0;
        this.oldTime = 0.0;
        this.initialized = false;
        this.onloadEvent = undefined;
        this.animationRequest = undefined;
        this.renderer = (new type.prototype.constructor(canvasWidth, canvasHeight, preserveSquarePixels, dynamicCanvas, linearFilter, maxCanvasWidth, maxCanvasHeight));
        this.event = new ProgramEvent(ctx, this.renderer);
    }
    setDefaultTransform(canvas) {
        canvas.setColor();
        canvas.transform.setTarget(1 /* TransformTarget.Camera */);
        canvas.transform.view(canvas.width, canvas.height);
        canvas.transform.setTarget(0 /* TransformTarget.Model */);
        canvas.transform.loadIdentity();
        canvas.applyTransform();
    }
    drawLoadingScreen(canvas) {
        const OUTLINE = 1;
        const WIDTH = 80;
        const HEIGHT = 12;
        const p = this.event.assets.getLoadingPercentage();
        const dx = canvas.width / 2 - WIDTH / 2;
        const dy = canvas.height / 2 - HEIGHT / 2;
        canvas.clear(0, 0, 0);
        canvas.setColor();
        canvas.fillRect(dx, dy, WIDTH, HEIGHT);
        canvas.setColor(0, 0, 0);
        canvas.fillRect(dx + OUTLINE, dy + OUTLINE, WIDTH - OUTLINE * 2, HEIGHT - OUTLINE * 2);
        canvas.setColor();
        canvas.fillRect(dx + OUTLINE * 2, dy + OUTLINE * 2, (WIDTH - OUTLINE * 4) * p, HEIGHT - OUTLINE * 4);
    }
    checkDefaultKeyShortcuts() {
        // nw.js only
        if ((this.event.input.keyboard.getKeyState("AltLeft") & 1 /* InputState.DownOrPressed */) != 0 &&
            this.event.input.keyboard.getKeyState("Enter") == 3 /* InputState.Pressed */) {
            window["nw"]?.["Window"]?.["get"]?.()?.["toggleFullscreen"]?.();
            this.event.input.keyboard.flush();
        }
    }
    loop(ts, errorEvent) {
        const MAX_REFRESH_COUNT = 5; // Needed in the case that window gets deactivated and reactivated much later
        const FRAME_TIME = 16.66667;
        const delta = ts - this.oldTime;
        const loaded = this.event.assets.hasLoaded();
        this.timeSum = Math.min(this.timeSum + delta, MAX_REFRESH_COUNT * FRAME_TIME);
        this.oldTime = ts;
        this.event.input.gamepad.refreshGamepads();
        try {
            if (loaded && !this.initialized) {
                this.onloadEvent?.(this.event);
                this.event.scenes.init(this.event);
                this.initialized = true;
            }
            let firstFrame = true;
            for (; this.timeSum >= FRAME_TIME; this.timeSum -= FRAME_TIME) {
                this.event.input.preUpdate();
                if (firstFrame && window["nw"] !== undefined) {
                    this.checkDefaultKeyShortcuts();
                }
                if (loaded) {
                    this.event.scenes.update(this.event);
                    this.event.transition.update(this.event);
                }
                if (firstFrame) {
                    this.event.input.update(this.event);
                    firstFrame = false;
                }
            }
            this.renderer.drawToCanvas((canvas) => {
                this.setDefaultTransform(canvas);
                canvas.flushSpriteBatch();
                if (loaded) {
                    this.event.scenes.redraw(canvas, this.event.assets);
                    this.event.transition.draw(canvas);
                    this.event.scenes.postDraw(canvas, this.event.assets);
                }
                else {
                    this.drawLoadingScreen(canvas);
                }
                this.setDefaultTransform(canvas);
                this.event.drawCursor(canvas);
            });
            this.renderer.refresh();
        }
        catch (e) {
            if (this.animationRequest !== undefined) {
                window.cancelAnimationFrame(this.animationRequest);
            }
            errorEvent?.(e);
            return;
        }
        this.animationRequest = window.requestAnimationFrame(ts => this.loop(ts, errorEvent));
    }
    run(initialEvent, onload, errorEvent) {
        initialEvent?.(this.event);
        this.onloadEvent = onload;
        this.loop(0.0, errorEvent);
    }
    getEvent() {
        return this.event;
    }
}
