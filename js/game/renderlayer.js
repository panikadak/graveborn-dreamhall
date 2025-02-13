import { clamp } from "../math/utility.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
const COLOR_BLOCKS = [
    [241, 244],
    [242, 245],
    [243, 246]
];
export class RenderLayer {
    constructor(baseMap) {
        const LAYER_NAMES = ["bottom", "middle", "top"];
        this.width = baseMap.width;
        this.height = baseMap.height;
        this.layers = new Array(3);
        for (let i = 0; i < LAYER_NAMES.length; ++i) {
            this.layers[i] = baseMap.cloneLayer(LAYER_NAMES[i]) ?? [];
        }
    }
    /*
        private getTile(layer : number, x : number, y : number, def : number = 0) : number {
    
            if (layer < 0 || layer >= this.layers.length ||
                x < 0 || y < 0 || x >= this.width || y >= this.height) {
    
                return def;
            }
            return this.layers[layer][y*this.width + x];
        }
    */
    drawLayer(canvas, bmp, layer, startx, starty, endx, endy) {
        canvas.beginSpriteBatching(bmp);
        for (let y = starty; y <= endy; ++y) {
            for (let x = startx; x <= endx; ++x) {
                const tx = clamp(x, 0, this.width - 1);
                const ty = clamp(y, 0, this.height - 1);
                const tileID = this.layers[layer][ty * this.width + tx]; // this.getTile(layer, x, y);
                if (tileID == 0) {
                    continue;
                }
                const sx = (tileID - 1) % 16;
                const sy = ((tileID - 1) / 16) | 0;
                canvas.drawBitmap(bmp, 0 /* Flip.None */, x * TILE_WIDTH, y * TILE_HEIGHT, sx * TILE_WIDTH, sy * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
            }
        }
        canvas.endSpriteBatching();
        canvas.drawSpriteBatch();
    }
    draw(canvas, tileset, camera, topLayerOpacity = 1.0, firstLayer = 0, lastLayer = this.layers.length) {
        const MIN_OPACITY = 0.001;
        const CAMERA_MARGIN = 1;
        const cameraPos = camera.getCorner();
        const startx = ((cameraPos.x / TILE_WIDTH) | 0) - CAMERA_MARGIN;
        const starty = ((cameraPos.y / TILE_HEIGHT) | 0) - CAMERA_MARGIN;
        const endx = startx + ((camera.width / TILE_WIDTH) | 0) + CAMERA_MARGIN * 2;
        const endy = starty + ((camera.height / TILE_HEIGHT) | 0) + CAMERA_MARGIN * 2;
        for (let i = firstLayer; i < lastLayer; ++i) {
            if (i == 2) {
                if (topLayerOpacity <= MIN_OPACITY) {
                    continue;
                }
                else if (topLayerOpacity < 1.0) {
                    canvas.setAlpha(topLayerOpacity);
                }
            }
            this.drawLayer(canvas, tileset, i, startx, starty, endx, endy);
            if (topLayerOpacity < 1.0) {
                canvas.setAlpha();
            }
        }
    }
    toggleColorBlocks(index) {
        if (index < 0 || index >= 3) {
            return undefined;
        }
        const output = new Map();
        for (const l of this.layers) {
            for (const k in l) {
                const tile = l[k];
                if (tile == COLOR_BLOCKS[index][0]) {
                    l[k] = COLOR_BLOCKS[index][1];
                    output.set(k, l[k]);
                }
                else if (tile == COLOR_BLOCKS[index][1]) {
                    l[k] = COLOR_BLOCKS[index][0];
                    output.set(k, l[k]);
                }
            }
        }
        return output;
    }
}
