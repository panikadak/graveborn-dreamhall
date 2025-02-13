import { CollisionObject } from "../collisionobject.js";
import { Sprite } from "../../gfx/sprite.js";
import { Vector } from "../../math/vector.js";
import { Rectangle } from "../../math/rectangle.js";
import { RGBA } from "../../math/rgba.js";
import { sampleTypeFromProgress } from "../collectablegenerator.js";
import { sampleWeightedUniform } from "../../math/random.js";
const HURT_TIME = 30;
const COIN_TYPE_LOOKUP = [1 /* CollectableType.Coin */, 4 /* CollectableType.Gem */, 5 /* CollectableType.CoinBag */];
export const BASE_GRAVITY = 5.0;
export class Enemy extends CollisionObject {
    constructor(x, y) {
        super(x, y, true);
        this.hurtID = -1;
        this.projectileHurtID = -1;
        this.underWater = false;
        this.flyingText = undefined;
        this.collectables = undefined;
        this.hurtTimer = 0;
        this.flip = 0 /* Flip.None */;
        this.bodyOpacity = 1.0;
        this.attackPower = 1;
        this.health = 5;
        this.dropProbability = 0.5;
        this.doesNotDropCoins = false;
        this.canBeMoved = true;
        this.canBeHurt = true;
        this.canHurtPlayer = true;
        this.canMoveOthers = true;
        this.immuneToLava = false;
        this.radius = 6;
        this.didTouchSurface = false;
        this.knockbackFactor = 1.0;
        this.projectiles = undefined;
        this.overriddenHurtbox = undefined;
        this.deathSound = "kill";
        this.shakeEvent = undefined;
        this.initialPos = this.pos.clone();
        this.sprite = new Sprite(24, 24);
        this.cameraCheckArea = new Vector(32, 32);
        this.collisionBox = new Rectangle(0, 1, 12, 12);
        this.hitbox = new Rectangle(0, 1, 12, 12);
        this.target.y = BASE_GRAVITY;
        this.friction = new Vector(0.10, 0.15);
        this.coinTypeWeights = [0.95, 0.05, 0.0];
    }
    spawnCollectables(dir, stats) {
        const LAUNCH_SPEED_X = 1.0;
        const LAUNCH_SPEED_Y = 2.0;
        const BASE_JUMP = -1.0;
        const LUCKY_CHARM_GEM_BONUS = 0.25;
        // We don't need to adjust them back since dead enemies are removed
        // from the list anyway
        if (stats.hasItem(42 /* Item.LuckyCharm */)) {
            this.coinTypeWeights[1] *= (1.0 + LUCKY_CHARM_GEM_BONUS);
            this.coinTypeWeights[0] = 1.0 - this.coinTypeWeights[1];
        }
        let baseType = sampleTypeFromProgress(stats);
        if (baseType == 1 /* CollectableType.Coin */) {
            if (this.doesNotDropCoins) {
                return;
            }
            baseType = COIN_TYPE_LOOKUP[sampleWeightedUniform(this.coinTypeWeights)] ?? 1 /* CollectableType.Coin */;
        }
        this.collectables.spawn(this.pos.x, this.pos.y, dir.x * LAUNCH_SPEED_X, dir.y * LAUNCH_SPEED_Y + BASE_JUMP, baseType);
    }
    initiateDeath(stats, event, dir) {
        const LUCKY_CHARM_BONUS = 0.50;
        let dropProb = this.dropProbability;
        if (stats?.hasItem(42 /* Item.LuckyCharm */) ?? false) {
            dropProb *= (1.0 + LUCKY_CHARM_BONUS);
        }
        if (stats !== undefined && Math.random() < dropProb) {
            this.spawnCollectables(dir ?? new Vector(), stats);
        }
        event.audio.playSample(event.assets.getSample(this.deathSound), 0.60);
        this.dying = true;
        this.sprite.setFrame(0, 0);
    }
    takeDamage(amount, stats, event, dir, player) {
        if (!this.canBeHurt) {
            return;
        }
        this.flyingText?.next()
            .spawn(this.pos.x, this.pos.y - 8, -amount, 0 /* FlyingTextSymbol.None */);
        this.health -= amount;
        if (this.health <= 0) {
            this.initiateDeath(stats, event, dir);
            if (player !== undefined) {
                const restoredHealth = player.checkVampirism();
                if (restoredHealth !== null) {
                    const playerPos = player.getPosition();
                    this.flyingText?.next().spawn(playerPos.x, playerPos.y - 8, restoredHealth, 2 /* FlyingTextSymbol.Heart */, new RGBA(182, 255, 0));
                }
            }
            return;
        }
        event.audio.playSample(event.assets.getSample("hit"), 0.70);
        this.hurtTimer = HURT_TIME;
    }
    die(event) {
        const ANIMATION_SPEED = 5;
        this.flip = 0 /* Flip.None */;
        this.sprite.animate(0, 0, 4, ANIMATION_SPEED, event.tick);
        return this.sprite.getColumn() >= 4;
    }
    slopeCollisionEvent(direction, event) {
        if (direction == 1) {
            this.touchSurface = true;
        }
    }
    waterCollision(x, y, w, h, event, surface = false) {
        if (!this.isActive()) {
            return false;
        }
        if (this.overlayCollisionArea(x - 1, y - 1, w + 2, h + 2)) {
            this.underWater = true;
            return true;
        }
        return false;
    }
    lavaCollision(y, event) {
        if (!this.isActive() || this.immuneToLava || !this.takeCollisions) {
            return false;
        }
        if (this.pos.y + this.collisionBox.y + this.collisionBox.h / 2 < y) {
            return false;
        }
        this.initiateDeath(undefined, event);
        return true;
    }
    updateEvent(event) {
        const UNDERWATER_GRAVITY = 0.75;
        this.updateLogic?.(event);
        if (this.underWater) {
            this.target.y = Math.min(this.target.y, UNDERWATER_GRAVITY);
            this.speed.y = Math.min(this.speed.y, UNDERWATER_GRAVITY);
        }
        if (this.hurtTimer > 0) {
            this.hurtTimer -= event.tick;
        }
        this.didTouchSurface = this.touchSurface;
        this.touchSurface = false;
        this.underWater = false;
    }
    draw(canvas, assets, bmp) {
        if (!this.exist || !this.inCamera) {
            return;
        }
        // Flicker if hurt
        if (!this.dying && this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer / 4) % 2 != 0) {
            return;
        }
        const dx = this.pos.x - this.sprite.width / 2;
        const dy = this.pos.y - this.sprite.height / 2;
        const changeAlpha = this.bodyOpacity < 1.0;
        if (changeAlpha) {
            canvas.setAlpha(this.bodyOpacity);
        }
        this.sprite.draw(canvas, bmp, dx, dy, this.flip);
        if (changeAlpha) {
            canvas.setAlpha();
        }
    }
    playerCollision(player, event) {
        const KNOCKBACK_SPEED = 1.5;
        const POWER_ATTACK_PICKUP_SPEED_FACTOR = 1.5;
        if (!this.isActive() || !player.isActive()) {
            return;
        }
        this.playerEvent?.(player, event);
        const attackID = player.getAttackID();
        if (this.hurtID != attackID && player.overlaySwordAttackArea(this)) {
            const ppos = player.getPosition();
            const dir = Vector.direction(ppos, this.pos);
            let knockback = KNOCKBACK_SPEED * this.knockbackFactor * player.getKnockbackFactor();
            if (player.isChargeAttacking()) {
                // knockback *= POWER_ATTACK_KNOCK_MULTIPLIER;
                dir.x *= POWER_ATTACK_PICKUP_SPEED_FACTOR;
                dir.y *= POWER_ATTACK_PICKUP_SPEED_FACTOR;
            }
            this.hurtID = attackID;
            this.takeDamage(player.getAttackPower(), player.stats, event, dir, player);
            if (!this.dying) {
                player.stopPowerAttack();
            }
            if (player.performDownAttackJump()) {
                this.downAttackEvent?.(player, event);
                return;
            }
            if (this.canBeHurt && this.canBeMoved) {
                this.speed.x = Math.sign(this.pos.x - ppos.x) * knockback;
            }
        }
        if (this.canHurtPlayer &&
            (this.overriddenHurtbox !== undefined && player.overlayRect(this.pos, this.overriddenHurtbox)) ||
            (this.overriddenHurtbox === undefined && this.overlayObject(player))) {
            player.applyDamage(this.attackPower, Math.sign(player.getPosition().x - this.pos.x), event);
        }
    }
    projectileCollision(p, event) {
        const KNOCKBACK_SPEED = 1.25;
        if (!this.isActive() || !p.isActive() || !p.isFriendly()) {
            return;
        }
        const attackID = p.getAttackID();
        if (p.overlayObject(this) && (p.destroyOnTouch() || attackID != this.projectileHurtID)) {
            const ppos = p.getPosition();
            if (p.destroyOnTouch()) {
                p.kill(event);
            }
            else {
                this.projectileHurtID = attackID;
            }
            if (this.canBeMoved) {
                this.speed.x = Math.sign(this.pos.x - p.getPosition().x) * KNOCKBACK_SPEED * this.knockbackFactor;
            }
            this.takeDamage(p.getPower(), p.stats, event, Vector.direction(ppos, this.pos));
        }
    }
    enemyCollision(enemy, event) {
        if (!this.isActive() || !enemy.isActive()) {
            return;
        }
        const dist = Vector.distance(enemy.pos, this.pos);
        const collisionDistance = this.radius + enemy.radius;
        if (dist >= collisionDistance) {
            return;
        }
        if (!this.canMoveOthers || !enemy.canMoveOthers) {
            return;
        }
        const dir = Vector.direction(enemy.pos, this.pos);
        const div = Number(this.canBeMoved) + Number(enemy.canBeMoved);
        if (this.canBeMoved) {
            this.pos.x += dir.x * (collisionDistance - dist) / div;
            this.pos.y += dir.y * (collisionDistance - dist) / div;
            this.enemyCollisionEvent?.(enemy, event);
        }
        if (enemy.canBeMoved) {
            enemy.pos.x -= dir.x * (collisionDistance - dist) / div;
            enemy.pos.x -= dir.y * (collisionDistance - dist) / div;
            enemy.enemyCollisionEvent?.(this, event);
        }
    }
    passGenerators(flyingText, collectables, projectiles) {
        this.flyingText = flyingText;
        this.collectables = collectables;
        this.projectiles = projectiles;
    }
    passShakeEvent(shakeEvent) {
        this.shakeEvent = shakeEvent;
    }
    softKill() {
        this.dying = true;
        this.health = 0;
    }
    setSpeed(speedx, speedy) {
        this.speed.x = speedx * this.knockbackFactor;
        this.speed.y = speedy;
    }
}
