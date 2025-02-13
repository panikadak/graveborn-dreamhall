import { CollisionMap } from "./collisionmap.js";
import { RenderLayer } from "./renderlayer.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Sprite } from "../gfx/sprite.js";
import { Background } from "./background.js";
import { negMod } from "../math/utility.js";
const mapEffectFromString = (str) => {
    switch (str) {
        case "frozen":
            return 1 /* MapEffect.Frozen */;
        case "frozenbw":
            return 2 /* MapEffect.FrozenBlackAndWhite */;
        case "orangish":
            return 3 /* MapEffect.Orangish */;
        default:
            break;
    }
    return 0 /* MapEffect.None */;
};
const PARTICLE_XOFF = [0, 2, -1, 1];
const PARTICLE_YOFF = [0, 3, -2, 2];
const PARTICLE_FRAME_SHIFT = [0, 2, 1, 3];
const FINAL_BOSS_ARENA_FADE_TIME = 60;
export class Stage {
    constructor(backgroundType, baseMap, collisionMap) {
        // TODO: adding a class "WaterRenderer" (etc) would probably
        // simplify things.
        this.hasLava = false;
        this.lavaBrightness = 0.0;
        this.lavaParticleTimer = 0.0;
        this.surfaceLevel = 0;
        this.initialSurfaceLevel = 0;
        this.surfaceLevelRange = undefined;
        this.surfaceLevelWave = 0.0;
        this.backgroundWater = false;
        this.leftExit = undefined;
        this.rightExit = undefined;
        this.finalBossArenaEnabled = false;
        this.topLayerDisabled = false;
        this.layerFadeTimer = 0;
        this.initialLayerFadeTime = 0;
        this.darknessRadius = -1;
        this.darknessRadiusModifier = 0;
        this.getSwitchState = (index) => this.switches[index] ?? false;
        this.collisions = new CollisionMap(baseMap, collisionMap);
        this.renderlayer = new RenderLayer(baseMap);
        this.width = baseMap.width;
        this.height = baseMap.height;
        this.bottomRow = (new Array(this.width)).fill(false);
        this.computeBottomRow(baseMap);
        this.objectLayer = baseMap.cloneLayer("objects");
        this.hasLava = baseMap.getBooleanProperty("has_lava") ?? false;
        this.initialSurfaceLevel = baseMap.getNumericProperty("water_level") ?? 0;
        this.surfaceLevel = this.initialSurfaceLevel;
        this.backgroundWater = baseMap.getBooleanProperty("background_water") ?? false;
        this.waterSprite = new Sprite(32, 16);
        this.background = new Background(this.height * TILE_HEIGHT, backgroundType);
        this.leftExit = baseMap.getProperty("leftexit");
        this.rightExit = baseMap.getProperty("rightexit");
        this.baseMap = baseMap;
        this.switches = (new Array(3)).fill(false);
        this.effect = mapEffectFromString(this.baseMap.getProperty("effect") ?? "none");
        //if (this.effect == MapEffect.Darkness) {
        this.darknessRadius = this.baseMap.getNumericProperty("darkness_radius");
        //}
        this.surfaceLevelRange = this.baseMap.getNumericProperty("water_move_range");
    }
    computeBottomRow(baseMap) {
        const LAYER_NAMES = ["bottom", "middle", "top"];
        for (let x = 0; x < this.width; ++x) {
            for (const layer of LAYER_NAMES) {
                if (baseMap.getTile(layer, x, this.height - 1) != 0) {
                    this.bottomRow[x] = true;
                    break;
                }
            }
        }
    }
    drawLavaParticles(canvas, bmp, camPos, surface, repeat = 1) {
        const XOFF = 16;
        const INITIAL_XOFF = 8;
        const INITIAL_YOFF = 11;
        const baseFrame = Math.floor(this.lavaParticleTimer * 4.0);
        const startx = Math.floor(camPos.x / XOFF) - 1;
        const endx = startx + Math.ceil(canvas.width / XOFF) + 2;
        for (let y = 0; y < repeat; ++y) {
            const shiftx = (y % 2) * 16;
            for (let x = startx; x < endx; ++x) {
                const i = negMod(x, 4);
                const dx = INITIAL_XOFF + x * XOFF + PARTICLE_XOFF[i];
                const dy = INITIAL_YOFF + surface + PARTICLE_YOFF[i];
                const frame = (baseFrame + PARTICLE_FRAME_SHIFT[i]) % 4;
                canvas.drawBitmap(bmp, 0 /* Flip.None */, dx + shiftx, dy + y * 16, frame * 8, 48, 8, 8);
            }
        }
    }
    drawWater(canvas, assets, camera, opacity, surfaceOpacity = 0.0) {
        const WATER_WIDTH = 32;
        const BRIGTHNESS_RANGE = 0.20;
        if (this.surfaceLevel <= 0) {
            return;
        }
        const bmpWater = assets.getBitmap("water");
        if (bmpWater === undefined) {
            return;
        }
        const camPos = camera.getCorner();
        const dy = (this.height - this.surfaceLevel) * TILE_HEIGHT - TILE_HEIGHT / 2;
        if (dy > camPos.y + camera.height) {
            return;
        }
        const startx = Math.floor(camPos.x / WATER_WIDTH) - 1;
        const endx = startx + Math.ceil(camera.width / WATER_WIDTH) + 2;
        const baseShift = this.hasLava ? 2 : 0;
        let brightness = 1.0;
        if (this.hasLava) {
            brightness = 1.0 + Math.sin(this.lavaBrightness) * BRIGTHNESS_RANGE;
        }
        if (this.hasLava) {
            canvas.setColor(255 * brightness, 255 * brightness, 255 * brightness);
        }
        // Base water (or lava)
        for (let i = 0; i < 2; ++i) {
            if (!this.hasLava) {
                canvas.setAlpha(i == 0 ? opacity : surfaceOpacity);
            }
            for (let x = startx; x < endx; ++x) {
                this.waterSprite.drawWithShiftedRow(canvas, bmpWater, x * WATER_WIDTH, dy, 0 /* Flip.None */, baseShift + i);
            }
            if (!this.hasLava) {
                canvas.setAlpha();
            }
            if (this.hasLava || opacity >= 1.0 || surfaceOpacity <= 0.0) {
                break;
            }
        }
        // Bottom 
        const bottomHeight = this.height * TILE_HEIGHT - (dy + 16);
        if (bottomHeight > 0) {
            if (this.hasLava) {
                canvas.setColor(219 * brightness, 73 * brightness, 0 * brightness);
            }
            else {
                canvas.setColor(30, 109, 219, opacity);
            }
            // Note: draw some extra since I have some bugs with camera after
            // transitions...
            // Another note: not sure if already fixed or not
            canvas.fillRect(camPos.x, dy + 16, canvas.width, bottomHeight + 16);
            canvas.setColor();
        }
        if (this.hasLava) {
            const repeat = Math.ceil(bottomHeight / 16) + 1;
            canvas.setColor(255 * brightness, 255 * brightness, 255 * brightness);
            this.drawLavaParticles(canvas, bmpWater, camPos, dy, repeat);
            canvas.setColor();
        }
    }
    drawDarkness(canvas, playerPosition) {
        const MODIFIER_AMPLITUDE = 4;
        const radius = this.darknessRadius +
            Math.sin(this.darknessRadiusModifier) * MODIFIER_AMPLITUDE;
        canvas.setColor(0, 0, 0);
        canvas.fillCircleOutside(playerPosition.x, playerPosition.y, radius);
        canvas.setColor();
    }
    applyMapEffect(canvas) {
        switch (this.effect) {
            // Unused
            case 1 /* MapEffect.Frozen */:
                canvas.applyEffect(3 /* Effect.SwapRedAndBlue */);
                break;
            case 2 /* MapEffect.FrozenBlackAndWhite */:
                canvas.applyEffect(4 /* Effect.BlackAndWhite */);
                canvas.setColor(255 * 0.90, 255 * 1.1, 255 * 1.25);
                break;
            case 3 /* MapEffect.Orangish */:
                canvas.applyEffect(4 /* Effect.BlackAndWhite */);
                canvas.setColor(255 * 1.25, 182 * 1.25, 146 * 1.25);
                break;
            default:
                break;
        }
    }
    update(camera, event) {
        const WATER_ANIMATION_SPEED = 8;
        const DARKNESS_RADIUS_MODIFIER_SPEED = Math.PI * 2 / 180;
        const LAVA_BRIGHTNESS_SPEED = Math.PI * 2 / 120.0;
        const LAVA_PARTICLE_SPEED = 1.0 / 45.0;
        const SURFACE_LEVEL_SPEED = 360;
        this.waterSprite.animate(0, 0, 3, WATER_ANIMATION_SPEED, event.tick);
        this.background.update(camera, event);
        if (this.layerFadeTimer > 0) {
            this.layerFadeTimer -= event.tick;
        }
        if (this.darknessRadius > 0) {
            this.darknessRadiusModifier =
                (this.darknessRadiusModifier +
                    DARKNESS_RADIUS_MODIFIER_SPEED * event.tick) % (Math.PI * 2);
        }
        if (this.hasLava) {
            this.lavaBrightness = (this.lavaBrightness + LAVA_BRIGHTNESS_SPEED * event.tick) % (Math.PI * 2);
            this.lavaParticleTimer = (this.lavaParticleTimer + LAVA_PARTICLE_SPEED * event.tick) % 1.0;
        }
        if (this.surfaceLevelRange !== undefined) {
            const surfaceSpeed = Math.PI * 2 / SURFACE_LEVEL_SPEED;
            this.surfaceLevelWave = (this.surfaceLevelWave + surfaceSpeed * event.tick) % (Math.PI * 2);
            this.surfaceLevel = this.initialSurfaceLevel - Math.sin(this.surfaceLevelWave) * this.surfaceLevelRange;
        }
    }
    drawBackground(canvas, assets, camera) {
        if (this.effect != 3 /* MapEffect.Orangish */) {
            this.applyMapEffect(canvas);
        }
        this.background.draw(canvas, assets, camera);
        if (this.effect != 0 /* MapEffect.None */ &&
            this.effect != 3 /* MapEffect.Orangish */) {
            canvas.applyEffect(0 /* Effect.None */);
            canvas.setColor();
        }
    }
    draw(canvas, assets, tilesetIndex, camera) {
        const BACKGROUND_WATER_OPACITY = 0.33;
        const BACKGROUND_WATER_SURFACE_OPACITY = 0.50;
        const tileset = assets.getBitmap(`tileset_${tilesetIndex}`);
        if (this.backgroundWater && this.surfaceLevel > 0) {
            this.drawWater(canvas, assets, camera, BACKGROUND_WATER_OPACITY, BACKGROUND_WATER_SURFACE_OPACITY);
        }
        let topLayerOpacity = this.topLayerDisabled ? 0.0 : 1.0;
        if (this.layerFadeTimer > 0) {
            let t = 0.0;
            if (this.initialLayerFadeTime > 0) {
                t = this.layerFadeTimer / this.initialLayerFadeTime;
            }
            topLayerOpacity = this.topLayerDisabled ? t : 1.0 - t;
        }
        this.applyMapEffect(canvas);
        // A stupid workaround, the first two layers were never
        // supposed to fade...
        if (this.finalBossArenaEnabled && this.layerFadeTimer > 0) {
            const alpha = this.layerFadeTimer / FINAL_BOSS_ARENA_FADE_TIME;
            canvas.setAlpha(alpha);
            this.renderlayer.draw(canvas, tileset, camera, 1.0, 0, 1);
            canvas.setAlpha();
        }
        this.renderlayer.draw(canvas, tileset, camera, topLayerOpacity, this.finalBossArenaEnabled ? 2 : 0);
        if (this.effect != 0 /* MapEffect.None */) {
            canvas.applyEffect(0 /* Effect.None */);
            canvas.setColor();
        }
    }
    drawForeground(canvas, assets, camera, playerPosition) {
        const FOREGROUND_WATER_OPACITY = 0.75;
        if (!this.backgroundWater && this.surfaceLevel > 0) {
            this.drawWater(canvas, assets, camera, FOREGROUND_WATER_OPACITY);
        }
        this.background.postDraw(canvas, assets);
        if (this.darknessRadius > 0) {
            this.drawDarkness(canvas, playerPosition);
        }
    }
    objectCollision(o, event) {
        const WATER_OFFSET_Y = 0;
        const EDGE_OFFSET_Y = -256;
        const SURFACE_HEIGHT = 8;
        if (!o.isActive() || !o.doesTakeCollisions()) {
            return;
        }
        this.collisions.objectCollision(o, event, this.finalBossArenaEnabled);
        const totalWidth = this.width * TILE_WIDTH;
        const totalHeight = this.height * TILE_HEIGHT;
        const waterSurface = Math.min(totalHeight, (this.height - this.surfaceLevel) * TILE_HEIGHT + WATER_OFFSET_Y);
        const opos = o.getPosition();
        const hbox = o.getCollisionBox();
        if (this.surfaceLevel > 0) {
            if (this.hasLava) {
                o.lavaCollision?.(waterSurface, event);
                o.slopeCollision(0, waterSurface + 2, this.width * TILE_WIDTH, waterSurface + 2, 1, event);
            }
            else {
                o.waterCollision?.(opos.x - 16, waterSurface, 32, SURFACE_HEIGHT, event, true);
                o.waterCollision?.(opos.x - 16, waterSurface + SURFACE_HEIGHT, 32, this.height * TILE_HEIGHT - waterSurface - SURFACE_HEIGHT, event, false);
            }
        }
        if (o.doesTakeCollisions()) {
            o.wallCollision(0, EDGE_OFFSET_Y, totalHeight - EDGE_OFFSET_Y, -1, event);
            o.wallCollision(totalWidth, EDGE_OFFSET_Y, totalHeight - EDGE_OFFSET_Y, 1, event);
        }
        if (o.getPosition().y + hbox.y - hbox.h / 2 > this.height * TILE_HEIGHT) {
            o.instantKill(event);
        }
        if (!this.finalBossArenaEnabled) {
            if (this.rightExit !== undefined) {
                o.screenTransitionEvent?.(this.width * TILE_WIDTH, 1, this.rightExit, event);
            }
            if (this.leftExit !== undefined) {
                o.screenTransitionEvent?.(0, -1, this.leftExit, event);
            }
        }
    }
    iterateObjectLayer(func) {
        const START_INDEX = 256;
        if (this.objectLayer === undefined) {
            return;
        }
        for (let y = 0; y < this.height; ++y) {
            for (let x = 0; x < this.width; ++x) {
                const upperID = y > 0 ? this.objectLayer[(y - 1) * this.width + x] - START_INDEX : 0;
                func(x, y, this.objectLayer[y * this.width + x] - START_INDEX, upperID);
            }
        }
    }
    initializeBackground(camera) {
        this.background.initialize(camera);
    }
    toggleSwitch(index) {
        if (index < 0 || index >= 3) {
            return;
        }
        this.switches[index] = !this.switches[index];
        this.collisions.recomputeCollisionTiles(this.renderlayer.toggleColorBlocks(index));
    }
    toggleTopLayerRendering(state, fadeTime = 60) {
        this.topLayerDisabled = !state;
        this.layerFadeTimer = fadeTime;
        this.initialLayerFadeTime = fadeTime;
    }
    enableFinalBossArena() {
        this.finalBossArenaEnabled = true;
        // this.layerFadeTimer = fadeTime;
        // this.initialLayerFadeTime = fadeTime;
        this.layerFadeTimer = FINAL_BOSS_ARENA_FADE_TIME;
    }
    changeBackground(newType) {
        this.background.changeType(newType);
    }
    reset() {
        this.changeBackground();
        this.finalBossArenaEnabled = false;
        this.topLayerDisabled = false;
        this.layerFadeTimer = 0;
        this.initialLayerFadeTime = 0;
    }
}
