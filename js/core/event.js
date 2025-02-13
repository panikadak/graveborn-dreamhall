import { AudioPlayer } from "../audio/audioplayer.js";
import { Assets } from "./assets.js";
import { Input } from "./input.js";
import { SceneManager } from "./scenemanager.js";
import { Transition } from "./transition.js";
import { Localization } from "./localization.js";
import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
export class ProgramEvent {
    get screenWidth() {
        return this.renderer.canvasWidth;
    }
    get screenHeight() {
        return this.renderer.canvasHeight;
    }
    get localization() {
        return this.activeLocalization;
    }
    constructor(ctx, renderer) {
        this.activeLocalization = undefined;
        this.cursorBitmap = undefined;
        this.tick = 1.0;
        this.input = new Input();
        this.audio = new AudioPlayer(ctx);
        this.assets = new Assets(this.audio, renderer);
        this.transition = new Transition();
        this.scenes = new SceneManager();
        this.renderer = renderer;
        this.localizations = new Map();
        // TODO: Unused, remove?
        this.cursorSpriteArea = new Rectangle(0, 0, 16, 16);
        this.cursorCenter = new Vector();
    }
    addLocalizationJSON(key, jsonString) {
        this.localizations.set(key, new Localization(jsonString));
    }
    setActiveLocalization(key) {
        this.activeLocalization = this.localizations.get(key);
    }
    cloneCanvasToBufferTexture(forceRedraw = false) {
        if (forceRedraw) {
            this.renderer.drawToCanvas((canvas) => {
                this.scenes.redraw(canvas, this.assets, true);
            });
        }
        this.renderer.cloneCanvasToBufferBitmap();
    }
    createBitmapFromPixelData(pixels, width, height) {
        return this.renderer.createBitmapFromPixelData(pixels, width, height);
    }
    setCursorSprite(bmp, sx = 0, sy = 0, sw = bmp?.width ?? 16, sh = bmp?.height ?? 16, centerx = 0.0, centery = 0.0) {
        this.cursorBitmap ?? (this.cursorBitmap = bmp);
        this.cursorSpriteArea = new Rectangle(sx, sy, sw, sh);
        this.cursorCenter = new Vector(centerx, centery);
    }
    drawCursor(canvas) {
        if (this.cursorBitmap === undefined) {
            return;
        }
        this.input.mouse.computeScaledPosition(this);
        const p = this.input.mouse.getPosition();
        const dx = Math.round(p.x - this.cursorCenter.x);
        const dy = Math.round(p.y - this.cursorCenter.y);
        canvas.setColor();
        canvas.drawBitmap(this.cursorBitmap, 0 /* Flip.None */, dx, dy, this.cursorSpriteArea.x, this.cursorSpriteArea.y, this.cursorSpriteArea.w, this.cursorSpriteArea.h);
    }
}
