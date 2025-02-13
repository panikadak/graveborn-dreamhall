import { RGBA } from "../math/rgba.js";
import { Background } from "./background.js";
import { Camera } from "./camera.js";
const TRANSITION_TIME = 20;
export class Intro {
    constructor(event) {
        this.phase = 0;
        this.transitionTimer = 0;
        this.transitionPhase = 0;
        this.waitTimer = 0;
        this.background = new Background(event.screenHeight, 0 /* BackgroundType.Graveyard */);
        this.dummyCamera = new Camera(0, -256, event);
    }
    init(param, event) {
        event.transition.activate(false, 1 /* TransitionType.Fade */, 1.0 / 20.0, event, undefined, new RGBA(0));
    }
    update(event) {
        const WAIT_TIME = 60;
        this.background.update(this.dummyCamera, event);
        if (event.transition.isActive()) {
            return;
        }
        if (this.transitionTimer > 0) {
            this.transitionTimer -= event.tick;
            if (this.transitionTimer <= 0) {
                if (this.transitionPhase == 0) {
                    this.waitTimer = 0;
                }
                else if (this.transitionPhase == 1) {
                    ++this.phase;
                    if (this.phase == 2) {
                        event.scenes.changeScene("title", event);
                        return;
                    }
                    this.transitionPhase = 0;
                    this.transitionTimer = TRANSITION_TIME;
                }
            }
            return;
        }
        this.waitTimer += event.tick;
        if (this.waitTimer >= WAIT_TIME || event.input.isAnyPressed()) {
            this.transitionPhase = 1;
            this.transitionTimer = TRANSITION_TIME;
        }
    }
    redraw(canvas, assets) {
        const SHADOW_OFFSET = 2;
        const SHADOW_ALPHA = 0.33;
        const BACKGROUND_MASK_ALPHA = 0.25;
        this.background.draw(canvas, assets, this.dummyCamera);
        canvas.setColor(0, 0, 0, BACKGROUND_MASK_ALPHA);
        canvas.fillRect();
        canvas.setColor();
        const bmpCreatedBy = assets.getBitmap("created_by");
        if (bmpCreatedBy === undefined) {
            return;
        }
        const sw = 128 - this.phase * 64;
        const sx = this.phase * 128;
        let alpha = 1.0;
        if (this.transitionTimer > 0) {
            let t = this.transitionTimer / TRANSITION_TIME;
            if (this.transitionPhase == 0) {
                t = 1.0 - t;
            }
            alpha = t;
        }
        for (let i = 1; i >= 0; --i) {
            if (i == 1) {
                canvas.setColor(0, 0, 0, SHADOW_ALPHA * alpha);
            }
            else {
                canvas.setColor(255, 255, 255, alpha);
            }
            canvas.drawBitmap(bmpCreatedBy, 0 /* Flip.None */, canvas.width / 2 - sw / 2 + SHADOW_OFFSET * i, canvas.height / 2 - bmpCreatedBy.height / 2 + SHADOW_OFFSET * i, sx, 0, sw, bmpCreatedBy.height);
        }
        canvas.setColor();
    }
    dispose() {
        return this.background.getCloudPosition();
    }
}
