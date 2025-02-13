import { ObjectGenerator } from "./objectgenerator.js";
import { Collectable } from "./collectable.js";
export const sampleTypeFromProgress = (progress, noCoins = false) => {
    const HEART_MAX_WEIGHT = 0.67;
    const AMMO_MAX_WEIGHT = 0.33;
    const heartWeight = HEART_MAX_WEIGHT * (1.0 - progress.getHealth() / progress.getMaxHealth());
    const ammoWeight = AMMO_MAX_WEIGHT * (1.0 - progress.getBulletCount() / progress.getMaxBulletCount());
    const p = Math.random();
    if (p < heartWeight) {
        return 2 /* CollectableType.Heart */;
    }
    else if (p < heartWeight + ammoWeight) {
        return 3 /* CollectableType.Ammo */;
    }
    return 1 /* CollectableType.Coin */;
};
export class CollectableGenerator extends ObjectGenerator {
    constructor(flyingText) {
        super(Collectable);
        this.flyingText = flyingText;
    }
    spawn(x, y, speedx, speedy, type) {
        const o = this.next();
        o.spawn(x, y, speedx, speedy, type, this.flyingText);
        return o;
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
            if (!o.doesExist() || !o.isInCamera()) {
                this.objects.splice(i, 1);
            }
        }
    }
    draw(canvas, assets) {
        const bmp = assets.getBitmap("collectables");
        for (const p of this.objects) {
            p.draw(canvas, undefined, bmp);
        }
    }
    breakableCollision(o, event) {
        for (const p of this.objects) {
            o.objectCollision(p, event, false, p.doesIgnoreCrates());
        }
    }
    playerCollision(player, event) {
        for (let o of this.objects) {
            if (!o.isActive()) {
                continue;
            }
            o.playerCollision(player, event);
        }
    }
}
