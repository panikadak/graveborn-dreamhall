import { Vector } from "../../math/vector.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";
const BASE_SPEED = 0.50;
// For orbitals
const H_RADIUS = 20;
const V_RADIUS = 20;
export class BoxMan extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.orbitalTimer = 0.0;
        this.sprite.setFrame(1, 11);
        this.health = 12;
        this.attackPower = 4;
        this.dropProbability = 0.60;
        this.dir = (Math.floor(x / TILE_WIDTH) % 2) == 0 ? 1 : -1;
        this.collisionBox.w = 8;
        this.knockbackFactor = 1.0;
        this.coinTypeWeights[0] = 0.50;
        this.coinTypeWeights[1] = 0.50;
        this.stonePositions = new Array(2);
        for (let i = 0; i < this.stonePositions.length; ++i) {
            this.stonePositions[i] = new Vector();
            this.computeStonePosition(i);
        }
        this.cameraCheckArea.x = 48;
        this.cameraCheckArea.y = 48;
    }
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
    wallCollisionEvent(direction, event) {
        this.dir = -direction;
        this.target.x = BASE_SPEED * this.dir;
        this.speed.x = this.target.x;
    }
    updateLogic(event) {
        const WAVE_SPEED = Math.PI * 2 / 180.0;
        const ANIMATION_SPEED = 8;
        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
        if (this.hurtTimer <= 0 && !this.touchSurface && this.didTouchSurface) {
            this.dir *= -1;
            this.pos.x += BASE_SPEED * this.dir;
            this.pos.y = this.oldPos.y;
            this.speed.x = BASE_SPEED * this.dir;
        }
        this.flip = this.dir > 0 ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
        this.target.x = this.computeSlopeSpeedFactor() * BASE_SPEED * this.dir;
        this.orbitalTimer = (this.orbitalTimer + WAVE_SPEED * event.tick) % (Math.PI * 2);
        for (let i = 0; i < this.stonePositions.length; ++i) {
            this.computeStonePosition(i);
        }
    }
    enemyCollisionEvent(enemy, event) {
        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;
        this.target.x = BASE_SPEED * this.dir;
        this.speed.x = this.target.x;
    }
    playerEvent(player, event) {
        const HURT_RADIUS = 1;
        const DAMAGE = 3;
        const ppos = player.getPosition();
        for (const p of this.stonePositions) {
            player.hurtCollision(p.x - HURT_RADIUS, p.y - HURT_RADIUS, HURT_RADIUS * 2, HURT_RADIUS * 2, event, Math.sign(ppos.x - this.pos.x), DAMAGE);
        }
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
