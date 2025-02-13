import { Vector } from "../math/vector.js";
import { RGBA } from "../math/rgba.js";
const STAR_COUNT = 256;
const MAX_DISTANCE = 192;
export class Starfield {
    constructor(r = 73, g = 146, b = 0) {
        this.distanceModifier = 0.0;
        this.angle = 0.0;
        this.seed = 1337;
        this.initialStars = new Array(STAR_COUNT);
        this.generateInitialStars();
        this.color = new RGBA(r, g, b);
    }
    nextRandom() {
        const LCG_MODULUS = 2 << 29;
        const LCG_MULTIPLIER = 22695477;
        const LCG_INCREMENT = 12345;
        return (this.seed = (LCG_MULTIPLIER * this.seed + LCG_INCREMENT) % LCG_MODULUS);
    }
    generateInitialStars() {
        for (let i = 0; i < STAR_COUNT; ++i) {
            const angle = (this.nextRandom() % 3600) / 3600 * Math.PI * 2;
            const distance = ((this.nextRandom() % 1000)) / 1000.0 * MAX_DISTANCE;
            // NOTE: initial location never used, can remove the first two
            // components
            this.initialStars[i] = new Vector(Math.cos(angle), Math.sin(angle), distance, angle);
        }
    }
    projectStar(canvas, v, scaledDistanceFactor) {
        const MIN_DISTANCE = 2;
        const t = (v.z + scaledDistanceFactor) % 1;
        const distance = t * t * MAX_DISTANCE;
        if (distance < MIN_DISTANCE) {
            return;
        }
        const angle = v.w + this.angle;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        canvas.fillRect(dx, dy, 1, 1);
    }
    update(event) {
        const DISTANCE_FACTOR_SPEED = 1.0 / 300.0;
        const ROTATION_SPEED = Math.PI * 2 / 600;
        this.distanceModifier = (this.distanceModifier + DISTANCE_FACTOR_SPEED * event.tick) % 1.0;
        this.angle = (this.angle + ROTATION_SPEED * event.tick) % (Math.PI * 2);
    }
    draw(canvas) {
        canvas.setColor(this.color.r, this.color.g, this.color.b);
        // canvas.beginSpriteBatching(undefined);
        const scaledDistanceFactor = this.distanceModifier;
        canvas.moveTo(canvas.width / 2, canvas.height / 2);
        for (const v of this.initialStars) {
            for (let i = 0; i < 2; ++i) {
                this.projectStar(canvas, v, scaledDistanceFactor + i);
            }
        }
        // canvas.endSpriteBatching();
        // canvas.drawSpriteBatch();
        canvas.setColor();
        canvas.moveTo();
    }
}
