import { Snowflake } from "./snowflake.js";
import { RGBA } from "../math/rgba.js";
import { Starfield } from "./starfield.js";
const CLOUD_COLOR_MOD_1 = new RGBA(1.0);
const CLOUD_COLOR_MOD_2 = new RGBA(182 / 255, 219 / 255, 1.0);
const CLOUD_COLOR_MOD_3 = new RGBA(255 / 255, 146 / 255, 109 / 255);
const SPECIAL_SUN_COLORS_1 = [
    new RGBA(255, 219, 109),
    new RGBA(255, 182, 0)
];
const SPECIAL_SUN_COLORS_2 = [
    new RGBA(219, 109, 73),
    new RGBA(255, 146, 109)
];
const SNOWFLAKE_TABLE = [true, false, false, false, false, false, true, false, true, true, false, true, false, true, true];
;
export class Background {
    ;
    constructor(height, type) {
        this.oldType = -1 /* BackgroundType.Unspecified */;
        this.cloudPos = 0;
        this.lightMagnitude = 0;
        this.sunAngle = 0;
        this.starfield = undefined;
        this.snowflakeColor = undefined;
        this.hasSnowflakes = () => SNOWFLAKE_TABLE[this.type] ?? false;
        this.getCloudPosition = () => this.cloudPos;
        this.cloudPos = Math.random();
        this.height = height;
        this.type = type ?? -1 /* BackgroundType.Unspecified */;
        this.oldType = this.type;
        this.snowflakes = new Array();
        this.snowflakeColor = new RGBA(255, 255, 255, 0.5);
        switch (this.type) {
            case 5 /* BackgroundType.StarField */:
                this.starfield = new Starfield();
                break;
            case 13 /* BackgroundType.FinalGraveyard */:
            case 0 /* BackgroundType.Graveyard */:
                this.snowflakeColor = new RGBA(0, 0, 0, 0.5);
                break;
            // case BackgroundType.CastleWall:
            case 11 /* BackgroundType.NightSkyWithSnowSpecialShift */:
            case 9 /* BackgroundType.NightSkyWithSnow */:
            case 6 /* BackgroundType.NightSkyWithForest */:
            case 14 /* BackgroundType.AltNightSkyWithForest */:
                this.snowflakeColor = new RGBA(255, 255, 255, 0.5);
                break;
            case 8 /* BackgroundType.BurningSun */:
                this.snowflakeColor = new RGBA(182, 36, 0, 0.5);
                break;
            case 12 /* BackgroundType.AltStarField */:
                this.starfield = new Starfield(36, 109, 219);
                break;
            default:
                break;
        }
    }
    initializeSnowflakes(camera) {
        const area = camera.width * camera.height;
        const count = area / (32 * 32);
        for (let i = 0; i < count; ++i) {
            const x = Math.random() * camera.width;
            const y = Math.random() * camera.height;
            this.snowflakes.push(new Snowflake(x, y, 1.0));
        }
    }
    updateCoast(event) {
        const CLOUD_SPEED = 1.0 / 1024.0;
        this.cloudPos = (this.cloudPos + CLOUD_SPEED * event.tick) % 1.0;
    }
    updateClouds(speedMod, event) {
        const CLOUD_SPEED = 1.0 / 2048.0;
        this.cloudPos = (this.cloudPos + speedMod * CLOUD_SPEED * event.tick) % 1.0;
    }
    updateCave(event) {
        const LIGHT_SPEED = Math.PI * 2 / 120; // Might want to rename this...
        this.lightMagnitude = (this.lightMagnitude + LIGHT_SPEED * event.tick) % (Math.PI * 2);
    }
    updateSpecialSun(event) {
        const ROTATION_SPEED = Math.PI * 2 / 600.0;
        this.sunAngle = (this.sunAngle + ROTATION_SPEED * event.tick) % (Math.PI * 2);
    }
    drawDefaultSky(canvas, assets) {
        const bmpStars = assets.getBitmap("stars");
        canvas.drawBitmap(bmpStars, 0 /* Flip.None */, 0, 0, 0, 0, canvas.width, canvas.height, canvas.width, canvas.height);
        const bmpSun = assets.getBitmap("sun");
        if (bmpSun !== undefined) {
            canvas.drawBitmap(bmpSun, 0 /* Flip.None */, canvas.width - 80, 16, 0, 0, 64, 64);
        }
    }
    drawMoon(canvas, assets, id = 0) {
        const bmpMoon = assets.getBitmap("moon");
        if (bmpMoon !== undefined) {
            canvas.drawBitmap(bmpMoon, 0 /* Flip.None */, canvas.width - 96, 16, id * 64, 0, 64, 64);
        }
    }
    drawClouds(canvas, assets, camera, colorMod, shifty = 0.0) {
        const bmpClouds = assets.getBitmap("clouds_0");
        if (bmpClouds === undefined) {
            return;
        }
        const camPos = camera.getCorner();
        const count = Math.floor(canvas.width / bmpClouds.width) + 2;
        for (let y = 2; y >= 0; --y) {
            const color = 255 - y * 73;
            canvas.setColor(colorMod.r * color, colorMod.g * color, colorMod.b * color);
            const shiftx = -((camPos.x / (8 + y * 8) + this.cloudPos * bmpClouds.width * (3 - y)) % bmpClouds.width);
            const dy = 96 - (camPos.y + shifty) / 8 - y * 24;
            for (let x = -1; x < count; ++x) {
                canvas.drawBitmap(bmpClouds, 0 /* Flip.None */, x * bmpClouds.width + shiftx, dy);
            }
            const bottom = canvas.height - dy;
            if (y == 0 && bottom > 0) {
                // I made this funny observation that right, I never made fillRect
                // work with special effects. This is a workaround as I cannot
                // fillRect the bottom part...
                canvas.drawBitmap(bmpClouds, 0 /* Flip.None */, 0, dy + bmpClouds.height, 0, 80, bmpClouds.width, 16, canvas.width, bottom);
            }
        }
        canvas.setColor();
    }
    drawGraveyard(canvas, assets, camera) {
        canvas.clear(255, 255, 255);
        this.drawMoon(canvas, assets, 0);
        this.drawClouds(canvas, assets, camera, CLOUD_COLOR_MOD_1);
    }
    drawCoast(canvas, assets, camera) {
        this.drawDefaultSky(canvas, assets);
        const bmpClouds = assets.getBitmap("clouds_1");
        if (bmpClouds === undefined) {
            return;
        }
        const camPos = camera.getCorner();
        const count = Math.floor(canvas.width / bmpClouds.width) + 2;
        const shiftx = -((camPos.x / 8 + this.cloudPos * bmpClouds.width) % bmpClouds.width);
        const dy = 80 - camPos.y / 8;
        for (let x = -1; x < count; ++x) {
            canvas.drawBitmap(bmpClouds, 0 /* Flip.None */, x * bmpClouds.width + shiftx, dy);
        }
        const bottomHeight = this.height - (dy + bmpClouds.height);
        if (bottomHeight > 0) {
            // canvas.setColor(36, 146, 255);
            // canvas.fillRect(0, dy + bmpClouds.height, canvas.width, bottomHeight);
            canvas.drawBitmap(bmpClouds, 0 /* Flip.None */, 0, dy + bmpClouds.height, 0, bmpClouds.height - 2, bmpClouds.width, 2, canvas.width, bottomHeight);
            // canvas.setColor();
        }
    }
    drawTrees(canvas, assets, camera, darken = 0.0, offset = 0) {
        const bmpForest = assets.getBitmap("forest");
        if (bmpForest === undefined) {
            return;
        }
        const colorMod = 1.0 - darken;
        const camPos = camera.getCorner();
        const count = Math.floor(canvas.width / bmpForest.width) + 2;
        if (colorMod > 0) {
            canvas.setColor(255 * colorMod, 255 * colorMod, 255 * colorMod);
        }
        const shiftx = -((camPos.x / 8) % bmpForest.width);
        const dy = 80 - (camPos.y + offset) / 8;
        for (let x = -1; x < count; ++x) {
            canvas.drawBitmap(bmpForest, 0 /* Flip.None */, x * bmpForest.width + shiftx, dy);
        }
        const bottomHeight = this.height - (dy + bmpForest.height);
        if (bottomHeight > 0) {
            canvas.setColor(0 * colorMod, 146 * colorMod, 219 * colorMod);
            canvas.fillRect(0, dy + bmpForest.height, canvas.width, bottomHeight);
            canvas.setColor();
        }
    }
    drawForestBackground(canvas, assets, camera) {
        this.drawDefaultSky(canvas, assets);
        this.drawTrees(canvas, assets, camera);
    }
    drawCaveBackground(canvas, assets, camera, backgroundName = "cave_wall") {
        const bmpWall = assets.getBitmap(backgroundName);
        if (bmpWall === undefined) {
            return;
        }
        const camPos = camera.getCorner();
        const shiftx = (camPos.x / 4) % bmpWall.width;
        const shifty = (camPos.y / 4) % bmpWall.height;
        const light = 255 * (0.50 + 0.15 * Math.sin(this.lightMagnitude));
        canvas.setColor(light, light, light);
        canvas.drawBitmap(bmpWall, 0 /* Flip.None */, 0, 0, shiftx, shifty, canvas.width, canvas.height, canvas.width, canvas.height);
        canvas.setColor();
    }
    drawFrozenCaveBackground(canvas, assets, camera) {
        this.drawCaveBackground(canvas, assets, camera, "frozen_cave_wall");
    }
    drawCastleBackground(canvas, assets, camera) {
        this.drawCaveBackground(canvas, assets, camera, "castle_wall");
    }
    drawNightSky(canvas, assets, camera) {
        canvas.clear(0, 0, 0);
        this.drawMoon(canvas, assets, 1);
        const shift = this.type == 11 /* BackgroundType.NightSkyWithSnowSpecialShift */ ? -720 : -240;
        this.drawClouds(canvas, assets, camera, CLOUD_COLOR_MOD_2, shift);
    }
    drawNightSkyForest(canvas, assets, camera, offset = 0.0) {
        canvas.clear(0, 36, 73);
        this.drawMoon(canvas, assets, 1);
        this.drawTrees(canvas, assets, camera, 0.40, offset);
    }
    drawSpecialSun(canvas, assets, colors, sunIndex = 1, shifty = 0) {
        const RAY_COUNT = 12;
        const RAY_LENGTH = 576;
        canvas.clear(colors[0].r, colors[0].g, colors[0].b);
        const angleStep = Math.PI * 2 / RAY_COUNT;
        canvas.setColor(colors[1].r, colors[1].g, colors[1].b);
        for (let i = 0; i < RAY_COUNT; ++i) {
            if (i % 2 == 0) {
                continue;
            }
            const angle = this.sunAngle + i * angleStep;
            canvas.transform.push();
            canvas.transform.translate(canvas.width / 2, canvas.height / 2 + shifty);
            canvas.transform.rotate(angle);
            canvas.transform.apply();
            // Note: to make the rays equal in size the width of a ray (which is
            // RAY_LENGTH/2 here) should be computed differently, but I'm just being
            // lazy here.
            canvas.fillEquiangularTriangle(0, -RAY_LENGTH / 2, RAY_LENGTH / 2, RAY_LENGTH);
            canvas.transform.pop();
        }
        canvas.transform.apply();
        canvas.setColor();
        const bmpSun = assets.getBitmap("sun");
        if (bmpSun !== undefined) {
            canvas.drawBitmap(bmpSun, 0 /* Flip.None */, canvas.width / 2 - 32, canvas.height / 2 - 32 + shifty, sunIndex * 64, 0, 64, 64);
        }
    }
    drawSnowflakes(canvas) {
        canvas.setColor(this.snowflakeColor.r, this.snowflakeColor.g, this.snowflakeColor.b, this.snowflakeColor.a);
        for (const o of this.snowflakes) {
            o.draw(canvas);
        }
        canvas.setColor();
    }
    initialize(camera) {
        this.snowflakes.length = 0;
        if (this.hasSnowflakes()) {
            this.initializeSnowflakes(camera);
        }
    }
    update(camera, event) {
        switch (this.type) {
            case 0 /* BackgroundType.Graveyard */:
                this.updateClouds(1.0, event);
                break;
            case 1 /* BackgroundType.Coast */:
                this.updateCoast(event);
                break;
            case 10 /* BackgroundType.CastleWall */:
            case 7 /* BackgroundType.FrozenCave */:
            case 3 /* BackgroundType.Cave */:
                this.updateCave(event);
                break;
            case 11 /* BackgroundType.NightSkyWithSnowSpecialShift */:
                this.updateClouds(4.0, event);
                break;
            case 9 /* BackgroundType.NightSkyWithSnow */:
            case 4 /* BackgroundType.NightSky */:
                this.updateClouds(2.0, event);
                break;
            case 12 /* BackgroundType.AltStarField */:
            case 5 /* BackgroundType.StarField */:
                this.starfield?.update(event);
                break;
            case 13 /* BackgroundType.FinalGraveyard */:
            case 8 /* BackgroundType.BurningSun */:
                this.updateSpecialSun(event);
                this.updateClouds(4.0, event);
                break;
            default:
                break;
        }
        if (this.hasSnowflakes()) {
            for (const o of this.snowflakes) {
                o.cameraCheck(camera, event);
                o.update(event);
            }
        }
    }
    draw(canvas, assets, camera) {
        switch (this.type) {
            case 0 /* BackgroundType.Graveyard */:
                this.drawGraveyard(canvas, assets, camera);
                break;
            case 1 /* BackgroundType.Coast */:
                this.drawCoast(canvas, assets, camera);
                break;
            case 2 /* BackgroundType.Forest */:
                this.drawForestBackground(canvas, assets, camera);
                break;
            case 3 /* BackgroundType.Cave */:
                this.drawCaveBackground(canvas, assets, camera);
                break;
            case 11 /* BackgroundType.NightSkyWithSnowSpecialShift */:
            case 9 /* BackgroundType.NightSkyWithSnow */:
            case 4 /* BackgroundType.NightSky */:
                this.drawNightSky(canvas, assets, camera);
                break;
            case 5 /* BackgroundType.StarField */:
            case 12 /* BackgroundType.AltStarField */:
                canvas.clear(0, 0, 0);
                this.starfield?.draw(canvas);
                break;
            case 14 /* BackgroundType.AltNightSkyWithForest */:
            case 6 /* BackgroundType.NightSkyWithForest */:
                this.drawNightSkyForest(canvas, assets, camera, this.type == 14 /* BackgroundType.AltNightSkyWithForest */ ? -384 : 0);
                break;
            case 7 /* BackgroundType.FrozenCave */:
                this.drawFrozenCaveBackground(canvas, assets, camera);
                break;
            case 8 /* BackgroundType.BurningSun */:
                this.drawSpecialSun(canvas, assets, SPECIAL_SUN_COLORS_1, 1);
                break;
            case 10 /* BackgroundType.CastleWall */:
                this.drawCastleBackground(canvas, assets, camera);
                break;
            case 13 /* BackgroundType.FinalGraveyard */:
                this.drawSpecialSun(canvas, assets, SPECIAL_SUN_COLORS_2, 2, -32);
                this.drawClouds(canvas, assets, camera, CLOUD_COLOR_MOD_3, -192);
                break;
            default:
                canvas.clear(0, 0, 0);
                break;
        }
    }
    postDraw(canvas, assets) {
        if (this.snowflakeColor !== undefined) {
            this.drawSnowflakes(canvas);
        }
    }
    changeType(newType) {
        if (newType === undefined) {
            newType = this.oldType;
        }
        else {
            this.oldType = this.type;
        }
        this.type = newType;
        if (newType === 5 /* BackgroundType.StarField */) {
            this.starfield = new Starfield();
        }
        // Don't ask why is this needed here 'cause I have no idea
        else if (newType === 12 /* BackgroundType.AltStarField */) {
            this.starfield = new Starfield(36, 109, 219);
        }
        else {
            // Let the garbage collector get rid of the 
            // starfield
            this.starfield = undefined;
        }
    }
    setCloudPosition(value) {
        this.cloudPos = Math.abs(value) % 1.0;
    }
}
