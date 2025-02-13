import { RGBA } from "../math/rgba.js";
const DEFAULT_COLORS = [
    new RGBA(255, 255, 255),
    new RGBA(0, 0, 0),
    new RGBA(0, 73, 146)
];
export const drawUIBox = (canvas, x, y, w, h, colors = undefined, drawShadow = true, shadowAlpha = 0.25, shadowOffset = 2) => {
    if (drawShadow) {
        canvas.setColor(0, 0, 0, shadowAlpha);
        canvas.fillRect(x + shadowOffset, y + shadowOffset, w, h);
    }
    colors ?? (colors = DEFAULT_COLORS);
    for (let i = 0; i < colors.length; ++i) {
        canvas.setColor(colors[i].r, colors[i].g, colors[i].b);
        canvas.fillRect(x + i, y + i, w - i * 2, h - i * 2);
    }
    canvas.setColor();
};
