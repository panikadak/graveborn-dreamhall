import { CollisionObject } from "./collisionobject.js";
import { Vector } from "../math/vector.js";
import { Rectangle } from "../math/rectangle.js";
import { Sprite } from "../gfx/sprite.js";
import { RGBA } from "../math/rgba.js";
import { clamp } from "../math/utility.js";
const GRAVITY_MAGNITUDE = 5.0;
const UNDERWATER_GRAVITY = 0.75;
const UNDERWATER_FRICTION_MODIFIER = 2;
const SHOOT_RELEASE_TIME = 20;
const SHOOT_BASE_TIME = 20;
const SHOOT_WAIT_TIME = 10.0;
const HURT_TIME = 60;
const KNOCKBACK_TIME = 20;
const DEATH_TIME = 60;
const POWER_ATTACK_TIME = 20;
const POWER_ATTACK_HALT_TIME = 10;
const ATTACK_RELEASE_TIME = 8;
const CHARGE_VOLUME = 0.70;
const RUN_SPEED_BASE_BONUS = 0.20;
;
;
export class Player extends CollisionObject {
    constructor(x, y, projectiles, particles, flyingText, stats, mapTransition, event) {
        super(x, y, true);
        this.jumpTimer = 0.0;
        this.ledgeTimer = 0.0;
        // TODO: Maybe add "JumpType" enum instead? (Nah.)
        this.highJumping = false;
        this.canUseRocketPack = false;
        this.rocketPackActive = false;
        this.rocketPackReleased = false;
        this.shooting = false;
        this.shootTimer = 0.0;
        this.shootWait = 0.0;
        this.flashType = 0;
        this.charging = false;
        this.chargeType = 0 /* ChargeType.None */;
        this.chargeFlickerTimer = 0;
        this.hurtTimer = 0.0;
        this.knockbackTimer = 0.0;
        this.crouching = false;
        this.crouchFlickerTimer = 0;
        this.underWater = false;
        this.touchDeepWater = false;
        this.attackID = 0;
        this.attacking = false;
        this.attackNumber = 0;
        this.downAttacking = false;
        this.downAttackWait = 0;
        this.powerAttackTimer = 0;
        this.powerAttackStopped = false;
        this.swordHitBoxActive = false;
        this.attackReleaseTimer = 0;
        this.dustTimer = 0;
        this.dustCount = 0;
        this.deathTimer = 0;
        this.iconType = 0;
        this.checkpointObject = undefined;
        this.waitActive = false;
        this.waitTimer = 0;
        this.initialWaitTimer = 0;
        this.waitType = 0 /* WaitType.Unknown */;
        this.waitParameter = 0;
        this.waitCeaseEvent = undefined;
        this.slurpString = ""; // Slurp *what now*?
        this.hugString = "";
        this.mapTransition = undefined;
        this.getGravity = () => this.underWater ? UNDERWATER_GRAVITY : GRAVITY_MAGNITUDE;
        this.isFullyDown = () => this.crouching &&
            this.sprite.getRow() == 3 &&
            this.sprite.getColumn() == 5;
        this.getAttackID = () => this.attackID;
        this.isCheckpointObject = (o) => this.checkpointObject === o;
        this.isWaiting = () => this.waitTimer > 0;
        this.isChargeAttacking = () => this.powerAttackTimer > 0;
        this.isOrdinarilyAttacking = () => this.attacking &&
            this.powerAttackTimer <= 0 &&
            !this.downAttacking;
        // TODO: I guess down attack is not attacking, then?
        this.isAttacking = () => this.attacking || this.shooting || this.powerAttackTimer > 0;
        this.friction = new Vector(0.15, 0.125);
        this.inCamera = true;
        this.collisionBox = new Rectangle(0, 2, 10, 12);
        this.hitbox = new Rectangle(0, 2, 10, 12);
        this.sprite = new Sprite(24, 24);
        this.projectiles = projectiles;
        this.particles = particles;
        this.flyingText = flyingText;
        this.stats = stats;
        this.swordHitbox = new Rectangle();
        this.dir = 1;
        this.iconSprite = new Sprite(16, 16);
        this.mapTransition = mapTransition;
        this.slurpString = event.localization?.getItem("slurp")?.[0] ?? "null";
        this.hugString = event.localization?.getItem("hug")?.[0] ?? "null";
    }
    setHitbox() {
        if (!this.crouching) {
            this.hitbox.y = 2;
            this.hitbox.h = 12;
            return;
        }
        this.hitbox.y = 6;
        this.hitbox.h = 6;
    }
    computeSwordHitbox() {
        const SWORD_OFFSET_X = 16;
        const SWORD_OFFSET_Y = 2;
        const SWORD_ATTACK_BASE_WIDTH = [14, 18];
        const SWORD_ATTACK_BASE_HEIGHT = [20, 14];
        const SWORD_ATTACK_SPECIAL_WIDTH = 16;
        const SWORD_ATTACK_SPECIAL_HEIGHT = 16;
        const DOWN_ATTACK_OFFSET_X = 1;
        const DOWN_ATTACK_OFFSET_Y = 14;
        const DOWN_ATTACK_WIDTH = 6;
        const DOWN_ATTACK_HEIGHT = 16;
        const POWERFUL_SWORD_EXTRA_DIMENSION_X = 1.25;
        const POWERFUL_SWORD_EXTRA_DIMENSION_Y = 1.25;
        this.swordHitBoxActive = false;
        const factorx = this.stats.hasItem(13 /* Item.PowerfulSword */) ? POWERFUL_SWORD_EXTRA_DIMENSION_X : 1.0;
        const factory = this.stats.hasItem(13 /* Item.PowerfulSword */) ? POWERFUL_SWORD_EXTRA_DIMENSION_Y : 1.0;
        if (this.downAttacking && this.downAttackWait <= 0) {
            this.swordHitbox.x = this.pos.x + DOWN_ATTACK_OFFSET_X * this.dir;
            this.swordHitbox.y = this.pos.y + DOWN_ATTACK_OFFSET_Y;
            this.swordHitbox.w = DOWN_ATTACK_WIDTH;
            this.swordHitbox.h = DOWN_ATTACK_HEIGHT * factory;
            this.swordHitBoxActive = true;
            return;
        }
        if (!this.attacking && this.powerAttackTimer <= 0) {
            return;
        }
        this.swordHitbox.x = this.pos.x + this.dir * SWORD_OFFSET_X;
        this.swordHitbox.y = this.pos.y + SWORD_OFFSET_Y;
        this.swordHitbox.w = this.powerAttackTimer > 0 ? SWORD_ATTACK_SPECIAL_WIDTH : SWORD_ATTACK_BASE_WIDTH[this.attackNumber];
        this.swordHitbox.h = this.powerAttackTimer > 0 ? SWORD_ATTACK_SPECIAL_HEIGHT : SWORD_ATTACK_BASE_HEIGHT[this.attackNumber];
        this.swordHitbox.w *= factorx;
        this.swordHitbox.h *= factory;
        this.swordHitBoxActive = true;
    }
    computeFaceDirection(event) {
        const STICK_THRESHOLD = 0.01;
        if (this.attacking) {
            return;
        }
        const stick = event.input.stick;
        if (Math.abs(stick.x) > STICK_THRESHOLD) {
            this.dir = stick.x > 0 ? 1 : -1;
        }
    }
    checkCrouching(event) {
        const THRESHOLD = 0.5;
        if (this.attacking) {
            return;
        }
        const wasCrouching = this.crouching;
        this.crouching = !this.underWater && this.touchSurface && event.input.stick.y > THRESHOLD;
        if (this.crouching && !wasCrouching) {
            this.charging = false;
            this.sprite.setFrame(3, 3);
            this.crouchFlickerTimer = 0;
        }
    }
    updateBaseMovement(event) {
        const RUN_SPEED = 1.0;
        const SWIM_SPEED = 0.75;
        const stick = event.input.stick;
        this.target.y = this.getGravity();
        if (this.crouching) {
            this.target.x = 0.0;
            return;
        }
        const speedx = this.underWater ? SWIM_SPEED : RUN_SPEED;
        const speedBonus = 1.0 + this.stats.getSpeedBonus() * RUN_SPEED_BASE_BONUS;
        this.target.x = stick.x * this.computeSlopeSpeedFactor() * speedx * speedBonus;
    }
    controlJumping(event) {
        const JUMP_TIME_BASE = 15.0;
        const JUMP_TIME_HIGH = 14.0;
        const ROCKET_PACK_JUMP = 45;
        const MINIMUM_ROCKET_JUMP_SPEED = 1.5;
        if (this.attacking) {
            return;
        }
        const hasRocketPack = this.stats.hasItem(11 /* Item.WeakRocketPack */) ||
            this.stats.hasItem(12 /* Item.StrongRocketPack */);
        const jumpButton = event.input.getAction("jump");
        if (jumpButton == 3 /* InputState.Pressed */ && !this.highJumping) {
            if (this.ledgeTimer > 0 || this.underWater) {
                this.highJumping = this.stats.hasItem(4 /* Item.SpringBoots */) && this.isFullyDown();
                this.jumpTimer = this.highJumping ? JUMP_TIME_HIGH : JUMP_TIME_BASE;
                this.ledgeTimer = 0.0;
                this.crouching = false;
                if (this.referenceObject !== undefined) {
                    const refSpeed = this.referenceObject.getSpeed();
                    this.speed.x += refSpeed.x;
                    this.speed.y += refSpeed.y;
                }
                event.audio.playSample(event.assets.getSample("jump"), 0.80);
            }
            else if (hasRocketPack && this.canUseRocketPack) {
                this.canUseRocketPack = false;
                this.rocketPackReleased = !this.stats.hasItem(12 /* Item.StrongRocketPack */);
                this.rocketPackActive = true;
                if (this.stats.hasItem(12 /* Item.StrongRocketPack */)) {
                    this.jumpTimer = ROCKET_PACK_JUMP;
                    this.speed.y = Math.min(MINIMUM_ROCKET_JUMP_SPEED, this.speed.y);
                }
                // To make the sound effect appear immediately
                this.dustCount = 0;
            }
            else if (hasRocketPack && this.rocketPackReleased) {
                this.jumpTimer = 0;
                this.rocketPackActive = true;
                this.dustCount = 0;
            }
        }
        else if ((jumpButton & 1 /* InputState.DownOrPressed */) == 0) {
            this.jumpTimer = 0;
            this.rocketPackActive = false;
            this.rocketPackReleased = true;
        }
    }
    shootBullet(type, event) {
        const BULLET_SPEED = [4.0, 2.5];
        const BULLET_YOFF = 3;
        const BULLET_XOFF = 8;
        const BULLET_SPEED_FACTOR_X = 0.5;
        const BULLET_SPEED_FACTOR_Y = 0.0; // Makes collisions work better...
        const RESTORE_TIME_PENALTY = -0.5;
        if (this.stats.getBulletCount() <= 0) {
            this.flashType = -1;
            event.audio.playSample(event.assets.getSample("empty"), 0.90);
            return;
        }
        const dx = this.pos.x + BULLET_XOFF * this.dir;
        const dy = this.pos.y + BULLET_YOFF;
        const power = type == 1 ? this.stats.getChargeProjectilePower() : this.stats.getProjectilePower();
        const typeShift = this.stats.hasItem(14 /* Item.PowerfulGun */) ? 8 : 0;
        this.projectiles.next(this.stats).spawn(this.pos.x, dy, dx, dy, this.speed.x * BULLET_SPEED_FACTOR_X + (BULLET_SPEED[type] ?? 0) * this.dir, this.speed.y * BULLET_SPEED_FACTOR_Y, type + typeShift, power, true, this.attackID + 1);
        if (type == 1) {
            ++this.attackID;
            event.audio.playSample(event.assets.getSample("charge_shot"), 0.60);
        }
        else {
            event.audio.playSample(event.assets.getSample("shoot"), 0.40);
        }
        this.stats.updateBulletCount(-1);
        if (this.stats.hasItem(39 /* Item.MagicBullets */)) {
            this.stats.setBulletRestoreTime(RESTORE_TIME_PENALTY);
        }
    }
    controlShooting(event) {
        if (!this.stats.hasItem(2 /* Item.Gun */)) {
            return;
        }
        if (this.attacking ||
            this.highJumping ||
            this.shootWait > 0 ||
            this.crouching) {
            return;
        }
        const shootButton = event.input.getAction("shoot");
        if (shootButton == 3 /* InputState.Pressed */ ||
            (this.charging && this.chargeType == 2 /* ChargeType.Gun */ &&
                (shootButton & 1 /* InputState.DownOrPressed */) == 0)) {
            this.shooting = true;
            this.shootTimer = SHOOT_BASE_TIME + SHOOT_RELEASE_TIME;
            this.shootWait = SHOOT_WAIT_TIME;
            this.flashType = this.charging ? 1 : 0;
            this.sprite.setFrame(this.sprite.getColumn(), 2 + (this.sprite.getRow() % 2), true);
            this.shootBullet(this.flashType, event);
            this.charging = false;
            this.chargeFlickerTimer = 0.0;
        }
    }
    controlAttacking(event, forceSecondAttack = false) {
        const DOWN_ATTACK_JUMP = -2.0;
        const DOWN_ATTACK_STICK_Y_THRESHOLD = 0.50;
        const FORWARD_SPEED = [1.5, 2.0];
        if (!this.stats.hasItem(1 /* Item.Sword */)) {
            return;
        }
        const attackButton = event.input.getAction("attack");
        // Charge attack
        if (this.stats.hasItem(5 /* Item.EternalFlame */) &&
            !forceSecondAttack &&
            this.charging && this.chargeType == 1 /* ChargeType.Sword */ &&
            (attackButton & 1 /* InputState.DownOrPressed */) == 0) {
            this.jumpTimer = 0;
            this.powerAttackTimer = POWER_ATTACK_TIME;
            this.powerAttackStopped = false;
            this.charging = false;
            this.speed.zeros();
            ++this.attackID;
            event.audio.playSample(event.assets.getSample("charge_attack"), 0.60);
            return;
        }
        if ((this.attacking && !forceSecondAttack) || this.highJumping) {
            return;
        }
        if (attackButton == 3 /* InputState.Pressed */) {
            event.audio.playSample(event.assets.getSample("sword"), 0.90);
            // Down attack
            if (this.stats.hasItem(9 /* Item.ThumbDown */) &&
                !this.underWater &&
                !forceSecondAttack &&
                !this.touchSurface &&
                event.input.stick.y >= DOWN_ATTACK_STICK_Y_THRESHOLD) {
                ++this.attackID;
                this.attacking = false; // Possibly unnecessary
                this.downAttacking = true;
                this.rocketPackActive = false;
                this.speed.y = DOWN_ATTACK_JUMP;
                this.charging = false;
                this.jumpTimer = 0;
                return;
            }
            this.attacking = true;
            // this.attackDir = this.dir;
            this.crouching = false;
            this.shooting = false;
            this.charging = false;
            if (this.rocketPackActive) {
                this.jumpTimer = 0;
            }
            this.rocketPackActive = false;
            this.rocketPackReleased = true;
            this.sprite.setFrame(3, 1);
            ++this.attackID;
            this.attackNumber = 0;
            if (forceSecondAttack || this.attackReleaseTimer > 0) {
                this.attackNumber = 1;
            }
            if (this.touchSurface) {
                this.speed.x = this.dir * FORWARD_SPEED[this.attackNumber];
            }
        }
    }
    updateDownAttack(event) {
        const ATTACK_SPEED_MAX = 6.0;
        const FRICTION_Y = 0.33;
        this.friction.y = FRICTION_Y;
        this.target.x = 0.0;
        this.target.y = ATTACK_SPEED_MAX;
        if (this.downAttackWait > 0) {
            this.downAttackWait -= event.tick;
        }
    }
    updatePowerAttack(event) {
        const RUSH_SPEED = 2.5;
        this.powerAttackTimer -= event.tick;
        if (this.powerAttackTimer <= 0 || this.powerAttackStopped) {
            this.speed.x = 0;
            return;
        }
        this.target.x = this.dir * RUSH_SPEED;
        this.speed.x = this.target.x;
        this.target.y = this.touchSurface ? this.getGravity() : 0.0;
    }
    setFriction() {
        const speedBonus = 1.0 + this.stats.getSpeedBonus() * RUN_SPEED_BASE_BONUS;
        this.friction.x = 0.15 * speedBonus;
        this.friction.y = 0.125;
        if (this.underWater) {
            this.friction.x /= UNDERWATER_FRICTION_MODIFIER;
            this.friction.y /= UNDERWATER_FRICTION_MODIFIER;
        }
        /*
                if (this.powerAttackTimer > 0 && this.powerAttackStopped) {
        
                    this.friction.x = 0.025;
                }
        */
    }
    updateWaterMovement(event) {
        if (!this.underWater) {
            return;
        }
        this.speed.y = Math.min(this.speed.y, UNDERWATER_GRAVITY);
        this.target.y = Math.min(this.target.y, UNDERWATER_GRAVITY);
        // TODO: Splash sound?
        // Just for sure
        this.downAttacking = false;
        this.downAttackWait = 0;
    }
    control(event) {
        this.setFriction();
        if (this.knockbackTimer > 0 ||
            (this.attacking && this.touchSurface)) {
            if (this.attacking) {
                // If possible, start a second attack
                const canPerformSecondAttack = this.attacking &&
                    this.attackNumber == 0 &&
                    this.touchSurface &&
                    this.sprite.getColumn() >= 6;
                this.controlAttacking(event, canPerformSecondAttack);
            }
            this.target.x = 0.0;
            this.target.y = this.getGravity();
            // Also needed here (but it has no effect???)
            this.updateWaterMovement(event);
            return;
        }
        this.updateWaterMovement(event);
        if (this.powerAttackTimer > 0) {
            this.updatePowerAttack(event);
            return;
        }
        if (this.downAttacking || this.downAttackWait > 0) {
            this.updateDownAttack(event);
            return;
        }
        this.computeFaceDirection(event);
        this.checkCrouching(event);
        this.updateBaseMovement(event);
        this.controlJumping(event);
        this.controlShooting(event);
        this.controlAttacking(event);
    }
    animateJumping(rowModifier, event) {
        const JUMP_ANIM_THRESHOLD = 0.40;
        if (this.highJumping) {
            this.sprite.animate(4, 0, 7, 3, event.tick);
            return;
        }
        let frame = 1;
        if (this.speed.y < -JUMP_ANIM_THRESHOLD) {
            --frame;
        }
        else if (this.speed.y > JUMP_ANIM_THRESHOLD) {
            ++frame;
        }
        if (this.rocketPackActive) {
            this.sprite.setFrame(6 + frame, rowModifier);
            return;
        }
        this.sprite.setFrame(frame, 1 + rowModifier);
    }
    animateRunningAndStanding(rowModifier, event) {
        const EPS = 0.01;
        if (Math.abs(this.target.x) < EPS && Math.abs(this.speed.x) < EPS) {
            this.sprite.setFrame(0, rowModifier);
            return;
        }
        const speed = Math.max(0, 10 - Math.abs(this.speed.x) * 4);
        this.sprite.animate(rowModifier, 1, 4, speed, event.tick);
    }
    animateCrouching(event) {
        const ANIMATION_SPEED = 8;
        if (this.sprite.getRow() != 3 || this.sprite.getColumn() != 5) {
            this.sprite.animate(3, 3, 5, ANIMATION_SPEED, event.tick);
            if (this.stats.hasItem(4 /* Item.SpringBoots */) && this.sprite.getColumn() == 5) {
                event.audio.playSample(event.assets.getSample("charge"), CHARGE_VOLUME);
            }
        }
    }
    animateAttacking(event) {
        const BASE_ATTACK_SPEED = 4;
        const LAST_FRAME = 8;
        const LAST_FRAME_LENGTH = 16;
        const LAST_FRAME_RELEASE = 8;
        const SPEED_BONUS_FACTOR = 0.25;
        const row = 1 + this.attackNumber * 4;
        const baseFrameTime = Math.round(BASE_ATTACK_SPEED * (1.0 - SPEED_BONUS_FACTOR * this.stats.getAttackSpeedBonus()));
        const frameTime = this.sprite.getColumn() == LAST_FRAME - 1 ? LAST_FRAME_LENGTH : baseFrameTime;
        this.sprite.animate(row, 3, LAST_FRAME, frameTime, event.tick);
        const buttonReleased = (event.input.getAction("attack") & 1 /* InputState.DownOrPressed */) == 0;
        if (this.sprite.getColumn() == LAST_FRAME ||
            (buttonReleased &&
                this.sprite.getColumn() == LAST_FRAME - 1 &&
                this.sprite.getFrameTime() >= LAST_FRAME_RELEASE)) {
            if (this.stats.hasItem(5 /* Item.EternalFlame */) && this.sprite.getColumn() == LAST_FRAME) {
                this.charging = !buttonReleased;
                if (this.charging) {
                    event.audio.playSample(event.assets.getSample("charge"), CHARGE_VOLUME);
                }
                this.chargeType = 1 /* ChargeType.Sword */;
            }
            this.attacking = false;
            this.sprite.setFrame(0, 0);
            this.attackReleaseTimer = (1 - this.attackNumber) * ATTACK_RELEASE_TIME;
        }
    }
    animateDownAttack() {
        this.sprite.setFrame(8, 1);
    }
    animatePowerAttack() {
        this.sprite.setFrame(5, 2);
    }
    animateSwimming(rowModifier, event) {
        const EPS = 0.01;
        const row = rowModifier + (this.jumpTimer > 0 ? 1 : 0);
        if (Math.abs(this.target.x) > EPS) {
            this.sprite.animate(row, 9, 10, 8, event.tick);
            return;
        }
        this.sprite.setFrame(9, row);
    }
    animateIcon(event) {
        const ANIMATION_SPEED = 20;
        this.iconSprite.animate(this.iconType - 1, 0, 1, ANIMATION_SPEED, event.tick);
    }
    animate(event) {
        this.flip = this.dir > 0 ? 0 /* Flip.None */ : 1 /* Flip.Horizontal */;
        if (this.iconType > 0) {
            this.animateIcon(event);
        }
        if (this.powerAttackTimer > 0) {
            this.animatePowerAttack();
            return;
        }
        if (this.downAttacking || this.downAttackWait > 0) {
            this.animateDownAttack();
            return;
        }
        if (this.knockbackTimer > 0) {
            this.sprite.setFrame(5, 0);
            return;
        }
        if (this.attacking) {
            this.animateAttacking(event);
            return;
        }
        if (this.crouching) {
            this.animateCrouching(event);
            return;
        }
        const rowModifier = this.shooting ? 2 : 0;
        if (this.underWater) {
            this.animateSwimming(rowModifier, event);
            return;
        }
        if (!this.touchSurface) {
            this.animateJumping(rowModifier, event);
            return;
        }
        this.animateRunningAndStanding(rowModifier, event);
    }
    updateJumping(event) {
        const JUMP_SPEED_BASE = -2.25;
        const JUMP_UNDERWATER_SPEED = -1.25;
        const JUMP_SPEED_HIGH = -3.0;
        const MAX_HIGH_JUMP_SPEED = 1.0;
        const ROCKET_PACK_DELTA = -0.20;
        const ROCKET_PACK_MIN = -2.0;
        const ROCKET_PACK_LANDING_SPEED = 0.5;
        if (this.rocketPackActive && this.jumpTimer <= 0) {
            this.speed.y = Math.min(ROCKET_PACK_LANDING_SPEED, this.speed.y);
            return;
        }
        if (this.highJumping && this.speed.y > MAX_HIGH_JUMP_SPEED) {
            this.highJumping = false;
        }
        if (this.jumpTimer <= 0) {
            if (this.rocketPackActive) {
                this.rocketPackReleased = true;
            }
            return;
        }
        if (!this.underWater ||
            (this.underWater && this.stats.hasItem(3 /* Item.Snorkel */) && this.touchDeepWater)) {
            this.jumpTimer -= event.tick;
        }
        if (this.rocketPackActive) {
            this.speed.y = Math.max(ROCKET_PACK_MIN, this.speed.y + ROCKET_PACK_DELTA * event.tick);
            return;
        }
        this.speed.y = this.highJumping ? JUMP_SPEED_HIGH : JUMP_SPEED_BASE;
        if (this.underWater) {
            this.speed.y = JUMP_UNDERWATER_SPEED;
        }
        this.target.y = this.speed.y;
    }
    updateShootTimers(event) {
        if (this.shootTimer > 0) {
            const shootButton = event.input.getAction("shoot");
            this.shootTimer -= event.tick;
            if (this.shootTimer <= 0 ||
                (this.shootTimer <= SHOOT_RELEASE_TIME && (shootButton & 1 /* InputState.DownOrPressed */) == 0)) {
                this.shooting = false;
                if (this.shootTimer <= 0 && this.stats.hasItem(10 /* Item.ChargeShot */)) {
                    this.chargeType = 2 /* ChargeType.Gun */;
                    this.charging = true;
                    event.audio.playSample(event.assets.getSample("charge"), CHARGE_VOLUME);
                }
                this.shootTimer = 0;
            }
        }
        if (this.shootWait > 0) {
            this.shootWait -= event.tick;
        }
    }
    updateTimers(event) {
        const CROUCH_FLICKER_SPEED = 1.0 / 8.0;
        const CHARGE_FLICKER_SPEED = 1.0 / 8.0;
        this.updateShootTimers(event);
        if (this.ledgeTimer > 0) {
            this.ledgeTimer -= event.tick;
        }
        if (this.knockbackTimer > 0) {
            this.knockbackTimer -= event.tick;
            if (this.knockbackTimer <= 0 && this.stats.getHealth() <= 0) {
                this.initiateDeath(event);
            }
        }
        else if (this.hurtTimer > 0) {
            this.hurtTimer -= event.tick;
        }
        if (this.stats.hasItem(4 /* Item.SpringBoots */) && this.isFullyDown()) {
            this.crouchFlickerTimer = (this.crouchFlickerTimer + CROUCH_FLICKER_SPEED * event.tick) % 1.0;
        }
        if (this.charging) {
            this.chargeFlickerTimer = (this.chargeFlickerTimer + CHARGE_FLICKER_SPEED * event.tick) % 1.0;
        }
        if (this.attackReleaseTimer > 0) {
            this.attackReleaseTimer -= event.tick;
            if (!this.touchSurface) {
                this.attackReleaseTimer = 0;
            }
        }
    }
    updateSwimming(event) {
        const RISE_SPEED = -0.1;
        const RISE_MAX = -1.0;
        if (this.stats.hasItem(3 /* Item.Snorkel */) || !this.touchDeepWater) {
            return;
        }
        this.speed.y += RISE_SPEED * event.tick;
        this.speed.y = Math.max(RISE_MAX, this.speed.y);
    }
    updateFlags() {
        this.touchSurface = false;
        this.underWater = false;
        this.touchDeepWater = false;
        this.iconType = 0;
    }
    updateDust(event) {
        const X_OFFSET = -4;
        const Y_OFFSET = 7;
        const DUST_TIME = 10.0;
        const ROCKET_PACK_DUST_TIME = 4.0;
        const ROCKET_PACK_LANDING_DUST_TIME = 6.0;
        const MIN_SPEED = 0.1;
        const ROCKET_PACK_DUST_SPEED_Y = 0.5;
        const ROCKET_PACK_DUST_LANDING_SPEED_Y = 1.0;
        if ((this.powerAttackTimer <= 0 &&
            this.knockbackTimer <= 0 &&
            this.touchSurface &&
            Math.abs(this.speed.x) > MIN_SPEED) ||
            this.rocketPackActive) {
            this.dustTimer -= event.tick;
        }
        if (this.dustTimer <= 0) {
            this.dustTimer = DUST_TIME;
            let speedy = 0;
            let id = 0;
            if (this.rocketPackActive) {
                id = 1;
                if (this.jumpTimer > 0) {
                    speedy = ROCKET_PACK_DUST_SPEED_Y;
                    this.dustTimer = ROCKET_PACK_DUST_TIME;
                }
                else {
                    speedy = ROCKET_PACK_DUST_LANDING_SPEED_Y;
                    this.dustTimer = ROCKET_PACK_LANDING_DUST_TIME;
                }
                // Calling the sound effect each time a dust particle
                // is too frequent, hence we only call it every other
                // frame.
                this.dustCount = (this.dustCount + 1) % 2;
                if (this.dustCount == 1) {
                    event.audio.playSample(event.assets.getSample("buzz"), 0.70);
                }
            }
            this.particles.next().spawn(this.pos.x + X_OFFSET * this.dir, this.pos.y + Y_OFFSET, 0.0, speedy, id, 0 /* Flip.None */);
        }
    }
    hurt(damage, event) {
        this.shooting = false;
        this.shootTimer = 0;
        this.jumpTimer = 0;
        this.charging = false;
        this.attacking = false;
        this.downAttacking = false;
        this.downAttackWait = 0;
        this.rocketPackActive = false;
        this.powerAttackTimer = 0;
        this.hurtTimer = HURT_TIME;
        damage = -this.stats.updateHealth(-damage);
        this.flyingText?.next()
            .spawn(this.pos.x, this.pos.y - 8, -damage, 0 /* FlyingTextSymbol.None */, new RGBA(255, 73, 0));
        event.audio.playSample(event.assets.getSample("hurt"), 0.90);
    }
    initiateDeath(event) {
        this.dying = true;
        this.sprite.setFrame(4, 8);
        event.audio.stopMusic();
        event.audio.playSample(event.assets.getSample("die"), 0.80);
    }
    updateWaiting(event) {
        this.target.zeros();
        this.speed.zeros();
        this.waitTimer -= event.tick;
        if (this.waitTimer <= 0) {
            this.waitCeaseEvent?.(event);
        }
        switch (this.waitType) {
            case 2 /* WaitType.WakingUp */:
                {
                    const t = 1.0 - this.waitTimer / this.initialWaitTimer;
                    const frame = Math.floor(t * 3.0);
                    if (frame < 2) {
                        this.sprite.setFrame(frame, 5);
                        break;
                    }
                    this.sprite.setFrame(0, 0);
                }
                break;
            default:
                break;
        }
    }
    drawMuzzleFlash(canvas, bmp) {
        const X_OFFSET = 10;
        const Y_OFFSET = 3;
        if (this.flashType < 0) {
            return;
        }
        const frame = Math.floor((1.0 - this.shootWait / SHOOT_WAIT_TIME) * 4);
        const dx = this.pos.x + this.dir * X_OFFSET - 8;
        const dy = this.pos.y + Y_OFFSET - 8;
        canvas.drawBitmap(bmp, this.flip, dx, dy, frame * 16, this.flashType * 16, 16, 16);
    }
    drawWeapon(canvas, bmp) {
        let dx = this.pos.x - 16 + this.dir * 10;
        let dy = this.pos.y - 14;
        let frame = this.attacking ? this.sprite.getColumn() - 3 : 5;
        let row = this.downAttacking ? 0 : this.attackNumber * 2;
        if (this.powerAttackTimer > 0) {
            frame = Math.floor(this.powerAttackTimer / 4) % 4;
            row = 1;
        }
        // Since weird things can happen
        if (this.downAttackWait > 0) {
            frame = 5;
            row = 0;
        }
        if (this.stats.hasItem(13 /* Item.PowerfulSword */)) {
            row += 3;
            if (this.downAttacking || this.downAttackWait > 0) {
                dy += 4;
            }
        }
        canvas.drawBitmap(bmp, this.flip, dx, dy, frame * 32, row * 32, 32, 32);
    }
    drawDeath(canvas, bmp) {
        const ORB_COUNT = 8;
        const ORB_DISTANCE = 64;
        const t = this.deathTimer / DEATH_TIME;
        const step = Math.PI * 2 / ORB_COUNT;
        const dx = Math.round(this.pos.x);
        const dy = Math.round(this.pos.y);
        for (let i = 0; i < ORB_COUNT; ++i) {
            const angle = step * i;
            this.sprite.draw(canvas, bmp, dx + Math.round(Math.cos(angle) * t * ORB_DISTANCE) - 12, dy + Math.round(Math.sin(angle) * t * ORB_DISTANCE) - 12);
        }
    }
    drawHoldingItem(canvas, assets) {
        const ITEM_LIFT = 16;
        const ITEM_START_YOFF = 8;
        // Don't ask
        const ANIMATION_STOP_MODIFIER = 2.5;
        if (!this.waitActive || this.waitType != 1 /* WaitType.HoldingItem */) {
            return;
        }
        const bmpItemIcons = assets.getBitmap("item_icons");
        const t = Math.min((1.0 - this.waitTimer / this.initialWaitTimer) * ANIMATION_STOP_MODIFIER, 1.0);
        const yoff = ITEM_START_YOFF + t * ITEM_LIFT;
        const column = this.waitParameter % 16;
        const row = Math.floor(this.waitParameter / 16);
        canvas.drawBitmap(bmpItemIcons, 0 /* Flip.None */, this.pos.x - 8, this.pos.y - yoff, column * 16, row * 16, 16, 16);
    }
    // Sometimes it's better not to ask
    drawSlurpingAndHugging(canvas, assets) {
        if (!this.waitActive ||
            (this.waitType != 4 /* WaitType.Licking */ && this.waitType != 5 /* WaitType.Hugging */)) {
            return;
        }
        const bmpFontOutlines = assets.getBitmap("font_outlines");
        const t = 1.0 - this.waitTimer / this.initialWaitTimer;
        const count = 1 + Math.min(2, Math.floor(t * 3));
        const text = this.waitType == 4 /* WaitType.Licking */ ? this.slurpString : this.hugString;
        canvas.setColor(182, 255, 146);
        for (let i = 0; i < count; ++i) {
            let shiftx = 0;
            if (i == 1) {
                shiftx = 8;
            }
            else if (i == 2) {
                shiftx = -8;
            }
            canvas.drawText(bmpFontOutlines, text, this.pos.x + shiftx, this.pos.y - 24 - i * 12, -8, 0, 2 /* Align.Center */);
        }
        canvas.setColor();
    }
    updateEvent(event) {
        if (this.waitTimer > 0) {
            this.updateWaiting(event);
            return;
        }
        this.waitActive = false;
        this.control(event);
        this.setHitbox();
        this.animate(event);
        this.updateTimers(event);
        this.updateJumping(event);
        this.updateDust(event);
        this.updateSwimming(event);
        this.updateFlags();
        this.computeSwordHitbox();
    }
    slopeCollisionEvent(direction, event) {
        const LEDGE_TIME = 8.0;
        const DOWN_ATTACK_WAIT = 15.0;
        if (direction == 1) {
            this.ledgeTimer = LEDGE_TIME;
            this.touchSurface = true;
            this.highJumping = false;
            this.canUseRocketPack = true;
            this.rocketPackActive = false;
            this.rocketPackReleased = false;
            this.jumpTimer = 0;
            if (this.downAttacking) {
                this.downAttackWait = DOWN_ATTACK_WAIT;
            }
            this.downAttacking = false;
            return;
        }
        this.jumpTimer = 0;
        this.rocketPackReleased = true;
    }
    die(event) {
        const ANIMATION_SPEED = 3;
        this.deathTimer += event.tick;
        this.sprite.animate(4, 8, 10, ANIMATION_SPEED, event.tick);
        return this.deathTimer >= DEATH_TIME;
    }
    projectileCollision(p, event) {
        if (!this.isActive() || !p.isActive() || p.isFriendly()) {
            return false;
        }
        if (p.overlayObject(this)) {
            const ppos = p.getPosition();
            p.kill(event);
            this.applyDamage(p.getPower(), ppos.x >= this.pos.x ? -1 : 1, event);
            return true;
        }
        return false;
    }
    applyDamage(damage, direction, event) {
        const KNOCKBACK_SPEED = 2.5;
        if (!this.isActive() || this.hurtTimer > 0) {
            return;
        }
        if (!this.stats.hasItem(41 /* Item.HeavyWeight */)) {
            this.knockbackTimer = KNOCKBACK_TIME;
            const knockbackDirection = direction == 0 ? (-this.dir) : direction;
            this.speed.x = knockbackDirection * KNOCKBACK_SPEED;
            if (this.underWater) {
                // Didn't work as intended
                // this.speed.x /= UNDERWATER_FRICTION_MODIFIER;
            }
        }
        this.hurt(damage, event);
        if (this.stats.hasItem(41 /* Item.HeavyWeight */) && this.stats.getHealth() <= 0) {
            this.initiateDeath(event);
        }
    }
    hurtCollision(x, y, w, h, event, direction = 0, damage = 0) {
        if (!this.isActive() || this.hurtTimer > 0) {
            return false;
        }
        if (this.overlayCollisionArea(x - 1, y - 1, w + 2, h + 2)) {
            this.applyDamage(damage, direction, event);
            return true;
        }
        return false;
    }
    waterCollision(x, y, w, h, event, surface = false) {
        if (!this.isActive()) {
            return false;
        }
        if (this.overlayCollisionArea(x - 1, y - 1, w + 2, h + 2)) {
            this.underWater = true;
            this.touchDeepWater = this.touchDeepWater || (!surface);
            this.ledgeTimer = 1;
            this.canUseRocketPack = true;
            this.rocketPackActive = false;
            this.rocketPackReleased = false;
            return true;
        }
        return false;
    }
    lavaCollision(y, event) {
        if (!this.isActive() ||
            this.stats.hasItem(19 /* Item.CrystalBoots */) ||
            this.hurtTimer > 0 || this.knockbackTimer > 0) {
            return false;
        }
        if (this.pos.y + this.collisionBox.y + this.collisionBox.h / 2 < y) {
            return false;
        }
        this.instantKill(event);
        return true;
    }
    screenTransitionEvent(x, direction, nextMap, event) {
        const TRIGGER_WIDTH = 16;
        if (!this.isActive() || this.knockbackTimer > 0) {
            return;
        }
        if ((direction > 0 && this.speed.x > 0 && this.pos.x + TRIGGER_WIDTH / 2 >= x) ||
            (direction < 0 && this.speed.x < 0 && this.pos.x - TRIGGER_WIDTH / 2 <= x)) {
            event.transition.activate(true, 1 /* TransitionType.Fade */, 1.0 / 20.0, event, (event) => {
                this.mapTransition?.(nextMap, direction > 0 ? 0 : 1, direction > 0 ? 4 /* Pose.EnterRight */ : 5 /* Pose.EnterLeft */, true, event, true);
            });
            event.audio.pauseMusic();
            event.audio.playSample(event.assets.getSample("transition"), 0.70);
        }
    }
    draw(canvas, assets) {
        if (!this.exist) {
            return;
        }
        const bmp = assets.getBitmap("player");
        if (this.dying) {
            this.drawDeath(canvas, bmp);
            return;
        }
        if (this.iconType > 0) {
            const bmpIcon = assets.getBitmap("icons");
            canvas.setAlpha(0.75);
            this.iconSprite.draw(canvas, bmpIcon, this.pos.x - 8, this.pos.y - 24);
            canvas.setAlpha();
        }
        const flicker = this.knockbackTimer <= 0 &&
            this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer / 4) % 2 != 0;
        if (flicker) {
            // canvas.setColor(255.0, 255.0, 255.0, FLICKER_ALPHA);
            return;
        }
        const px = this.pos.x - 12;
        const py = this.pos.y - 11;
        const crouchJumpFlicker = this.stats.hasItem(4 /* Item.SpringBoots */) &&
            this.isFullyDown() &&
            this.crouchFlickerTimer >= 0.5;
        const chargeFlicker = this.charging && this.chargeFlickerTimer < 0.5;
        if (crouchJumpFlicker) {
            canvas.applyEffect(1 /* Effect.FixedColor */);
            canvas.setColor(255, 255, 255);
        }
        if (chargeFlicker) {
            // canvas.applyEffect(Effect.InvertColors);
            canvas.applyEffect(1 /* Effect.FixedColor */);
            if (this.chargeType == 2 /* ChargeType.Gun */) {
                canvas.setColor(219, 182, 255);
            }
            else {
                canvas.setColor(255, 146, 0);
            }
        }
        if (this.attacking || this.powerAttackTimer > 0) {
            const bmpWeapon = assets.getBitmap("weapons");
            this.drawWeapon(canvas, bmpWeapon);
        }
        this.sprite.draw(canvas, bmp, px, py, this.flip);
        if (crouchJumpFlicker || chargeFlicker) {
            canvas.applyEffect(0 /* Effect.None */);
            canvas.setColor();
        }
        if (this.downAttacking || this.downAttackWait > 0) {
            const bmpWeapon = assets.getBitmap("weapons");
            this.drawWeapon(canvas, bmpWeapon);
        }
        if (this.shooting && !this.crouching && this.shootWait > 0) {
            this.drawMuzzleFlash(canvas, assets.getBitmap("muzzle_flash"));
        }
        // Draws sword hitbox area
        /*
        canvas.setColor(255, 0, 0, 0.5);
        canvas.fillRect(this.swordHitbox.x - this.swordHitbox.w/2, this.swordHitbox.y - this.swordHitbox.h/2, this.swordHitbox.w, this.swordHitbox.h);
        canvas.setColor();
        */
    }
    postDraw(canvas, assets) {
        if (!this.exist) {
            return;
        }
        this.drawHoldingItem(canvas, assets);
        this.drawSlurpingAndHugging(canvas, assets);
    }
    targetCamera(camera) {
        camera.followPoint(this.pos);
    }
    setPosition(x, y, resetProperties = false) {
        this.pos.x = x;
        this.pos.y = y;
        this.oldPos = this.pos.clone();
        this.speed.zeros();
        this.target.zeros();
        if (!resetProperties) {
            return;
        }
        this.dying = false;
        this.exist = true;
        this.attacking = false;
        this.jumpTimer = 0;
        this.touchSurface = true;
        this.shooting = false;
        this.charging = false;
        this.downAttacking = false;
        this.iconType = 0;
        this.downAttackWait = 0;
        this.hurtTimer = 0;
        this.knockbackTimer = 0;
        this.deathTimer = 0;
        this.sprite.setFrame(6, 3);
        this.flip = 0 /* Flip.None */;
        this.dir = 1;
    }
    overlaySwordAttackArea(o) {
        if (!this.swordHitBoxActive ||
            (this.attacking && this.sprite.getColumn() >= 6)) {
            return false;
        }
        return o.overlayRect(new Vector(), this.swordHitbox);
    }
    bounce(amount) {
        this.speed.y = amount;
        this.downAttacking = false;
        this.swordHitBoxActive = false;
        this.canUseRocketPack = true;
        this.rocketPackReleased = false;
        this.rocketPackActive = false;
    }
    performDownAttackJump() {
        const JUMP_SPEED = -3.0;
        if (!this.downAttacking || this.downAttackWait > 0) {
            return false;
        }
        this.bounce(JUMP_SPEED);
        this.highJumping = true;
        return true;
    }
    getAttackPower() {
        const SECOND_ATTACK_BONUS = 1.2;
        if (this.downAttacking && this.downAttackWait <= 0) {
            return this.stats.getDownAttackPower();
        }
        if (this.powerAttackTimer > 0) {
            return this.stats.getChargeAttackPower();
        }
        let power = this.stats.getAttackPower();
        if (this.attackNumber == 1) {
            power = Math.round(power * SECOND_ATTACK_BONUS);
        }
        return power;
    }
    stopPowerAttack() {
        if (this.powerAttackTimer <= 0) {
            return;
        }
        this.powerAttackStopped = true;
        this.target.zeros();
        this.powerAttackTimer = Math.min(POWER_ATTACK_HALT_TIME, this.powerAttackTimer);
    }
    instantKill(event) {
        this.stats.updateHealth(-this.stats.getHealth());
        this.initiateDeath(event);
    }
    showIcon(type = 0) {
        this.iconType = type;
    }
    setCheckpointObject(o, shift = new Vector()) {
        this.checkpointObject = o;
        this.stats.setCheckpointPosition(Vector.add(o.getPosition(), shift));
    }
    startWaiting(time, type = 0 /* WaitType.Unknown */, waitParam = 0, event) {
        this.waitActive = true;
        this.waitTimer = time;
        this.initialWaitTimer = time;
        this.waitType = type;
        this.waitParameter = waitParam ?? 0;
        this.waitCeaseEvent = event;
        this.hurtTimer = 0;
        this.charging = false;
        this.crouching = false;
        this.crouchFlickerTimer = 0;
        switch (type) {
            case 1 /* WaitType.HoldingItem */:
                this.sprite.setFrame(7, 3);
                break;
            case 3 /* WaitType.ToggleLever */:
                this.sprite.setFrame(8, 5);
                break;
            case 4 /* WaitType.Licking */:
            case 5 /* WaitType.Hugging */:
                this.sprite.setFrame(10, 5);
                break;
            default:
                break;
        }
    }
    getKnockbackFactor() {
        if (this.powerAttackTimer > 0) {
            return 1.5;
        }
        if (this.downAttacking) {
            return 0.0;
        }
        if (!this.attacking) {
            return 0.0;
        }
        return 1.0 + this.attackNumber * 0.25;
    }
    setPose(pose) {
        switch (pose) {
            case 1 /* Pose.Sit */:
                this.sprite.setFrame(0, 5);
                this.flip = 0 /* Flip.None */;
                break;
            case 5 /* Pose.EnterLeft */:
                this.sprite.setFrame(0, 0);
                this.flip = 1 /* Flip.Horizontal */;
                break;
            case 4 /* Pose.EnterRight */:
                this.sprite.setFrame(0, 0);
                this.flip = 0 /* Flip.None */;
                break;
            case 2 /* Pose.UseDoor */:
                this.sprite.setFrame(8, 5);
                this.flip = 0 /* Flip.None */;
                break;
            case 3 /* Pose.EnterRoom */:
                this.sprite.setFrame(9, 5);
                this.flip = 0 /* Flip.None */;
                break;
            case 6 /* Pose.Use */:
                this.sprite.setFrame(10, 5);
                this.flip = 0 /* Flip.None */;
                break;
            default:
                break;
        }
        this.touchSurface = true;
        this.attacking = false;
        this.powerAttackTimer = 0;
        this.downAttacking = false;
        this.downAttackWait = 0;
    }
    startHarmlessKnockback(time) {
        this.knockbackTimer = time;
        this.hurtTimer = HURT_TIME;
        this.speed.zeros();
    }
    // TODO: Not very good naming here (compare to "setSpeed")...
    alterSpeed(deltax, deltay, minx, maxx, miny, maxy) {
        this.speed.x = clamp(this.speed.x + deltax, minx, maxx);
        this.speed.y = clamp(this.speed.y + deltay, miny, maxy);
        this.downAttacking = false;
        this.downAttackWait = 0;
    }
    setSpeed(speedx, speedy) {
        this.speed.x = speedx;
        this.speed.y = speedy;
        this.downAttacking = false;
        this.downAttackWait = 0;
        this.powerAttackTimer = 0;
        this.rocketPackActive = false;
        // Just pray we do not want to change the speed in any other place
        // than the bumpers...
        this.rocketPackActive = false;
        this.canUseRocketPack = true;
        this.rocketPackReleased = false;
    }
    checkVampirism() {
        const RESTORE_COUNT = 1.0;
        if (!this.stats.hasItem(43 /* Item.VampireFangs */) ||
            this.stats.getHealth() >= this.stats.getMaxHealth()) {
            return null;
        }
        this.stats.updateHealth(RESTORE_COUNT, true);
        return RESTORE_COUNT;
    }
}
