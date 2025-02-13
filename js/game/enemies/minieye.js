import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { Enemy } from "./enemy.js";
// For orbitals
const H_RADIUS = 24;
const V_RADIUS = 24;
export class MiniEye extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.wave = 0;
        this.attackTimer = 0;
        this.attackPhase = 0;
        this.orbitalTimer = 0.0;
        this.playerRef = undefined;
        this.sprite.setFrame(4, 15);
        this.health = 16;
        this.attackPower = 4;
        this.dropProbability = 1.0;
        this.dir = 0;
        this.target.y = 0.0;
        this.friction.x = 0.0625;
        this.friction.y = 0.0625;
        this.knockbackFactor = 0.80;
        this.coinTypeWeights[1] = 1.0;
        this.collisionBox.w = 12;
        this.collisionBox.h = 12;
        this.hitbox.w = 18;
        this.hitbox.h = 18;
        this.overriddenHurtbox = new Rectangle(0, 0, 12, 12);
        this.targetDir = new Vector(1, 0);
        this.cameraCheckArea.x = 80;
        this.cameraCheckArea.y = 80;
        this.stonePositions = new Array(2);
        for (let i = 0; i < this.stonePositions.length; ++i) {
            this.stonePositions[i] = new Vector();
            this.computeStonePosition(i);
        }
    }
    // Copy-paste from boxman, might have been a good idea
    // to make a class for orbitals or something
    computeStonePosition(index) {
        if (index < 0 || index > 1) {
            return;
        }
        const dir = index == 0 ? 1 : -1;
        const dx = this.pos.x + dir * (Math.sin(this.orbitalTimer) * H_RADIUS);
        const dy = this.pos.y + (Math.sin(this.orbitalTimer) * V_RADIUS);
        this.stonePositions[index].x = dx;
        this.stonePositions[index].y = dy;
    }
    shoot(event) {
        const SHOOT_SPEED = 1.5;
        const INITIAL_SHOT_SPEED = 2.0;
        const ANGLE_DIF = Math.PI / 5;
        const targetAngle = Math.atan2(this.targetDir.y, this.targetDir.x);
        for (let i = -1; i <= 1; ++i) {
            const angle = targetAngle + ANGLE_DIF * i;
            const speedx = Math.cos(angle) * INITIAL_SHOT_SPEED;
            const speedy = Math.sin(angle) * INITIAL_SHOT_SPEED;
            this.projectiles?.next().spawn(this.pos.x, this.pos.y, this.pos.x + this.dir * 2, this.pos.y - 1, speedx, speedy, 4, 4, false, -1, this.playerRef, SHOOT_SPEED, false, false, 240);
        }
        event.audio.playSample(event.assets.getSample("throw"), 0.50);
    }
    drawOrbital(canvas, bmp, index, behind) {
        if (this.dying) {
            return;
        }
        const p = this.stonePositions[index];
        let size = Math.abs(p.x - this.pos.x) < H_RADIUS / 2 ? (behind ? 2 : 0) : 1;
        const sx = size == 1 ? 180 : 168;
        const sy = size == 2 ? 12 : 0;
        canvas.drawBitmap(bmp, 0 /* Flip.None */, p.x - 6, p.y - 6, sx, sy, 12, 12);
    }
    updateLogic(event) {
        const ORBITAL_SPEED = Math.PI * 2 / 240.0;
        const WAVE_SPEED = Math.PI * 2 / 300.0;
        const SHOOT_TIME = 150;
        this.orbitalTimer = (this.orbitalTimer + ORBITAL_SPEED * event.tick) % (Math.PI * 2);
        for (let i = 0; i < this.stonePositions.length; ++i) {
            this.computeStonePosition(i);
        }
        if (this.attackPhase == 1) {
            this.target.zeros();
            const oldFrame = this.sprite.getColumn();
            this.sprite.animate(this.sprite.getRow(), 5, 8, this.sprite.getColumn() == 6 ? 15 : 6, event.tick);
            if (this.sprite.getColumn() == 7 && oldFrame == 6) {
                this.shoot(event);
            }
            if (this.sprite.getColumn() == 8) {
                this.sprite.setFrame(4, this.sprite.getRow());
                this.attackPhase = 0;
            }
            return;
        }
        this.attackTimer += event.tick;
        if (this.attackTimer >= SHOOT_TIME) {
            this.attackPhase = 1;
            this.attackTimer = 0;
            return;
        }
        this.wave = (this.wave + WAVE_SPEED * event.tick) % (Math.PI * 2);
    }
    playerEvent(player, event) {
        const BASE_DISTANCE = 64;
        const FOLLOW_SPEED = 0.625;
        const HURT_RADIUS = 1;
        const DAMAGE = 3;
        this.playerRef = player;
        const ppos = player.getPosition();
        this.targetDir = Vector.direction(this.pos, ppos);
        this.flip = ppos.x > this.pos.x ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        // Collision with orbitals
        for (const p of this.stonePositions) {
            player.hurtCollision(p.x - HURT_RADIUS, p.y - HURT_RADIUS, HURT_RADIUS * 2, HURT_RADIUS * 2, event, Math.sign(ppos.x - this.pos.x), DAMAGE);
        }
        if (this.hurtTimer > 0 || this.attackPhase != 0) {
            this.target.zeros();
            return;
        }
        ppos.x += Math.sin(this.wave) * BASE_DISTANCE;
        ppos.y += Math.cos(this.wave) * BASE_DISTANCE;
        const dir = Vector.direction(this.pos, ppos);
        this.target.x = dir.x * FOLLOW_SPEED;
        this.target.y = dir.y * FOLLOW_SPEED;
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
        const firstPhase = this.orbitalTimer >= Math.PI + Math.PI / 2 || this.orbitalTimer < Math.PI / 2;
        if (firstPhase) {
            this.drawOrbital(canvas, bmp, 0, true);
        }
        if (!firstPhase) {
            this.drawOrbital(canvas, bmp, 1, true);
        }
        this.sprite.draw(canvas, bmp, dx, dy, this.flip);
        if (!firstPhase) {
            this.drawOrbital(canvas, bmp, 0, false);
        }
        if (firstPhase) {
            this.drawOrbital(canvas, bmp, 1, false);
        }
    }
}
