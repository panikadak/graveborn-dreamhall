import { sampleInterpolatedWeightedUniform } from "../../math/random.js";
import { Rectangle } from "../../math/rectangle.js";
import { clamp } from "../../math/utility.js";
import { Vector } from "../../math/vector.js";
import { updateSpeedAxis } from "../utility.js";
import { Enemy } from "./enemy.js";
const INITIAL_Y = 80;
const HEALTH = 128;
const BASE_ATTACK_TIME = 240;
const MIN_ATTACK_TIME = 120;
const DEATH_TIME = 120;
const ATTACK_WEIGHTS_INITIAL = [
    0.40,
    0.10,
    0.20,
    0.30
];
const ATTACK_WEIGHTS_FINAL = [
    0.25,
    0.25,
    0.25,
    0.25
];
export class Eye extends Enemy {
    constructor(x, y, spawnGhostCallback, deathEvent, triggerDeathEvent) {
        super(x, y);
        this.initialPosReached = false;
        this.attackTimer = BASE_ATTACK_TIME / 2;
        this.attackType = -1 /* Attack.None */;
        // private previousAttack : Attack = Attack.None;
        this.attacking = false;
        this.phase = 0;
        this.flickerTimer = 0;
        this.initialHealth = 0;
        this.healthBarPos = 0.0;
        this.playerRef = undefined;
        this.dashing = false;
        // Some grade A variable naming here
        this.crushing = false;
        this.crushCount = 0;
        this.recoveringFromCrush = false;
        this.verticalDirection = 0;
        this.bodyWave = 0;
        this.ghostSpawnTimer = 0;
        this.previousDirection = 0;
        this.deathTimer = 0;
        this.deathTriggered = false;
        this.sprite.resize(64, 64);
        this.sprite.setFrame(1, 0);
        this.health = HEALTH;
        this.initialHealth = this.health;
        this.attackPower = 3;
        this.dropProbability = 0.0;
        this.collisionBox = new Rectangle(0, 0, 60, 60);
        this.hitbox = new Rectangle(0, 0, 56, 56);
        this.overriddenHurtbox = new Rectangle(0, 0, 40, 40);
        this.target.zeros();
        this.ignoreBottomLayer = true;
        // this.canHurtPlayer = false;
        this.friction.x = 0.15;
        this.friction.y = 0.15;
        this.knockbackFactor = 1.0;
        this.dashDirection = new Vector();
        this.spawnGhostCallback = spawnGhostCallback;
        this.deathEvent = deathEvent;
        this.triggerDeathEvent = triggerDeathEvent;
        this.cameraCheckArea.x = 1024;
        this.cameraCheckArea.y = 1024;
        this.deathSound = "eye_death";
        this.dir = Math.random() > 0.5 ? 1 : -1;
        this.verticalDirection = 1;
        this.canBeMoved = false;
    }
    reachInitialPos(event) {
        this.speed.y = -0.5 - (this.pos.y - INITIAL_Y) / 64;
        this.target.y = this.speed.y;
    }
    multishot(event) {
        const PROJECTILE_SPEED = 1.5;
        const count = this.health < this.initialHealth / 2 ? 8 : 6;
        const angleOff = count == 6 ? Math.PI / 12 : 0;
        for (let i = 0; i < count; ++i) {
            const angle = angleOff + Math.PI * 2 / count * i;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            this.projectiles?.next().spawn(this.pos.x, this.pos.y, this.pos.x, this.pos.y, dx * PROJECTILE_SPEED, dy * PROJECTILE_SPEED, 3, 2, false);
        }
    }
    gigaShot(event) {
        const PROJECTILE_SPEED = 1.5;
        if (this.playerRef === undefined) {
            return;
        }
        const dir = Vector.direction(this.pos, this.playerRef.getPosition());
        this.projectiles?.next().spawn(this.pos.x, this.pos.y, this.pos.x, this.pos.y, dir.x * PROJECTILE_SPEED, dir.y * PROJECTILE_SPEED, 4, 3, false, -1, this.playerRef, PROJECTILE_SPEED);
    }
    spawnCrushProjectiles() {
        const BASE_SPEED = 0.33;
        const JUMP_SPEED = -2.75;
        const YOFF = 24;
        for (let i = -2; i <= 2; ++i) {
            if (i == 0) {
                continue;
            }
            const speedx = Math.sign(i) * i * i * BASE_SPEED;
            const speedy = (Math.abs(i) == 1 ? 1.25 : 1.0) * JUMP_SPEED;
            this.projectiles?.next().spawn(this.pos.x, this.pos.y + YOFF, this.pos.x, this.pos.y + YOFF, speedx, speedy, 3, 2, false, -1, undefined, 0.0, true);
        }
    }
    initiateDash(event) {
        const DASH_BASE_SPEED = 3.0;
        const DASH_BONUS = 2.0;
        const speed = DASH_BASE_SPEED + (1.0 - this.health / this.initialHealth) * DASH_BONUS;
        this.speed.x = this.dashDirection.x * speed;
        this.speed.y = this.dashDirection.y * speed;
        this.dashing = true;
    }
    initiateCrush(event) {
        const DISTANCE_DIVISOR = 128;
        this.crushing = true;
        this.crushCount = (4 - Math.ceil(this.health / this.initialHealth * 3)) + 1;
        this.recoveringFromCrush = true;
        this.target.x = ((this.playerRef?.getPosition().x ?? 0) - this.pos.x) / DISTANCE_DIVISOR;
        this.speed.y = 0.01;
        this.bounceFactor.x = 1.0;
    }
    updateDash(event) {
        const STOP_THRESHOLD = 0.1;
        this.friction.x = 0.025;
        this.friction.y = 0.025;
        this.bounceFactor.x = 1.0;
        this.bounceFactor.y = 1.0;
        this.canBeMoved = false;
        if (this.speed.length <= STOP_THRESHOLD) {
            this.dashing = false;
        }
    }
    updateCrushAttack(event) {
        const TARGET_GRAVITY = 8.0;
        this.target.y = TARGET_GRAVITY;
        this.friction.y = 0.15; // this.speed.y > 0 ? 0.5 : 0.15;
        if (this.recoveringFromCrush && this.speed.y > 0) {
            this.recoveringFromCrush = false;
            --this.crushCount;
            if (this.crushCount <= 0) {
                this.crushing = false;
                this.sprite.setFrame(1, 0);
                this.target.zeros();
                return;
            }
        }
        // this.bounceFactor.y = 1.0;
    }
    performAttack(event) {
        const FLICKER_TIME = 60;
        const CLOSE_EYE_SPEED = 6;
        const LOAD_SPEED = 0.5;
        if (this.playerRef === undefined) {
            return;
        }
        switch (this.attackType) {
            case 1 /* Attack.Shoot2 */:
            case 0 /* Attack.Shoot1 */:
                if (this.phase == 0) {
                    this.sprite.animate(0, 2, 5, this.sprite.getColumn() == 4 ? CLOSE_EYE_SPEED * 3 : CLOSE_EYE_SPEED, event.tick);
                    if (this.sprite.getColumn() == 5) {
                        this.sprite.setFrame(4, 0);
                        ++this.phase;
                    }
                }
                else {
                    const oldColumn = this.sprite.getColumn();
                    this.sprite.animate(0, 4, 1, CLOSE_EYE_SPEED, event.tick);
                    if (oldColumn == 4 && this.sprite.getColumn() == 3) {
                        event.audio.playSample(event.assets.getSample("throw"), 0.50);
                        if (this.attackType == 0 /* Attack.Shoot1 */) {
                            this.multishot(event);
                        }
                        else {
                            this.gigaShot(event);
                        }
                    }
                    if (this.sprite.getColumn() == 1) {
                        this.attacking = false;
                    }
                }
                break;
            case 2 /* Attack.Crush */:
            case 3 /* Attack.Dash */:
                if (this.flickerTimer == 0) {
                    this.flickerTimer = FLICKER_TIME;
                    this.dashDirection = Vector.direction(this.pos, this.playerRef.getPosition());
                    if (this.attackType == 3 /* Attack.Dash */) {
                        this.target.x = -this.dashDirection.x * LOAD_SPEED;
                        this.target.y = -this.dashDirection.y * LOAD_SPEED;
                    }
                    else {
                        this.sprite.setFrame(2, 0);
                    }
                    event.audio.playSample(event.assets.getSample("charge2"), 0.50);
                    break;
                }
                this.flickerTimer -= event.tick;
                if (this.flickerTimer <= 0) {
                    this.target.zeros();
                    this.attacking = false;
                    if (this.attackType == 3 /* Attack.Dash */) {
                        this.initiateDash(event);
                        break;
                    }
                    this.initiateCrush(event);
                }
                break;
            default:
                break;
        }
    }
    resetStats() {
        const t = 1.0 - this.health / this.initialHealth;
        this.friction.x = 0.15 * (1.0 + 0.5 * t);
        this.friction.y = 0.025 * (1.0 + 0.5 * t); //this.friction.x;
        this.knockbackFactor = 1.0;
        this.bounceFactor.x = 1.0;
        this.bounceFactor.y = 1.0;
        this.canBeMoved = true;
        this.flip = 0 /* Flip.None */;
    }
    updateWaving(event) {
        const VERTICAL_SPEED = 0.25;
        const HORIZONTAL_SPEED = 0.33;
        const TRIGGER_DISTANCE = 16;
        const MIDDLE_Y = 7 * 16;
        const t = 1.0 - this.health / this.initialHealth;
        const bonus = 1.0 + 0.5 * t;
        if (this.dir == 0) {
            this.dir = (this.playerRef?.getPosition().x ?? 0) > this.pos.x ? 1 : -1;
            this.verticalDirection = this.pos.y > MIDDLE_Y ? -1 : 1;
        }
        this.target.x = this.dir * HORIZONTAL_SPEED * bonus;
        if ((this.verticalDirection > 0 && this.pos.y - MIDDLE_Y > TRIGGER_DISTANCE) ||
            (this.verticalDirection < 0 && MIDDLE_Y - this.pos.y > TRIGGER_DISTANCE)) {
            this.verticalDirection *= -1;
        }
        this.target.y = this.verticalDirection * VERTICAL_SPEED * bonus;
    }
    updateBodyWave(event) {
        const BODY_WAVE = Math.PI * 2 / 120.0;
        const t = 1.0 - this.health / this.initialHealth;
        const bonus = 1.0 + t;
        this.bodyWave = (this.bodyWave + BODY_WAVE * bonus * event.tick) % (Math.PI * 2);
    }
    updateGhostGenerator(event) {
        const BASE_GHOST_TIME = 240;
        const count = this.health < this.initialHealth / 2 ? 2 : 1;
        this.ghostSpawnTimer += event.tick;
        if (this.ghostSpawnTimer < BASE_GHOST_TIME) {
            return;
        }
        let dir = 0;
        if (this.previousDirection == 0) {
            dir = Math.random() < 0.5 ? 1 : -1;
        }
        else {
            dir = -this.previousDirection;
        }
        this.previousDirection = dir;
        for (let i = 0; i < count; ++i) {
            this.spawnGhostCallback(this.previousDirection);
            if (count > 0) {
                this.previousDirection *= -1;
            }
        }
        this.ghostSpawnTimer -= BASE_GHOST_TIME;
    }
    updateHealthbarPos(event) {
        const speed = this.health < this.initialHealth ? 0.005 : 0.015;
        this.healthBarPos = clamp(updateSpeedAxis(this.healthBarPos, this.health / this.initialHealth, speed * event.tick), 0.0, 1.0);
    }
    drawDeath(canvas, bmp) {
        const t = this.deathTimer / DEATH_TIME;
        canvas.drawFunnilyAppearingBitmap(bmp, 0 /* Flip.None */, this.pos.x - 32, this.pos.y - 32, 64, 0, 64, 64, t, 128, 4, 4);
    }
    slopeCollisionEvent(direction, event) {
        const CRUSH_JUMP_SPEED = -5.0;
        if (direction == 1 && this.crushing) {
            this.recoveringFromCrush = true;
            event.audio.playSample(event.assets.getSample("thwomp"), 0.50);
            this.speed.y = CRUSH_JUMP_SPEED;
            this.spawnCrushProjectiles();
            this.shakeEvent?.(30, 4);
        }
        if (this.dashing) {
            event.audio.playSample(event.assets.getSample("thwomp"), 0.50);
        }
    }
    wallCollisionEvent(direction, event) {
        if (this.dashing) {
            event.audio.playSample(event.assets.getSample("thwomp"), 0.50);
        }
        if (!this.dashing && !this.crushing && !this.attacking) {
            this.dir *= -1;
        }
    }
    updateLogic(event) {
        this.updateGhostGenerator(event);
        this.updateBodyWave(event);
        this.updateHealthbarPos(event);
        if (!this.initialPosReached) {
            this.reachInitialPos(event);
            return;
        }
        if (this.attacking) {
            this.performAttack(event);
            return;
        }
        if (this.dashing) {
            this.updateDash(event);
            return;
        }
        if (this.crushing) {
            this.updateCrushAttack(event);
            return;
        }
        this.resetStats();
        this.updateWaving(event);
        this.attackTimer -= event.tick;
        if (this.attackTimer <= 0) {
            const t = this.health / this.initialHealth;
            this.target.zeros();
            this.attackType = sampleInterpolatedWeightedUniform(ATTACK_WEIGHTS_INITIAL, ATTACK_WEIGHTS_FINAL, 1.0 - this.health / this.initialHealth);
            /*
            if (this.attackType == this.previousAttack) {

                this.attackType = (this.attackType + 1) % Attack.AttackCount;
            }
            this.previousAttack = this.attackType;
            */
            this.attackTimer += t * BASE_ATTACK_TIME + (1.0 - t) * MIN_ATTACK_TIME;
            this.attacking = true;
            this.phase = 0;
            this.flickerTimer = 0;
            this.dir = 0;
            this.bounceFactor.zeros();
        }
    }
    postMovementEvent(event) {
        if (!this.initialPosReached && this.pos.y < INITIAL_Y) {
            this.pos.y = INITIAL_Y;
            this.initialPosReached = true;
            this.target.zeros();
            this.speed.zeros();
        }
    }
    downAttackEvent(player, event) {
        const KNOCKBACK = 1.5;
        /*
        if (this.dashing || this.crushing) {

            return;
        }
        */
        // this.speed.x = (this.pos.x - player.getPosition().x)/24*KNOCKBACK;
        this.speed.y = KNOCKBACK;
        this.attackTimer = Math.min(this.attackTimer, 30);
    }
    die(event) {
        if (event.audio.isMusicPlaying()) {
            event.audio.stopMusic();
        }
        if (!this.deathTriggered) {
            this.triggerDeathEvent?.(event);
            this.deathTriggered = true;
        }
        const shakeAmount = Math.floor(this.deathTimer / 6);
        this.shakeEvent?.(2, shakeAmount);
        this.updateHealthbarPos(event);
        this.deathTimer += event.tick;
        if (this.deathTimer >= DEATH_TIME) {
            this.deathEvent(event);
            return true;
        }
        return false;
    }
    playerEvent(player, event) {
        this.playerRef = player;
    }
    draw(canvas, assets, bmp) {
        if (!this.exist || !this.inCamera) {
            return;
        }
        const bmpEye = assets?.getBitmap("eye");
        if (this.dying) {
            this.drawDeath(canvas, bmpEye);
            return;
        }
        const hurtFlicker = !this.dying &&
            this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer / 4) % 2 != 0;
        const chargeFlicker = !this.dying && this.flickerTimer > 0 &&
            Math.floor(this.flickerTimer / 4) % 2 != 0;
        if (hurtFlicker) {
            canvas.applyEffect(1 /* Effect.FixedColor */);
            canvas.setColor(255, 255, 255);
        }
        if (chargeFlicker) {
            // canvas.applyEffect(Effect.FixedColor);
            canvas.setColor(255, 0, 0);
        }
        const dx = this.pos.x - this.sprite.width / 2;
        const dy = this.pos.y - this.sprite.height / 2;
        // this.sprite.draw(canvas, bmpEye, dx, dy, this.flip);
        const sx = this.sprite.getColumn() * 64;
        const sy = this.sprite.getRow() * 64;
        const t = (1.0 - this.health / this.initialHealth);
        const amplitude = t * 8;
        const period = 32 + 32 * (1.0 - t);
        canvas.drawHorizontallyWavingBitmap(bmpEye, amplitude, period, this.bodyWave, 0 /* Flip.None */, dx, dy, sx, sy, 64, 64);
        if (hurtFlicker || chargeFlicker) {
            canvas.applyEffect(0 /* Effect.None */);
            canvas.setColor();
        }
    }
    hasReachedInitialPos() {
        return this.initialPosReached;
    }
    getHealthbarHealth() {
        return Math.max(0.0, this.healthBarPos);
    }
}
