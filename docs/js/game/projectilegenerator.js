import { Projectile } from "./projectile.js";
import { ObjectGenerator } from "./objectgenerator.js";
export class ProjectileGenerator extends ObjectGenerator {
    constructor() {
        super(Projectile);
    }
    update(event, camera, stage) {
        for (let o of this.objects) {
            if (!o.doesExist()) {
                continue;
            }
            o.cameraCheck(camera, event);
            o.update(event);
            if (o.isActive()) {
                stage.objectCollision(o, event);
            }
        }
    }
    draw(canvas, assets) {
        const bmp = assets.getBitmap("projectiles");
        for (let p of this.objects) {
            p.draw(canvas, undefined, bmp);
        }
    }
    // TODO: This versus iterate over?
    breakableCollision(o, event) {
        for (const p of this.objects) {
            o.projectileCollision(p, event);
            // o.objectCollision(p, event, false, true);
        }
    }
    enemyCollision(e, event) {
        for (const p of this.objects) {
            e.projectileCollision(p, event);
        }
    }
    playerCollision(player, event) {
        for (let o of this.objects) {
            if (!o.isActive()) {
                continue;
            }
            player.projectileCollision(o, event);
        }
    }
}
