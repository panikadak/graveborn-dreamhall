import { clamp } from "../math/utility.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
const START_INDEX = 257;
export class CollisionMap {
    constructor(baseMap, collisionMap) {
        this.collisions = (new Array(baseMap.width * baseMap.height)).fill(0);
        this.width = baseMap.width;
        this.height = baseMap.height;
        // This reference is only needed if the collision map is updated.
        this.collisionMap = collisionMap;
        this.createCollisionTiles(baseMap, collisionMap);
    }
    getTile(x, y) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return 0;
        }
        return this.collisions[y * this.width + x];
    }
    computeCollisionTile(x, y, baseMap, collisionMap) {
        const LAYER_NAME = ["bottom", "middle", "top"];
        const index = y * this.width + x;
        for (let layer = 0; layer < 3; ++layer) {
            // TODO: A bit slow, maybe clone the tilemap and then do the magic?
            const tileID = baseMap.getTile(LAYER_NAME[layer], x, y);
            if (tileID <= 0) {
                continue;
            }
            for (let i = 0; i < 4; ++i) {
                const colTileID = collisionMap.getIndexedTile(String(i + 1), tileID - 1) - START_INDEX;
                if (colTileID < 0)
                    continue;
                this.collisions[index] |= (1 << colTileID);
            }
            // TODO: If there are collisions from several layers, maybe disable this flag?
            if (this.collisions[index] != 0 && layer == 0) {
                this.collisions[index] |= 134217728 /* CollisionBit.ContainsBottomLayer */;
            }
        }
    }
    createCollisionTiles(baseMap, collisionMap) {
        for (let y = 0; y < this.height; ++y) {
            for (let x = 0; x < this.width; ++x) {
                this.computeCollisionTile(x, y, baseMap, collisionMap);
            }
        }
    }
    boxCollision(o, x, y, w, h, event) {
        const VERTICAL_OFFSET = 1;
        o.slopeCollision(x, y, x + w, y, 1, event, 1, 1);
        o.slopeCollision(x, y + h, x + w, y + h, -1, event, 1, 1);
        o.wallCollision(x, y + VERTICAL_OFFSET, h - VERTICAL_OFFSET * 2, 1, event);
        o.wallCollision(x + w, y + VERTICAL_OFFSET, h - VERTICAL_OFFSET * 2, -1, event);
    }
    tileCollision(o, x, y, colID, event) {
        const HORIZONTAL_OFFSET = 1;
        const VERTICAL_OFFSET = 1;
        const SLOPE_SAFE_MARGIN_NEAR = 2.0;
        const SLOPE_SAFE_MARGIN_FAR = 4.0;
        const SLOPE_MASK = 0b11111111 << 4;
        const GENTLE_SLOPE_SAFE_MARGIN_NEAR = 3.0;
        const GENTLE_SLOPE_SAFE_MARGIN_FAR = 4.0;
        const CORRECTION_SLOPE_LENGTH = 4;
        const SPIKE_WIDTH = 10;
        const SPIKE_HEIGHT = 8;
        const SPIKE_DAMAGE = 5;
        const dx = x * TILE_WIDTH;
        const dy = y * TILE_HEIGHT;
        // Check if ignores bottom layer
        if (o.doesIgnoreBottomLayer() && (colID & 134217728 /* CollisionBit.ContainsBottomLayer */) != 0) {
            return;
        }
        // Floor
        if ((colID & 1 /* CollisionBit.Top */) != 0 &&
            !o.doesIgnoreEvenSlopes()) {
            // If the floor is next to a slope, then ignore the object width.
            const leftTile = this.getTile(x - 1, y);
            const rightTile = this.getTile(x + 1, y);
            const leftMargin = Number((leftTile & SLOPE_MASK) == 0);
            const rightMargin = Number((rightTile & SLOPE_MASK) == 0);
            o.slopeCollision(dx + HORIZONTAL_OFFSET * leftMargin, dy, dx + TILE_WIDTH - HORIZONTAL_OFFSET * rightMargin, dy, 1, event, leftMargin, rightMargin);
        }
        // Ceiling
        if ((colID & 4 /* CollisionBit.Bottom */) != 0) {
            o.slopeCollision(dx + HORIZONTAL_OFFSET, dy + TILE_HEIGHT, dx + TILE_WIDTH - HORIZONTAL_OFFSET, dy + TILE_HEIGHT, -1, event);
        }
        // Left
        if ((colID & 8 /* CollisionBit.Left */) != 0) {
            o.wallCollision(dx, dy + VERTICAL_OFFSET, TILE_HEIGHT - VERTICAL_OFFSET * 2, 1, event);
        }
        // Right
        if ((colID & 2 /* CollisionBit.Right */) != 0) {
            o.wallCollision(dx + TILE_WIDTH, dy + VERTICAL_OFFSET, TILE_HEIGHT - VERTICAL_OFFSET * 2, -1, event);
        }
        // -------------------------------------- //
        const spikeOffX = (TILE_WIDTH - SPIKE_WIDTH) / 2;
        const spikeOffY = TILE_HEIGHT - SPIKE_HEIGHT;
        // Spike bottom
        if ((colID & 65536 /* CollisionBit.SpikeBottom */) != 0) {
            o.hurtCollision?.(dx + spikeOffX, dy + spikeOffY, SPIKE_WIDTH, SPIKE_HEIGHT, event, 0, SPIKE_DAMAGE);
            this.boxCollision(o, dx + spikeOffX, dy + spikeOffY, SPIKE_WIDTH, SPIKE_HEIGHT, event);
        }
        // Spike top
        if ((colID & 262144 /* CollisionBit.SpikeTop */) != 0) {
            o.hurtCollision?.(dx + spikeOffX, dy, SPIKE_WIDTH, SPIKE_HEIGHT, event, 0, SPIKE_DAMAGE);
            this.boxCollision(o, dx + spikeOffX, dy, SPIKE_WIDTH, SPIKE_HEIGHT, event);
        }
        // Spike left
        if ((colID & 524288 /* CollisionBit.SpikeLeft */) != 0) {
            o.hurtCollision?.(dx + spikeOffY, dy + spikeOffX, SPIKE_HEIGHT, SPIKE_WIDTH, event, 0, SPIKE_DAMAGE);
            this.boxCollision(o, dx + spikeOffY, dy + spikeOffX, SPIKE_HEIGHT, SPIKE_WIDTH, event);
        }
        // Spike right
        if ((colID & 131072 /* CollisionBit.SpikeRight */) != 0) {
            o.hurtCollision?.(dx, dy + spikeOffX, SPIKE_HEIGHT, SPIKE_WIDTH, event, 0, SPIKE_DAMAGE);
            this.boxCollision(o, dx, dy + spikeOffX, SPIKE_HEIGHT, SPIKE_WIDTH, event);
        }
        // -------------------------------------- //
        // Slope top-left
        if ((colID & 16 /* CollisionBit.SlopeTopLeft */) != 0) {
            o.slopeCollision(dx, dy + TILE_HEIGHT, dx + TILE_WIDTH, dy, 1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        // Slope top-right
        if ((colID & 32 /* CollisionBit.SlopeTopRight */) != 0) {
            o.slopeCollision(dx, dy, dx + TILE_WIDTH, dy + TILE_HEIGHT, 1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        // Slope bottom-right
        if ((colID & 64 /* CollisionBit.SlopeBottomRight */) != 0) {
            o.slopeCollision(dx, dy + TILE_HEIGHT, dx + TILE_WIDTH, dy, -1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        // Slope top-right
        if ((colID & 128 /* CollisionBit.SlopeBottomLeft */) != 0) {
            o.slopeCollision(dx, dy, dx + TILE_WIDTH, dy + TILE_HEIGHT, -1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        // Gentle slope top-left
        if ((colID & 256 /* CollisionBit.GentleSlopeTopLeftFirst */) != 0) {
            o.slopeCollision(dx, dy + TILE_HEIGHT, dx + TILE_WIDTH, dy + TILE_HEIGHT / 2, 1, event, 0, 0, GENTLE_SLOPE_SAFE_MARGIN_NEAR, GENTLE_SLOPE_SAFE_MARGIN_FAR);
        }
        if ((colID & 512 /* CollisionBit.GentleSlopeTopLeftSecond */) != 0) {
            o.slopeCollision(dx, dy + TILE_HEIGHT / 2, dx + TILE_WIDTH, dy, 1, event, 0, 0, GENTLE_SLOPE_SAFE_MARGIN_NEAR, GENTLE_SLOPE_SAFE_MARGIN_FAR);
        }
        // Gentle slope top-right
        if ((colID & 1024 /* CollisionBit.GentleSlopeTopRightFirst */) != 0) {
            o.slopeCollision(dx, dy, dx + TILE_WIDTH, dy + TILE_HEIGHT / 2, 1, event, 0, 0, GENTLE_SLOPE_SAFE_MARGIN_NEAR, GENTLE_SLOPE_SAFE_MARGIN_FAR);
        }
        if ((colID & 2048 /* CollisionBit.GentleSlopeTopRightSecond */) != 0) {
            o.slopeCollision(dx, dy + TILE_HEIGHT / 2, dx + TILE_WIDTH, dy + TILE_HEIGHT, 1, event, 0, 0, GENTLE_SLOPE_SAFE_MARGIN_NEAR, GENTLE_SLOPE_SAFE_MARGIN_FAR);
        }
        // Correction slopes to top-left direction
        if ((colID & 4096 /* CollisionBit.CorrectionSlopeBottomLeft */) != 0) {
            o.slopeCollision(dx - CORRECTION_SLOPE_LENGTH, dy + CORRECTION_SLOPE_LENGTH, dx, dy, 1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        if ((colID & 16384 /* CollisionBit.CorrectionSlopeTopRight */) != 0) {
            o.slopeCollision(dx, dy, dx + CORRECTION_SLOPE_LENGTH, dy - CORRECTION_SLOPE_LENGTH, 1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        // Correction slopes to top-right direction
        if ((colID & 8192 /* CollisionBit.CorrectionSlopeBottomRight */) != 0) {
            o.slopeCollision(dx + TILE_WIDTH, dy, dx + TILE_WIDTH + CORRECTION_SLOPE_LENGTH, dy + CORRECTION_SLOPE_LENGTH, 1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        if ((colID & 32768 /* CollisionBit.CorrectionSlopeTopLeft */) != 0) {
            o.slopeCollision(dx + TILE_WIDTH - CORRECTION_SLOPE_LENGTH, dy - CORRECTION_SLOPE_LENGTH, dx + TILE_WIDTH, dy, 1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        // Rooftop
        if ((colID & 1048576 /* CollisionBit.RoofTop */) != 0) {
            o.slopeCollision(dx, dy + TILE_HEIGHT, dx + TILE_WIDTH / 2, dy + TILE_HEIGHT / 2, 1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
            o.slopeCollision(dx + TILE_WIDTH / 2, dy + TILE_HEIGHT / 2, dx + TILE_WIDTH, dy + TILE_HEIGHT, 1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        // Short slopes
        if ((colID & 2097152 /* CollisionBit.SlopeShortLeft */) != 0) {
            o.slopeCollision(dx + TILE_WIDTH / 2, dy + TILE_HEIGHT / 2, dx + TILE_WIDTH, dy, 1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        if ((colID & 4194304 /* CollisionBit.SlopeShortRight */) != 0) {
            o.slopeCollision(dx, dy, dx + TILE_WIDTH / 2, dy + TILE_HEIGHT / 2, 1, event, 0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
    }
    objectCollision(o, event, ignoreBottomLayer = false) {
        const MARGIN = 2;
        if (!o.isActive() || !o.doesTakeCollisions()) {
            return;
        }
        const p = o.getPosition();
        const startx = Math.floor(p.x / TILE_WIDTH) - MARGIN;
        const starty = Math.floor(p.y / TILE_HEIGHT) - MARGIN;
        const endx = startx + MARGIN * 2;
        const endy = starty + MARGIN * 2;
        for (let x = startx; x <= endx; ++x) {
            for (let y = starty; y <= endy; ++y) {
                /*
                if (x < 0 || y < 0 || x >= this.width || y >= this.height) {

                    continue;
                }
                */
                const dx = clamp(x, 0, this.width);
                const dy = clamp(y, 0, this.height);
                const colID = this.collisions[dy * this.width + dx] ?? 0;
                if (colID == 0 || (ignoreBottomLayer && (colID & 134217728 /* CollisionBit.ContainsBottomLayer */) != 0)) {
                    continue;
                }
                this.tileCollision(o, x, y, colID, event);
            }
        }
    }
    recomputeCollisionTiles(tilesToUpdate) {
        for (const k of tilesToUpdate.keys()) {
            const tileID = tilesToUpdate.get(k);
            this.collisions[k] = 0;
            for (let i = 0; i < 4; ++i) {
                const colTileID = this.collisionMap.getIndexedTile(String(i + 1), tileID - 1) - START_INDEX;
                if (colTileID < 0)
                    continue;
                this.collisions[k] |= (1 << colTileID);
            }
        }
    }
}
