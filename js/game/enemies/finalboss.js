import { Sprite } from "../../gfx/sprite.js";
import { sampleWeightedUniform } from "../../math/random.js";
import { Rectangle } from "../../math/rectangle.js";
import { RGBA } from "../../math/rgba.js";
import { clamp } from "../../math/utility.js";
import { Vector } from "../../math/vector.js";
import { CollisionObject } from "../collisionobject.js";
import { GameObject } from "../gameobject.js";
import { TILE_HEIGHT, TILE_WIDTH } from "../tilesize.js";
import { updateSpeedAxis } from "../utility.js";
import { Enemy } from "./enemy.js";
/*
 * NOTE: I'm perfectly aware of that this whole file is
 * a big mess. This is the last big thing I needed in the
 * game, so I stopped caring if the code is good or not.
 */
const APPEAR_TIME = 60;
const INITIAL_Y = 192;
const TOTAL_HEALTH = 100 * 3;
const DEATH_TIME = 120;
const BODY_PIECE_SX = [0, 64, 112, 120];
const BODY_PIECE_SY = [0, 0, 0, 40];
const BODY_PIECE_DIMENSION = [64, 48, 32, 16];
const HAND_BASE_DISTANCE = 80;
const COLOR_MODS = [
    new RGBA(),
    new RGBA(256, 160, 112),
    new RGBA(256, 112, 64)
];
;
const HAND_ATTACK_WAIT_TIME_MIN = 240;
const HAND_ATTACK_WAIT_TIME_MAX = 360;
const HAND_ATTACK_PROBABILITIES = [
    [
        0.40, // Fireball
        0.30, // Rush
        0.30, // Crush
        0.0, // Triple shot
    ],
    [
        0.3, // Fireball
        0.25, // Rush
        0.25, // Crush
        0.2, // Triple shot
    ],
    [
        0.0, // Fireball
        0.25, // Rush
        0.25, // Crush
        0.5, // Triple shot
    ]
];
const HAND_RUSH_RECOVER_TIME = 30;
const BASE_PLATFORM_WIDTH = TILE_WIDTH * 15;
class BodyPiece extends GameObject {
    constructor(x, y, id, followedObject, selfRadius, targetRadius) {
        super(x, y, true);
        this.followedObject = followedObject;
        this.targetRadius = targetRadius;
        this.radius = selfRadius;
        this.friction.x = 0.075;
        this.friction.y = 0.075;
        this.id = id;
        this.inCamera = true;
    }
    updateEvent(event) {
        const tpos = this.followedObject.getPosition();
        const dir = Vector.direction(this.pos, tpos);
        const distance = Vector.distance(this.pos, tpos);
        const minDistance = this.radius + this.targetRadius;
        /*
        if (distance < minDistance) {

            this.pos.x = tpos.x - dir.x*(minDistance);
            this.pos.y = tpos.y - dir.y*(minDistance);
            return;
        }
        */
        const speed = Math.max(0.0, (distance - minDistance) / 4.0);
        this.target.x = dir.x * speed;
        this.target.y = dir.y * speed;
    }
    drawDeath(canvas, bmp, t) {
        const sx = BODY_PIECE_SX[this.id] ?? 0;
        const sy = BODY_PIECE_SY[this.id] ?? 0;
        const dimension = BODY_PIECE_DIMENSION[this.id] ?? 64;
        const dx = this.pos.x - dimension / 2;
        const dy = this.pos.y - dimension / 2;
        canvas.drawFunnilyAppearingBitmap(bmp, 0 /* Flip.None */, dx, dy, sx, sy, dimension, dimension, t, dimension * 2, 4, 4);
    }
    draw(canvas, assets, bmp) {
        if (!this.isActive() || !this.followedObject.doesExist()) {
            return;
        }
        const sx = BODY_PIECE_SX[this.id] ?? 0;
        const sy = BODY_PIECE_SY[this.id] ?? 0;
        const dimension = BODY_PIECE_DIMENSION[this.id] ?? 64;
        const dx = this.pos.x - dimension / 2;
        const dy = this.pos.y - dimension / 2;
        // Body
        canvas.drawBitmap(bmp, 0 /* Flip.None */, dx, dy, sx, sy, dimension, dimension);
    }
}
// TODO: Put "Hand" to an external file if the class
// gets too long
class Hand extends CollisionObject {
    constructor(body, side, stage) {
        const bodyPos = body.getPosition();
        super(bodyPos.x + HAND_BASE_DISTANCE * side, bodyPos.y, true);
        this.side = 0;
        this.otherHand = undefined;
        this.positionCorrected = true;
        this.wave = 0.0;
        this.distanceWave = 0.0;
        this.phase = 0;
        this.attackPhase = 0;
        this.attackType = -1 /* HandAttack.Unknown */;
        this.attackTimer = 0;
        this.attackPrepareTimer = 0;
        this.rushing = false;
        this.crushing = false;
        this.playerRef = undefined;
        this.flip = 0 /* Flip.None */;
        this.projectiles = undefined;
        this.platformLeftSide = 0;
        this.shakeEvent = undefined;
        this.isPreparingAttack = () => this.attackPhase == 1 && this.attackPrepareTimer > 0;
        this.targetPos = this.pos.clone();
        this.mainBody = body;
        this.side = side;
        this.inCamera = true;
        this.friction.x = 0.15;
        this.friction.y = 0.15;
        this.flip = side < 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        // Left hand always attacks first
        this.attackTimer = side < 0 ? HAND_ATTACK_WAIT_TIME_MIN : HAND_ATTACK_WAIT_TIME_MAX;
        this.stage = stage;
        this.platformLeftSide = stage.width * TILE_WIDTH / 2 - BASE_PLATFORM_WIDTH / 2;
        this.takeCollisions = true;
        this.collisionBox = new Rectangle(0, -4, 32, 24);
    }
    shootFireball(typeID, speed, event, count = 1, isFollowing = false, lifetime = 0) {
        const ANGLE_OFF = Math.PI / 5.0;
        if (this.playerRef === undefined) {
            return;
        }
        // const shiftx : number =  this.pos.x - this.oldPos.x;
        // const shifty : number =  this.pos.y - this.oldPos.y;
        // Don't ask what "p" stands for, 'cause I don't know.
        const p = Math.floor(count / 2);
        const dir = Vector.direction(this.pos, this.playerRef.getPosition());
        const baseAngle = Math.atan2(dir.y, dir.x);
        const target = isFollowing ? this.playerRef : undefined;
        for (let i = -p; i <= p; ++i) {
            const angle = baseAngle + i * ANGLE_OFF;
            this.projectiles?.next().spawn(this.pos.x, this.pos.y, this.pos.x, this.pos.y, Math.cos(angle) * speed, Math.sin(angle) * speed, typeID, 3, false, -1, target, speed, false, false, lifetime, true);
        }
        event.audio.playSample(event.assets.getSample("throw"), 0.50);
    }
    shootRushBullets(event) {
        const PROJECTILE_SPEED = 2.0;
        const COUNT = 8;
        const step = Math.PI * 2 / 8.0;
        for (let i = 0; i < COUNT; ++i) {
            const angle = step * i;
            const dirx = Math.cos(angle);
            const diry = Math.sin(angle);
            const p = this.projectiles?.next();
            p.spawn(this.pos.x, this.pos.y, this.pos.x, this.pos.y, dirx * PROJECTILE_SPEED, diry * PROJECTILE_SPEED, 3, 2, false, -1, undefined, 0.0, false, true, 0, true);
            p.makeIgnoreCollision();
        }
    }
    spawnCrushProjectiles() {
        const BASE_SPEED = 0.4;
        const JUMP_SPEED = -3.5;
        const YOFF = 16;
        const SECONDARY_SPEED_BONUS = 1.2;
        const count = this.phase == 2 ? 2 : 1;
        for (let j = 0; j < count; ++j) {
            for (let i = -2; i <= 2; ++i) {
                if (i == 0) {
                    continue;
                }
                let speedx = Math.sign(i) * i * i * BASE_SPEED;
                let speedy = (Math.abs(i) == 1 ? 1.25 : 1.0) * JUMP_SPEED;
                if (j == 1) {
                    speedx *= SECONDARY_SPEED_BONUS;
                    speedy *= SECONDARY_SPEED_BONUS;
                }
                const p = this.projectiles?.next();
                p.spawn(this.pos.x, this.pos.y + YOFF, this.pos.x, this.pos.y + YOFF, speedx, speedy, 3, 2, false, -1, undefined, 0.0, true, true, 0, true);
                p.makeIgnoreCollision();
            }
        }
    }
    initiateRush(event) {
        if (this.playerRef === undefined) {
            return;
        }
        this.attackPhase = 2;
        this.targetPos = this.playerRef.getPosition();
        this.rushing = true;
    }
    initiateCrush(event) {
        const CRUSH_SPEED = 4.0;
        this.speed.y = CRUSH_SPEED;
        this.target.y = this.speed.y;
        this.speed.x = 0;
        this.target.x = 0;
        this.attackPhase = 2;
        this.crushing = true;
    }
    performAttack(event) {
        this.attackPhase = 0;
        switch (this.attackType) {
            case 0 /* HandAttack.ShootFireball */:
                this.shootFireball(7, 2.5, event, 1, false, 0);
                break;
            case 1 /* HandAttack.Rush */:
                this.initiateRush(event);
                break;
            case 2 /* HandAttack.Crush */:
                this.initiateCrush(event);
                break;
            case 3 /* HandAttack.TripleShot */:
                this.shootFireball(7, 2.0, event, 3, false, 0);
                break;
            default:
                break;
        }
    }
    updateRush(event) {
        const MOVE_SPEED = 3.5;
        if (this.attackPhase == 4) {
            this.attackPhase = 0;
            this.rushing = false;
            this.positionCorrected = false;
            this.attackType = -1 /* HandAttack.Unknown */;
            return;
        }
        if (this.attackPhase == 3 && this.attackPrepareTimer > 0) {
            this.attackPrepareTimer -= event.tick;
            if (this.attackPrepareTimer <= 0) {
                this.positionCorrected = false;
                this.attackPhase = 4; // ???
                // this.attackType = HandAttack.Unknown;
            }
            return;
        }
        // Note: from now on this is basically duplicate of reachTargetPosition,
        // maybe merge this two?
        const dir = Vector.direction(this.pos, this.targetPos);
        if (Vector.distance(this.pos, this.targetPos) < MOVE_SPEED * 2 * event.tick) {
            event.audio.playSample(event.assets.getSample("crush"), 0.50);
            this.attackPhase = 3;
            this.attackPrepareTimer = HAND_RUSH_RECOVER_TIME;
            this.speed.zeros();
            this.target.zeros();
            if (this.phase > 0) {
                this.shootRushBullets(event);
            }
            return;
        }
        this.target.x = dir.x * MOVE_SPEED;
        this.target.y = dir.y * MOVE_SPEED;
        if (this.attackPhase == 2) {
            this.speed.cloneFrom(this.target);
        }
    }
    updateCrush(event) {
        if (this.attackPhase == 2) {
            const bottom = (this.stage.height - 3) * TILE_HEIGHT;
            this.slopeCollision(this.platformLeftSide, bottom, this.platformLeftSide + BASE_PLATFORM_WIDTH, bottom, 1, event);
            // Should never happen, but let's play safe.
            if (this.pos.y > this.stage.height * TILE_HEIGHT) {
                this.crushing = false;
                this.attackPhase = 0;
                this.positionCorrected = false;
                this.attackType = -1 /* HandAttack.Unknown */;
                this.speed.zeros();
                this.target.zeros();
            }
            return;
        }
        if (this.attackPhase == 3) {
            this.attackPrepareTimer -= event.tick;
            if (this.attackPrepareTimer <= 0) {
                this.crushing = false;
                this.attackPhase = 0;
                this.positionCorrected = false;
                this.attackType = -1 /* HandAttack.Unknown */;
            }
        }
    }
    updateAttacking(event) {
        const PHASE_SPEED_UP = 0.20;
        const PREPARE_TIME = 60;
        if (this.attackPhase == 1) {
            // This should fix bugs where hand stars moving
            // horizontally when preparing the attack but
            // the main body takes damage.
            if (this.attackType == 2 /* HandAttack.Crush */) {
                this.speed.zeros();
                this.target.zeros();
            }
            this.attackPrepareTimer += event.tick;
            if (this.attackPrepareTimer >= PREPARE_TIME) {
                this.attackPrepareTimer = 0;
                this.performAttack(event);
            }
            return;
        }
        if (!this.positionCorrected) {
            return;
        }
        const attackTimerSpeed = 1.0 + this.phase * PHASE_SPEED_UP;
        this.attackTimer -= attackTimerSpeed * event.tick;
        if (this.otherHand?.isPreparingAttack()) {
            this.attackTimer = Math.max(60, this.attackTimer);
        }
        if (this.attackTimer <= 0) {
            event.audio.playSample(event.assets.getSample("charge3"), 0.50);
            this.attackPhase = 1;
            this.attackTimer = HAND_ATTACK_WAIT_TIME_MIN +
                Math.random() * (HAND_ATTACK_WAIT_TIME_MAX - HAND_ATTACK_WAIT_TIME_MIN);
            this.attackPrepareTimer = 0;
            this.attackType = sampleWeightedUniform(HAND_ATTACK_PROBABILITIES[this.phase] ?? [1.0]);
            const bottom = (this.stage.height - 3) * TILE_HEIGHT;
            if (this.attackType == 2 /* HandAttack.Crush */ &&
                (this.pos.x < this.platformLeftSide ||
                    this.pos.x > this.platformLeftSide + BASE_PLATFORM_WIDTH ||
                    this.pos.y > bottom + this.collisionBox.y - this.collisionBox.h / 2)) {
                this.attackType = 0 /* HandAttack.ShootFireball */;
            }
        }
    }
    updateFirstPhase(event) {
        const WAVE_SPEED = Math.PI * 2 / 480.0;
        const AMPLITUDE_Y = 48.0;
        const AMPLITUDE_X = 24.0;
        this.wave = (this.wave + WAVE_SPEED * event.tick) % (Math.PI * 2);
        if (this.rushing) {
            return;
        }
        const bodyPos = this.mainBody.getPosition();
        this.targetPos.x = bodyPos.x +
            (HAND_BASE_DISTANCE - Math.abs(Math.sin(this.wave) * AMPLITUDE_X)) * this.side;
        this.targetPos.y = bodyPos.y + Math.sin(this.wave) * AMPLITUDE_Y;
        this.flip = this.side < 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
    }
    updateSecondPhase(event) {
        const WAVE_SPEED = Math.PI * 2 / 600.0;
        const DISTANCE = 64;
        this.wave = (this.wave + WAVE_SPEED * event.tick) % (Math.PI * 2);
        if (this.rushing) {
            return;
        }
        const bodyPos = this.mainBody.getPosition();
        this.targetPos.x = bodyPos.x + Math.cos(this.wave) * this.side * DISTANCE;
        this.targetPos.y = bodyPos.y + Math.sin(this.wave) * this.side * DISTANCE;
        this.flip = this.pos.x < bodyPos.x ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
    }
    updateThirdPhase(event) {
        const WAVE_SPEED = Math.PI * 2 / 480.0;
        const DISTANCE_WAVE_SPEED = Math.PI * 2 / 210.0;
        const BASE_DISTANCE = 64;
        const DISTANCE_VARY = 16;
        this.wave = (this.wave + WAVE_SPEED * event.tick) % (Math.PI * 2);
        this.distanceWave = (this.distanceWave + DISTANCE_WAVE_SPEED * event.tick) % (Math.PI * 2);
        if (this.rushing) {
            return;
        }
        const bodyPos = this.mainBody.getPosition();
        const distance = BASE_DISTANCE + Math.sin(this.distanceWave) * DISTANCE_VARY;
        this.targetPos.x = bodyPos.x + Math.cos(this.wave) * this.side * distance;
        this.targetPos.y = bodyPos.y + Math.sin(this.wave) * this.side * distance;
        this.flip = this.pos.x < bodyPos.x ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
    }
    reachTargetPosition(event) {
        const MOVE_SPEED = 3.0;
        if (Vector.distance(this.pos, this.targetPos) < MOVE_SPEED * 2 * event.tick) {
            this.pos = this.targetPos.clone();
            this.positionCorrected = true;
            return;
        }
        const dir = Vector.direction(this.pos, this.targetPos);
        this.target.x = dir.x * MOVE_SPEED;
        this.target.y = dir.y * MOVE_SPEED;
    }
    determineFrame() {
        if ((this.attackPhase == 1 && this.attackType == 0 /* HandAttack.ShootFireball */) ||
            (this.attackPhase == 1 && this.attackType == 3 /* HandAttack.TripleShot */) ||
            (this.attackPhase == 3 && this.attackType == 1 /* HandAttack.Rush */) ||
            (this.attackType == 2 /* HandAttack.Crush */)) {
            return 1;
        }
        return 0;
    }
    determineFlip() {
        let flip = this.flip;
        if (this.attackType == 2 /* HandAttack.Crush */) {
            flip |= 2 /* Flip.Vertical */;
        }
        return flip;
    }
    determineDamage() {
        if ((this.crushing && this.attackPhase == 2)) {
            return 5;
        }
        return 3;
    }
    updateEvent(event) {
        // this.takeCollisions = this.crushing;
        switch (this.phase) {
            case 0:
                this.updateFirstPhase(event);
                break;
            case 1:
                this.updateSecondPhase(event);
                break;
            case 2:
                this.updateThirdPhase(event);
                break;
            default:
                break;
        }
        if (this.crushing) {
            this.updateCrush(event);
            return;
        }
        if (this.rushing) {
            this.updateRush(event);
            return;
        }
        if (this.positionCorrected) {
            if (this.attackType != 2 /* HandAttack.Crush */) {
                this.pos.x = this.targetPos.x;
                this.pos.y = this.targetPos.y;
            }
        }
        else {
            this.reachTargetPosition(event);
        }
        this.updateAttacking(event);
    }
    slopeCollisionEvent(direction, event) {
        const RECOVER_TIME = 30;
        if (this.crushing && this.attackPhase == 2) {
            this.attackPhase = 3;
            this.attackPrepareTimer = RECOVER_TIME;
            this.speed.zeros();
            this.target.zeros();
            event.audio.playSample(event.assets.getSample("thwomp"), 0.50);
            this.shakeEvent?.(60, 4);
            this.spawnCrushProjectiles();
        }
    }
    drawDeath(canvas, bmp, t) {
        const dx = this.pos.x - 24;
        const dy = this.pos.y - 24;
        canvas.drawFunnilyAppearingBitmap(bmp, this.determineFlip(), dx, dy, 0, 64, 48, 48, t, 96, 4, 4);
    }
    draw(canvas, assets, bmp) {
        if (!this.isActive()) {
            return;
        }
        const flicker = this.attackPhase == 1 &&
            Math.floor(this.attackPrepareTimer / 4) % 2 != 0;
        const dx = this.pos.x - 24;
        const dy = this.pos.y - 24;
        const frame = this.determineFrame();
        const flip = this.determineFlip();
        if (flicker) {
            canvas.applyEffect(1 /* Effect.FixedColor */);
            canvas.setColor();
        }
        canvas.drawBitmap(bmp, flip, dx, dy, frame * 48, 64, 48, 48);
        if (flicker) {
            canvas.applyEffect(0 /* Effect.None */);
        }
    }
    postDraw(canvas, bmp) {
        const CROSSHAIR_BASE_OFFSET = 14;
        const CROSSHAIR_VARY = 6;
        if (!this.isActive()) {
            return;
        }
        // Crosshair
        if (this.attackType == 1 /* HandAttack.Rush */ && this.attackPhase < 3) {
            const m = HAND_RUSH_RECOVER_TIME / 2;
            let t = 0;
            if (this.attackPrepareTimer > 0) {
                t = (this.attackPrepareTimer % m) / m;
            }
            const p = CROSSHAIR_BASE_OFFSET - Math.round((1.0 - Math.sin(t * Math.PI)) * CROSSHAIR_VARY);
            let cx = this.targetPos.x;
            let cy = this.targetPos.y;
            if (this.attackPhase == 1) {
                const ppos = this.playerRef?.getPosition() ?? this.targetPos;
                cx = ppos.x;
                cy = ppos.y;
            }
            canvas.setAlpha(0.75);
            // Top arrow
            canvas.drawBitmap(bmp, 0 /* Flip.None */, cx - 6, cy - p - 4, 122, 104, 12, 8);
            // Bottom arrow
            canvas.drawBitmap(bmp, 0 /* Flip.None */, cx - 6, cy + p - 4, 122, 128, 12, 8);
            // Left arrow
            canvas.drawBitmap(bmp, 0 /* Flip.None */, cx - p - 4, cy - 6, 112, 114, 8, 12);
            // Right arrow
            canvas.drawBitmap(bmp, 0 /* Flip.None */, cx + p - 4, cy - 6, 136, 114, 8, 12);
            canvas.setAlpha();
        }
    }
    playerCollision(player, event, doNotHarm = false) {
        const HURT_WIDTH = 24;
        const HURT_HEIGHT = 16;
        this.playerRef = player;
        if (!this.isActive() || !player.isActive()) {
            return;
        }
        // This is ugly, I know
        if (doNotHarm) {
            return;
        }
        player.hurtCollision(this.pos.x - HURT_WIDTH / 2, this.pos.y - HURT_HEIGHT / 2, HURT_WIDTH, HURT_HEIGHT, event, Math.sign(player.getPosition().x - this.pos.x), this.determineDamage());
    }
    setPhase(phase) {
        if (this.phase != phase && phase == 1) {
            this.positionCorrected = false;
        }
        this.phase = clamp(phase, 0, 2);
    }
    setOtherHandReference(hand) {
        this.otherHand = hand;
    }
    passProjectileGenerator(projectiles) {
        this.projectiles = projectiles;
    }
    passCallbacks(shakeEvent) {
        this.shakeEvent = shakeEvent;
    }
    stopAttackingIfPossible() {
        if (this.attackPhase == 1 && this.attackPrepareTimer > 0) {
            this.attackPhase = 0;
            this.attackPrepareTimer = 0;
            this.crushing = false;
            this.rushing = false;
            this.attackType = -1 /* HandAttack.Unknown */;
        }
    }
}
export class FinalBoss extends Enemy {
    constructor(x, y, stage, deathEvent, triggerDeathEvent, spawnGhostCallback) {
        super(x, y);
        this.initialPosReached = false;
        this.initialHealth = TOTAL_HEALTH;
        this.healthBarPos = 0.0;
        this.playerRef = undefined;
        this.wave = 0.0;
        this.phase = 0;
        this.ghostSpawnTimer = 0;
        this.previousDirection = 0;
        this.deathTimer = 0;
        this.deathTriggered = false;
        this.shakeTimer = 0;
        this.appearTimer = APPEAR_TIME;
        this.sprite.resize(64, 64);
        this.sprite.setFrame(1, 0);
        this.health = TOTAL_HEALTH;
        this.initialHealth = TOTAL_HEALTH;
        this.attackPower = 4;
        this.dropProbability = 0.0;
        this.collisionBox = new Rectangle(0, 0, 60, 60);
        this.hitbox = new Rectangle(0, 0, 56, 56);
        this.overriddenHurtbox = new Rectangle(0, 0, 40, 40);
        this.target.zeros();
        // this.ignoreBottomLayer = true;
        this.takeCollisions = false;
        // this.canHurtPlayer = false;
        // this.canBeMoved = false;
        this.friction.x = 0.05;
        this.friction.y = 0.05;
        this.knockbackFactor = 0.5;
        this.deathEvent = deathEvent;
        this.triggerDeathEvent = triggerDeathEvent;
        this.spawnGhostCallback = spawnGhostCallback;
        this.cameraCheckArea.x = 1024;
        this.cameraCheckArea.y = 1024;
        this.deathSound = "eye_death";
        this.dir = Math.random() > 0.5 ? 1 : -1;
        this.bodyPieces = new Array(3);
        this.createBodyPieces();
        this.hands = new Array(2);
        this.hands[0] = new Hand(this, -1, stage);
        this.hands[1] = new Hand(this, 1, stage);
        this.hands[0].setOtherHandReference(this.hands[1]);
        this.hands[1].setOtherHandReference(this.hands[0]);
        this.sprite = new Sprite(64, 32);
        this.sprite.setFrame(1, 0);
    }
    createBodyPieces() {
        this.bodyPieces[0] = new BodyPiece(this.pos.x, this.pos.y + 24, 1, this, 12, 16);
        this.bodyPieces[1] = new BodyPiece(this.pos.x, this.pos.y + 48, 2, this.bodyPieces[0], 8, 12);
        this.bodyPieces[2] = new BodyPiece(this.pos.x, this.pos.y + 64, 3, this.bodyPieces[1], 8, 8);
    }
    reachInitialPos(event) {
        this.speed.y = -0.5 - (this.pos.y - INITIAL_Y) / 64;
        this.target.y = this.speed.y;
    }
    updateGhostGenerator(event) {
        const BASE_GHOST_TIME = 360;
        const PHASE_SPEED_FACTOR = 0.25;
        const count = this.phase == 2 ? 2 : 1;
        const speed = 1.0 + PHASE_SPEED_FACTOR * this.phase;
        this.ghostSpawnTimer += speed * event.tick;
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
    shootTooth(event) {
        const RADIUS = 16;
        const SPEED_X_RADIUS = 1.75;
        const SPEED_Y_MIN = 2.5;
        const SPEED_Y_MAX = 3.5;
        const dx = this.pos.x + (Math.random() * 2 - 1.0) * RADIUS;
        const dy = this.pos.y + 12;
        const speedx = (Math.random() * 2 - 1.0) * SPEED_X_RADIUS;
        const speedy = -(SPEED_Y_MIN + Math.random() * (SPEED_Y_MAX - SPEED_Y_MIN));
        this.projectiles?.next().spawn(dx, dy, dx, dy, speedx, speedy, 10, 3, false, -1, undefined, 0.0, true, false, 0, true);
        event.audio.playSample(event.assets.getSample("tooth"), 0.60);
    }
    updateMouth(event) {
        const MOUTH_ANIMATION_BASE_TIME = 6;
        const MOUTH_ANIMATION_WAIT_TIME_1 = 60;
        const MOUTH_ANIMATION_WAIT_TIME_2 = 24;
        const oldFrame = this.sprite.getColumn();
        let frameTime = MOUTH_ANIMATION_BASE_TIME;
        if (oldFrame == 0) {
            frameTime = this.phase == 1 ? MOUTH_ANIMATION_WAIT_TIME_1 : MOUTH_ANIMATION_WAIT_TIME_2;
        }
        this.sprite.animate(0, 0, 3, frameTime, event.tick);
        if (this.sprite.getColumn() == 2 && oldFrame == 1) {
            this.shootTooth(event);
        }
    }
    updateFirstPhase(event) {
        const HORIZONTAL_RADIUS = TILE_WIDTH * 9;
        const WAVE_SPEED = Math.PI * 2 / 360.0;
        const AMPLITUDE_Y = 1.0;
        const SPEED_X = 0.75;
        this.wave = (this.wave + WAVE_SPEED * event.tick) % (Math.PI * 2);
        this.target.y = Math.sin(this.wave) * AMPLITUDE_Y;
        this.target.x = SPEED_X * this.dir;
        if ((this.dir < 0 && this.pos.x < this.initialPos.x - HORIZONTAL_RADIUS) ||
            (this.dir > 0 && this.pos.x > this.initialPos.x + HORIZONTAL_RADIUS)) {
            this.dir = this.pos.x < this.initialPos.x ? 1 : -1;
            this.target.x *= -1;
        }
    }
    // TODO: This is almost the same first phase, merge & pass parameters?
    updateSecondPhase(event) {
        const HORIZONTAL_TRIGGER = 32;
        const WAVE_SPEED = Math.PI * 2 / 360.0;
        const AMPLITUDE_Y = 1.0;
        const SPEED_X = 0.75;
        const pposx = this.playerRef?.getPosition().x ?? this.initialPos.x;
        this.wave = (this.wave + WAVE_SPEED * event.tick) % (Math.PI * 2);
        this.target.y = Math.sin(this.wave) * AMPLITUDE_Y;
        this.target.x = SPEED_X * this.dir;
        if ((this.dir < 0 && this.pos.x < pposx - HORIZONTAL_TRIGGER) ||
            (this.dir > 0 && this.pos.x > pposx + HORIZONTAL_TRIGGER)) {
            this.dir = this.pos.x < pposx ? 1 : -1;
            this.target.x *= -1;
        }
        this.updateMouth(event);
    }
    updateThirdPhase(event) {
        const SPEED = 0.5;
        if (this.playerRef === undefined) {
            return;
        }
        const dir = Vector.direction(this.pos, this.playerRef.getPosition());
        this.target.x = dir.x * SPEED;
        this.target.y = dir.y * SPEED;
        this.updateMouth(event);
    }
    updateHealthbarPos(event) {
        const speed = this.health < this.initialHealth ? 0.005 : 0.015;
        this.healthBarPos = clamp(updateSpeedAxis(this.healthBarPos, this.health / this.initialHealth, speed * event.tick), 0.0, 1.0);
    }
    drawDeath(canvas, bmp) {
        const dx = this.pos.x - 32;
        const dy = this.pos.y - 32;
        const t = this.deathTimer / DEATH_TIME;
        this.setColorMod(canvas);
        canvas.setAlpha(1.0 - t);
        // Body parts
        for (const o of this.bodyPieces) {
            o.drawDeath(canvas, bmp, t);
        }
        // Main body
        canvas.drawFunnilyAppearingBitmap(bmp, 0 /* Flip.None */, dx, dy, 0, 0, 64, 64, t, 256, 4, 4);
        // Hands
        for (const o of this.hands) {
            o.drawDeath(canvas, bmp, t);
        }
        canvas.setColor();
        canvas.setAlpha(1.0 - t);
        // Hat
        canvas.drawFunnilyAppearingBitmap(bmp, 0 /* Flip.None */, dx + 8, dy - 16, 0, 112, 48, 24, t, 128, 4, 4);
        canvas.setColor();
    }
    setColorMod(canvas) {
        const color = COLOR_MODS[this.phase] ?? COLOR_MODS[0];
        canvas.setColor(color.r, color.g, color.b);
    }
    updateLogic(event) {
        const SHAKE_TIME = 60;
        if (this.appearTimer > 0) {
            this.appearTimer -= event.tick;
        }
        this.updateGhostGenerator(event);
        const oldPhase = this.phase;
        this.phase = 2 - Math.min(2, Math.floor(this.health / (TOTAL_HEALTH / 3)));
        if (this.phase > oldPhase) {
            for (const o of this.hands) {
                o.stopAttackingIfPossible();
            }
            this.shakeTimer = SHAKE_TIME;
            this.shakeEvent?.(60, 4);
            event.audio.playSample(event.assets.getSample("thwomp"), 0.40);
        }
        if (this.shakeTimer > 0) {
            this.shakeTimer -= event.tick;
            this.speed.zeros();
            this.target.zeros();
            return;
        }
        for (const o of this.bodyPieces) {
            o.update(event);
        }
        this.updateHealthbarPos(event);
        if (!this.initialPosReached) {
            this.reachInitialPos(event);
            return;
        }
        switch (this.phase) {
            case 0:
                this.updateFirstPhase(event);
                break;
            case 1:
                this.updateSecondPhase(event);
                break;
            case 2:
                this.updateThirdPhase(event);
                break;
            default:
                this.updateFirstPhase(event);
                break;
        }
    }
    postMovementEvent(event) {
        if (!this.initialPosReached && this.pos.y < INITIAL_Y) {
            this.pos.y = INITIAL_Y;
            this.initialPosReached = true;
            this.target.zeros();
            this.speed.zeros();
        }
        for (const o of this.hands) {
            o.update(event);
            o.setPhase(this.phase);
        }
    }
    die(event) {
        if (event.audio.isMusicPlaying()) {
            event.audio.stopMusic();
        }
        if (!this.deathTriggered) {
            this.triggerDeathEvent?.(event);
            this.deathTriggered = true;
        }
        // const shakeAmount : number = Math.floor(this.deathTimer/6);
        // this.shakeEvent?.(2, shakeAmount);
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
        for (const o of this.hands) {
            // o.setPlayerReference(player);
            o.playerCollision(player, event, this.hurtTimer > 0 && this.shakeTimer > 0);
        }
    }
    draw(canvas, assets, bmp) {
        if (!this.exist || !this.inCamera) {
            return;
        }
        const bmpFinalboss = assets?.getBitmap("finalboss");
        const bmpMouth = assets?.getBitmap("mouth");
        if (this.dying) {
            this.drawDeath(canvas, bmpFinalboss);
            return;
        }
        let alpha = 1.0;
        if (this.appearTimer > 0) {
            alpha = 1.0 - this.appearTimer / APPEAR_TIME;
        }
        this.setColorMod(canvas);
        canvas.setAlpha(alpha);
        const hurtFlicker = !this.dying &&
            this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer / 4) % 2 != 0;
        if (hurtFlicker) {
            canvas.applyEffect(1 /* Effect.FixedColor */);
            canvas.setColor(255, 255, 255);
        }
        // Body pieces
        for (let i = this.bodyPieces.length - 1; i >= 0; --i) {
            this.bodyPieces[i].draw(canvas, assets, bmpFinalboss);
        }
        const dx = this.pos.x - 32;
        const dy = this.pos.y - 32;
        // Body
        canvas.drawBitmap(bmpFinalboss, 0 /* Flip.None */, dx, dy, 0, 0, 64, 64);
        // Eyes
        if (this.phase > 0) {
            canvas.drawBitmap(bmpFinalboss, 0 /* Flip.None */, dx, dy, 48, 112, 32, 32);
        }
        if (this.phase > 1) {
            canvas.drawBitmap(bmpFinalboss, 0 /* Flip.None */, dx + 32, dy, 80, 112, 32, 32);
        }
        canvas.setColor(255, 255, 255, alpha);
        // Mouth
        this.sprite.draw(canvas, bmpMouth, dx, dy + 24, 0 /* Flip.None */);
        // Hat
        canvas.drawBitmap(bmpFinalboss, 0 /* Flip.None */, dx + 8, dy - 16, 0, 112, 48, 24);
        if (hurtFlicker) {
            canvas.applyEffect(0 /* Effect.None */);
        }
        for (const o of this.hands) {
            this.setColorMod(canvas);
            canvas.setAlpha(alpha);
            o.draw(canvas, assets, bmpFinalboss);
        }
        canvas.setColor();
    }
    postDraw(canvas, assets) {
        if (!this.isActive()) {
            return;
        }
        const bmpFinalboss = assets?.getBitmap("finalboss");
        for (const o of this.hands) {
            o.postDraw(canvas, bmpFinalboss);
        }
    }
    hasReachedInitialPos() {
        return this.initialPosReached;
    }
    getHealthbarHealth() {
        return Math.max(0.0, this.healthBarPos);
    }
    // Override
    passGenerators(flyingText, collectables, projectiles) {
        this.flyingText = flyingText;
        this.collectables = collectables;
        this.projectiles = projectiles;
        for (const o of this.hands) {
            o.passProjectileGenerator(this.projectiles);
        }
    }
    // Override
    passShakeEvent(shakeEvent) {
        this.shakeEvent = shakeEvent;
        for (const o of this.hands) {
            o.passCallbacks(shakeEvent);
        }
    }
}
