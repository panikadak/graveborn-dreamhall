import { RGBA } from "../math/rgba.js";
import { Vector } from "../math/vector.js";
;
export class Transition {
    constructor() {
        this.timer = 1.0;
        this.fadeOut = false;
        this.effectType = 0 /* TransitionType.None */;
        this.active = false;
        this.speed = 1.0;
        this.center = undefined;
        this.callback = undefined;
        this.frozen = false;
        this.isActive = () => this.active;
        this.isFadingOut = () => this.active && this.fadeOut;
        this.getEffectType = () => this.effectType;
        this.getTimer = () => this.timer;
        this.getColor = () => this.color.clone();
        this.color = new RGBA(0, 0, 0);
    }
    activate(fadeOut, type, speed, event, callback = undefined, color = new RGBA(0, 0, 0), center = undefined) {
        if (type == 3 /* TransitionType.Waves */) {
            this.active = false;
            event.cloneCanvasToBufferTexture(true);
        }
        this.fadeOut = fadeOut;
        this.speed = speed;
        this.timer = 1.0;
        this.callback = callback;
        this.effectType = type;
        this.color = color;
        this.center = center;
        this.active = true;
    }
    update(event) {
        if (!this.active || this.frozen) {
            return;
        }
        this.timer -= this.speed * event.tick;
        if (this.timer <= 0) {
            this.fadeOut = !this.fadeOut;
            if (!this.fadeOut) {
                this.timer += 1.0;
                this.callback?.(event);
                return;
            }
            this.active = false;
            this.timer = 0;
            // For reasons
            // ...this does not work as intended
            // this.color = new RGBA(0, 0, 0);
        }
    }
    draw(canvas) {
        const MAX_AMPLITUDE = 0.25;
        const MIN_PERIOD = 0.25;
        if (!this.active || this.effectType == 0 /* TransitionType.None */) {
            return;
        }
        let t = this.timer;
        if (this.fadeOut) {
            t = 1.0 - t;
        }
        switch (this.effectType) {
            case 3 /* TransitionType.Waves */: {
                const amplitude = t * MAX_AMPLITUDE * canvas.width;
                const period = ((1.0 - t) + t * MIN_PERIOD) * canvas.height;
                const shift = Math.PI * 2 * t;
                canvas.clear(this.color.r, this.color.g, this.color.b);
                canvas.drawHorizontallyWavingBitmap(canvas.getCloneBufferBitmap(), amplitude, period, shift, 2 /* Flip.Vertical */, 0, 0);
            }
            // Fallthrough
            case 1 /* TransitionType.Fade */:
                canvas.setColor(this.color.r, this.color.g, this.color.b, t);
                canvas.fillRect(0, 0, canvas.width, canvas.height);
                break;
            case 2 /* TransitionType.Circle */:
                {
                    const center = this.center ?? new Vector(canvas.width / 2, canvas.height / 2);
                    const maxRadius = Math.max(Math.hypot(center.x, center.y), Math.hypot(canvas.width - center.x, center.y), Math.hypot(canvas.width - center.x, canvas.height - center.y), Math.hypot(center.x, canvas.height - center.y));
                    const radius = (1 - t) * (1 - t) * maxRadius;
                    canvas.setColor(this.color.r, this.color.g, this.color.b);
                    canvas.fillCircleOutside(center.x, center.y, radius);
                }
                break;
            default:
                break;
        }
        canvas.setColor();
    }
    deactivate() {
        this.active = false;
    }
    setCenter(pos) {
        this.center = pos;
    }
    changeSpeed(newSpeed) {
        this.speed = newSpeed;
    }
    freeze() {
        this.frozen = true;
    }
    unfreeze() {
        this.frozen = false;
    }
}
