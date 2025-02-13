import { LOCKED_HUGE_DOOR_INDEX } from "./interactables/portal.js";
import { clamp } from "../math/utility.js";
export const GAME_SAVE_ANIMATION_TIME = 120;
export const GAME_SAVE_ICON_APPEAR_TIME = 15;
const HEALTH_BAR_HEIGHT = 10;
const HEALTH_BAR_COLORS = [
    [182, 36, 0],
    [255, 73, 0],
];
const HEALTH_BAR_PORTION_HEIGHTS = [
    HEALTH_BAR_HEIGHT - 4,
    HEALTH_BAR_HEIGHT - 7,
];
const HEALTH_BAR_Y_OFF = [0, 1, 2];
const drawHealthBar = (canvas, dx, dy, width, value) => {
    const foregroundWidth = Math.round(value * (width - 4));
    canvas.setColor(255, 255, 255);
    canvas.fillRect(dx, dy, width, HEALTH_BAR_HEIGHT);
    canvas.setColor(0, 0, 0);
    canvas.fillRect(dx + 1, dy + 1, width - 2, HEALTH_BAR_HEIGHT - 2);
    canvas.setColor(109, 109, 109);
    canvas.fillRect(dx + 2, dy + 2, width - 4, HEALTH_BAR_HEIGHT - 4);
    for (let i = 0; i < HEALTH_BAR_COLORS.length; ++i) {
        const h = HEALTH_BAR_PORTION_HEIGHTS[i];
        canvas.setColor(...HEALTH_BAR_COLORS[i]);
        canvas.fillRect(dx + 2, dy + 2 + HEALTH_BAR_Y_OFF[i], foregroundWidth, h);
    }
    canvas.setColor();
};
export const drawHUD = (canvas, assets, stats) => {
    const HEALTH_BAR_WIDTH = 64;
    canvas.moveTo();
    const bmpHUD = assets.getBitmap("hud");
    const bmpFontOutlines = assets.getBitmap("font_outlines");
    // Health
    let dx = 11;
    const strHealth = String(stats.getHealth()) + "/" + String(stats.getMaxHealth());
    drawHealthBar(canvas, dx, 5, HEALTH_BAR_WIDTH, stats.getHealthBarPos());
    canvas.drawBitmap(bmpHUD, 0 /* Flip.None */, 1, 1, 0, 0, 16, 16);
    canvas.drawText(bmpFontOutlines, strHealth, dx + HEALTH_BAR_WIDTH / 2, 0, -7, 0, 2 /* Align.Center */);
    // Money
    const strMoney = "*" + String(stats.getMoney());
    dx = canvas.width - strMoney.length * 9;
    canvas.drawText(bmpFontOutlines, strMoney, canvas.width, 1, -7, 0, 1 /* Align.Right */);
    canvas.drawBitmap(bmpHUD, 0 /* Flip.None */, dx - 21, 1, 16, 0, 16, 16);
    // Ammo
    if (stats.hasItem(2 /* Item.Gun */)) {
        const strAmmo = String(stats.getBulletCount()) + "/" + String(stats.getMaxBulletCount());
        canvas.drawText(bmpFontOutlines, strAmmo, 13, canvas.height - 16, -7, 0);
        const sx = stats.hasItem(39 /* Item.MagicBullets */) ? 80 : 32;
        canvas.drawBitmap(bmpHUD, 0 /* Flip.None */, 0, canvas.height - 17, sx, 0, 16, 16);
        if (stats.hasItem(39 /* Item.MagicBullets */)) {
            const t = clamp(stats.getBulletRestoreTime(), 0.0, 1.0);
            const sh = Math.floor(t * 12);
            if (sh > 0) {
                canvas.drawBitmap(bmpHUD, 0 /* Flip.None */, 0, canvas.height - 15 + (12 - sh), 32, 2 + (12 - sh), 16, sh);
            }
        }
    }
    // Orbs 
    // Do not draw if the huge door has been opened
    // (i.e the orbs have been "consumed")
    if (stats.isDoorOpen(LOCKED_HUGE_DOOR_INDEX)) {
        return;
    }
    const orbCount = stats.getOrbCount();
    if (orbCount > 0) {
        const strOrbs = `*${orbCount}`;
        const dy = 14;
        dx = canvas.width - strOrbs.length * 9;
        canvas.drawText(bmpFontOutlines, strOrbs, canvas.width, dy, -7, 0, 1 /* Align.Right */);
        canvas.drawBitmap(bmpHUD, 0 /* Flip.None */, dx - 21, dy, 64, 0, 16, 16);
    }
};
export const drawGameSavingIcon = (canvas, assets, timer, success) => {
    const XOFF = 17;
    const YOFF = 17;
    const FRAME_TIME = 6;
    const bmpHUD = assets.getBitmap("hud");
    if (!success) {
        if (Math.floor(timer / 8) % 2 == 0) {
            return;
        }
        canvas.drawBitmap(bmpHUD, 0 /* Flip.None */, canvas.width - XOFF - 12, canvas.height - YOFF, 0, 16, 16, 16);
        canvas.drawBitmap(bmpHUD, 0 /* Flip.None */, canvas.width - XOFF, canvas.height - YOFF, 48, 0, 16, 16);
        return;
    }
    const initialTime = GAME_SAVE_ANIMATION_TIME - GAME_SAVE_ICON_APPEAR_TIME;
    let t = 1.0;
    if (timer >= GAME_SAVE_ANIMATION_TIME - GAME_SAVE_ICON_APPEAR_TIME) {
        t = 1.0 - (timer - initialTime) / GAME_SAVE_ICON_APPEAR_TIME;
    }
    else if (timer <= GAME_SAVE_ICON_APPEAR_TIME) {
        t = timer / GAME_SAVE_ICON_APPEAR_TIME;
    }
    const frame = Math.floor(timer / FRAME_TIME) % 8;
    const dx = canvas.width - XOFF * t;
    const dy = canvas.height - YOFF;
    canvas.drawBitmap(bmpHUD, 0 /* Flip.None */, dx, dy, frame * 16, 16, 16, 16);
};
export const drawBossHealthbar = (canvas, assets, value, name, width = 128) => {
    const BOTTOM_OFFSET = 14;
    const bmpFontOutlines = assets.getBitmap("font_outlines");
    drawHealthBar(canvas, canvas.width / 2 - width / 2, canvas.height - BOTTOM_OFFSET, width, value);
    canvas.drawText(bmpFontOutlines, name, canvas.width / 2, canvas.height - BOTTOM_OFFSET - 6, -8, 0, 2 /* Align.Center */);
};
