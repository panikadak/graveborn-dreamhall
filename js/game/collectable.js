import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
import { CollisionObject } from "./collisionobject.js";
import { Sprite } from "../gfx/sprite.js";
import { RGBA } from "../math/rgba.js";
const EXISTENCE_TIME = 300;
const FLICKER_TIME = 60;
const BASE_GRAVITY = 3.0;
const IGNORE_CRATE_TIME = 8;
export class Collectable extends CollisionObject {
    constructor() {
        super(0, 0, false);
        this.type = 0 /* CollectableType.Unknown */;
        this.timer = 0;
        this.ignoreCratesTimer = 0;
        this.flyingText = undefined;
        this.doesIgnoreCrates = () => this.ignoreCratesTimer > 0;
        this.collisionBox = new Rectangle(0, 1, 8, 8);
        this.hitbox = new Rectangle(0, 0, 10, 10);
        this.target.x = 0;
        this.target.y = BASE_GRAVITY;
        this.friction.x = 0.025;
        this.friction.y = 0.075;
        this.cameraCheckArea = new Vector(64, 64);
        this.bounceFactor.x = 1.0;
        this.bounceFactor.y = 0.80;
        this.sprite = new Sprite(16, 16);
    }
    die(event) {
        const ANIMATION_SPEED = 4;
        this.sprite.animate(this.type - 1, 4, 8, ANIMATION_SPEED, event.tick);
        return this.sprite.getColumn() >= 8;
    }
    updateEvent(event) {
        const ANIMATION_SPEED = 6;
        this.timer -= event.tick;
        if (this.timer <= 0) {
            this.exist = false;
        }
        if (this.ignoreCratesTimer > 0) {
            this.ignoreCratesTimer -= event.tick;
        }
        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
    }
    spawn(x, y, speedx, speedy, type, flyingText) {
        this.pos = new Vector(x, y);
        this.oldPos = this.pos.clone();
        this.speed = new Vector(speedx, speedy);
        // this.target = this.speed.clone();
        this.type = type;
        this.sprite.setFrame(Math.floor(Math.random() * 4), Math.max(0, type - 1));
        this.timer = EXISTENCE_TIME;
        this.ignoreCratesTimer = IGNORE_CRATE_TIME;
        this.flyingText = flyingText;
        this.dying = false;
        this.exist = true;
    }
    draw(canvas, assets, bmp) {
        if (!this.inCamera || !this.exist ||
            (this.timer <= FLICKER_TIME && Math.floor(this.timer / 4) % 2 != 0)) {
            return;
        }
        const dx = this.pos.x - 8;
        const dy = this.pos.y - 8;
        this.sprite.draw(canvas, bmp, dx, dy, 0 /* Flip.None */);
    }
    playerCollision(player, event) {
        if (!player.isActive() || !this.isActive() || this.ignoreCratesTimer > 0) {
            return;
        }
        if (player.overlayObject(this)) {
            this.dying = true;
            this.sprite.setFrame(4, this.type - 1);
            let symbol = 0 /* FlyingTextSymbol.None */;
            let color = new RGBA();
            let count = 1;
            switch (this.type) {
                case 1 /* CollectableType.Coin */:
                    symbol = 1 /* FlyingTextSymbol.Coin */;
                    color = new RGBA(255, 255, 182);
                    player.stats.updateMoney(1);
                    event.audio.playSample(event.assets.getSample("coin"), 0.60);
                    break;
                case 2 /* CollectableType.Heart */:
                    symbol = 2 /* FlyingTextSymbol.Heart */;
                    color = new RGBA(182, 255, 0);
                    count = player.stats.updateHealth(5);
                    event.audio.playSample(event.assets.getSample("heal"), 0.70);
                    // count = 5;
                    break;
                case 3 /* CollectableType.Ammo */:
                    symbol = 3 /* FlyingTextSymbol.Ammo */;
                    color = new RGBA(182, 216, 255);
                    player.stats.updateBulletCount(5);
                    event.audio.playSample(event.assets.getSample("ammo"), 0.90);
                    count = 5;
                    break;
                case 4 /* CollectableType.Gem */:
                    symbol = 1 /* FlyingTextSymbol.Coin */;
                    color = new RGBA(255, 255, 182);
                    player.stats.updateMoney(5);
                    // TODO: Gem sound?
                    event.audio.playSample(event.assets.getSample("coin"), 0.60);
                    count = 5;
                    break;
                default:
                    break;
            }
            const ppos = player.getPosition();
            this.flyingText?.next().spawn(ppos.x, ppos.y - 8, count, symbol, color);
        }
    }
}
