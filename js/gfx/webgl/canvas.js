import { Vector } from "../../math/vector.js";
import { WebGLBitmap } from "./bitmap.js";
import { Mesh } from "./mesh.js";
import { SpriteBatch } from "./spritebatch.js";
const createCircleOutMesh = (gl, quality) => {
    const step = Math.PI * 2 / quality;
    const vertices = new Array();
    const indices = new Array();
    let index = 0;
    for (let i = 0; i < quality; ++i) {
        const angle1 = step * i;
        const angle2 = step * (i + 1);
        const c1 = Math.cos(angle1);
        const c2 = Math.cos(angle2);
        const s1 = Math.sin(angle1);
        const s2 = Math.sin(angle2);
        vertices.push(c1, s1, c2, s2, c2 * 2, s2 * 2, c2 * 2, s2 * 2, c1 * 2, s1 * 2, c1, s1);
        for (let j = 0; j < 6; ++j) {
            indices.push(index++);
        }
    }
    return new Mesh(gl, new Float32Array(vertices), new Uint16Array(indices));
};
const createCircleMesh = (gl, quality) => {
    const step = Math.PI * 2 / quality;
    const vertices = new Array();
    const indices = new Array();
    let index = 0;
    for (let i = 0; i < quality; ++i) {
        const angle1 = step * i;
        const angle2 = step * (i + 1);
        const c1 = Math.cos(angle1);
        const c2 = Math.cos(angle2);
        const s1 = Math.sin(angle1);
        const s2 = Math.sin(angle2);
        vertices.push(0, 0, c1, s1, c2, s2);
        for (let j = 0; j < 3; ++j) {
            indices.push(index++);
        }
    }
    return new Mesh(gl, new Float32Array(vertices), new Uint16Array(indices));
};
const createEquiangularTriangleMesh = (gl) => {
    const p = Math.SQRT1_2;
    return new Mesh(gl, new Float32Array([-p, -p, p, -p, 0, 1]), new Uint16Array([0, 1, 2]));
};
const getShaderTypeFromEffect = (eff) => [0 /* ShaderType.Textured */,
    2 /* ShaderType.FixedColorTextured */,
    3 /* ShaderType.InvertTextured */,
    4 /* ShaderType.SwapRedAndBlue */,
    5 /* ShaderType.BlackAndWhite */][eff] ?? 0 /* ShaderType.Textured */;
export class WebGLCanvas {
    get width() {
        return this.framebuffer?.width ?? this.renderer.width;
    }
    get height() {
        return this.framebuffer?.height ?? this.renderer.height;
    }
    constructor(renderer, transform, gl, width, height, linearFilter) {
        this.batchingEnabled = false;
        this.batchTexture = undefined;
        this.activeEffect = 0 /* Effect.None */;
        this.translation = new Vector(0, 0);
        this.translationActive = true;
        this.getCloneBufferBitmap = () => this.cloneTexture;
        this.getTranslation = () => this.translation.clone();
        if (width === undefined || height === undefined) {
            this.framebuffer = undefined;
            this.cloneTexture = undefined;
        }
        else {
            this.framebuffer = new WebGLBitmap(gl, undefined, linearFilter ?? false, false, false, true, width, height);
            this.cloneTexture = new WebGLBitmap(gl, undefined, linearFilter ?? false, false, false, true, width, height);
        }
        this.renderer = renderer;
        this.transform = transform;
        this.meshCircleOut = createCircleOutMesh(gl, 64);
        this.meshCircle = createCircleMesh(gl, 64);
        this.meshEquiangularTriangle = createEquiangularTriangleMesh(gl);
        this.batch = new SpriteBatch(gl, 4096);
        // TODO: TEMPORARY PLACE, add function "hideCursor"
        // document.body.style.setProperty("cursor", "none");
    }
    clear(r = 255, g = 255, b = 255) {
        this.renderer.clear(r / 255.0, g / 255.0, b / 255.0);
    }
    fillRect(dx = 0, dy = 0, dw = this.width, dh = this.height) {
        dx = (dx + this.translation.x) | 0;
        dy = (dy + this.translation.y) | 0;
        if (this.batchingEnabled) {
            this.batch.pushSprite(0, 0, 1, 1, dx, dy, dw, dh);
            return;
        }
        this.renderer.changeShader(1 /* ShaderType.NoTexture */);
        this.renderer.setVertexTransform(dx, dy, dw, dh);
        this.renderer.drawMesh();
    }
    drawBitmap(bmp, flip = 0 /* Flip.None */, dx = 0.0, dy = 0.0, sx = 0.0, sy = 0.0, sw = bmp?.width ?? 0, sh = bmp?.height ?? 0, dw = sw, dh = sh) {
        bmp ?? (bmp = this.batchTexture);
        if (bmp === undefined) {
            return;
        }
        if (this.translationActive) {
            dx += this.translation.x;
            dy += this.translation.y;
        }
        dx |= 0;
        dy |= 0;
        dw |= 0;
        dh |= 0;
        if ((flip & 1 /* Flip.Horizontal */) == 1 /* Flip.Horizontal */) {
            dx += dw;
            dw *= -1;
        }
        if ((flip & 2 /* Flip.Vertical */) == 2 /* Flip.Vertical */) {
            dy += dh;
            dh *= -1;
        }
        sx /= bmp.width;
        sy /= bmp.height;
        sw /= bmp.width;
        sh /= bmp.height;
        if (this.batchingEnabled) {
            this.batch.pushSprite(sx, sy, sw, sh, dx, dy, dw, dh);
            return;
        }
        this.renderer.changeShader(getShaderTypeFromEffect(this.activeEffect));
        this.renderer.setVertexTransform(dx, dy, dw, dh);
        this.renderer.setFragmenTransform(sx, sy, sw, sh);
        this.renderer.bindTexture(bmp);
        this.renderer.drawMesh();
    }
    drawText(font, text, dx, dy, xoff = 0, yoff = 0, align = 0 /* Align.Left */, scalex = 1.0, scaley = 1.0) {
        font ?? (font = this.batchTexture);
        if (font === undefined)
            return;
        const cw = (font.width / 16) | 0;
        const ch = cw;
        let x = dx;
        let y = dy;
        if (align == 2 /* Align.Center */) {
            dx -= (text.length + 1) * (cw + xoff) * scalex / 2.0;
            x = dx;
        }
        else if (align == 1 /* Align.Right */) {
            dx -= ((text.length + 1) * (cw + xoff)) * scalex;
            x = dx;
        }
        const useBatch = !this.batchingEnabled;
        if (useBatch) {
            this.beginSpriteBatching(font);
        }
        for (let i = 0; i < text.length; ++i) {
            const chr = text.charCodeAt(i);
            if (chr == '\n'.charCodeAt(0)) {
                x = dx;
                y += (ch + yoff) * scaley;
                continue;
            }
            this.drawBitmap(font, 0 /* Flip.None */, x, y, (chr % 16) * cw, ((chr / 16) | 0) * ch, cw, ch, cw * scalex, ch * scaley);
            x += (cw + xoff) * scalex;
        }
        if (useBatch) {
            this.endSpriteBatching();
            this.drawSpriteBatch();
        }
    }
    fillCircleOutside(centerx, centery, radius) {
        if (this.translationActive) {
            centerx += this.translation.x;
            centery += this.translation.y;
        }
        this.renderer.changeShader(1 /* ShaderType.NoTexture */);
        // Center
        this.renderer.setVertexTransform(centerx, centery, radius, radius);
        this.renderer.drawMesh(this.meshCircleOut);
        // Borders
        const top = Math.max(0, centery - radius) | 0;
        const bottom = Math.min(this.height, centery + radius) | 0;
        const left = Math.max(centerx - radius, 0) | 0;
        const right = Math.min(centerx + radius, this.width) | 0;
        // This is a workaround, okay?
        let bufferx = this.translation.x;
        let buffery = this.translation.y;
        this.translation.zeros();
        if (top > 0)
            this.fillRect(0, 0, this.width, top);
        if (bottom < this.height)
            this.fillRect(0, bottom, this.width, this.height - bottom);
        if (left > 0)
            this.fillRect(0, 0, left, this.height);
        if (right < this.width)
            this.fillRect(right, 0, this.width - right, this.height);
        this.translation.x = bufferx;
        this.translation.y = buffery;
    }
    fillEllipse(centerx, centery, width, height) {
        if (this.translationActive) {
            centerx += this.translation.x;
            centery += this.translation.y;
        }
        this.renderer.changeShader(1 /* ShaderType.NoTexture */);
        this.renderer.setVertexTransform(centerx, centery, width / 2, height / 2);
        this.renderer.drawMesh(this.meshCircle);
    }
    fillEquiangularTriangle(centerx, centery, width, height) {
        if (this.translationActive) {
            centerx += this.translation.x;
            centery += this.translation.y;
        }
        this.renderer.changeShader(1 /* ShaderType.NoTexture */);
        this.renderer.setVertexTransform(centerx, centery, width / 2, height / 2);
        this.renderer.drawMesh(this.meshEquiangularTriangle);
    }
    drawHorizontallyWavingBitmap(bitmap, amplitude, period, shift, flip = 0 /* Flip.None */, dx = 0, dy = 0, sx = 0, sy = 0, sw = bitmap?.width, sh = bitmap?.height) {
        bitmap ?? (bitmap = this.batchTexture);
        if (bitmap === undefined) {
            return;
        }
        // Note: For better performance one should obviously do this in
        // a shader, but I'm lazy
        // TODO: Automaticall use sprite batch if not enabled
        // for a better performance
        const useBatch = !this.batchingEnabled;
        if (useBatch) {
            this.beginSpriteBatching(bitmap);
        }
        const phaseStep = Math.PI * 2 / period;
        for (let y = 0; y < sh; ++y) {
            const phase = shift + phaseStep * y;
            const x = dx + Math.sin(phase) * amplitude;
            const py = (flip & 2 /* Flip.Vertical */) != 0 ? (sh - 1) - y : y;
            this.drawBitmap(bitmap, 1 /* Flip.Horizontal */ & flip, x, dy + y, sx, sy + py, sw, 1);
        }
        if (useBatch) {
            this.endSpriteBatching();
            this.drawSpriteBatch();
        }
    }
    drawVerticallyWavingBitmap(bmp, dx, dy, sx, sy, sw, sh, period, amplitude, shift) {
        const useBatch = !this.batchingEnabled;
        if (useBatch) {
            this.beginSpriteBatching(bmp);
        }
        for (let x = 0; x < sw; ++x) {
            const t = shift + (x / sw) * period;
            const y = Math.round(Math.sin(t) * amplitude);
            this.drawBitmap(bmp, 0 /* Flip.None */, dx + x, dy + y, sx + x, sy, 1, sh);
        }
        if (useBatch) {
            this.endSpriteBatching();
            this.drawSpriteBatch();
        }
    }
    drawFunnilyAppearingBitmap(bmp, flip, dx, dy, sx, sy, sw, sh, t, amplitude, latitude, maxOffset) {
        const offset = 1 + maxOffset * t;
        const useBatch = !this.batchingEnabled;
        if (useBatch) {
            this.beginSpriteBatching(bmp);
        }
        for (let y = 0; y < sh; ++y) {
            this.drawBitmap(bmp, flip, (dx + Math.sin((Math.PI * 2 * latitude) / sh * y + t * (Math.PI * latitude)) * amplitude * t), (dy + y * offset - sh * maxOffset * t / 2), sx, sy + y, sw, 1);
        }
        if (useBatch) {
            this.endSpriteBatching();
            this.drawSpriteBatch();
        }
    }
    setColor(r = 255, g = r, b = g, a = 1.0) {
        this.renderer.setColor(r / 255.0, g / 255.0, b / 255.0, a);
    }
    setAlpha(alpha = 1.0) {
        this.renderer.setAlpha(alpha);
    }
    applyEffect(eff = 0 /* Effect.None */) {
        this.activeEffect = eff;
    }
    flushSpriteBatch() {
        this.batchingEnabled = false;
        this.batch.flush();
    }
    beginSpriteBatching(texture = undefined) {
        this.batchingEnabled = true;
        this.batch.flush();
        this.batchTexture = texture;
    }
    endSpriteBatching() {
        this.batch.prepareMesh();
        this.batchingEnabled = false;
    }
    drawSpriteBatch(dx = 0.0, dy = 0.0) {
        if (!this.batch.anythingToDraw()) {
            return;
        }
        this.renderer.changeShader(getShaderTypeFromEffect(this.activeEffect));
        this.renderer.setVertexTransform(dx | 0, dy | 0, 1.0, 1.0);
        this.renderer.setFragmenTransform(0, 0, 1, 1);
        this.renderer.bindTexture(this.batchTexture);
        this.renderer.drawMesh(this.batch.outputMesh);
    }
    toggleSilhouetteRendering(state = false) {
        this.renderer.toggleStencilTest(state);
        if (state) {
            this.renderer.clearStencilBuffer();
            this.renderer.setStencilOperation(0 /* StencilOperation.Keep */);
            this.renderer.setStencilCondition(1 /* StencilCondition.NotEqual */);
        }
    }
    clearSilhouetteBuffer() {
        this.renderer.clearStencilBuffer();
    }
    setRenderTarget() {
        this.framebuffer.setRenderTarget();
    }
    bind() {
        this.framebuffer.bind();
    }
    // Warning: deprecated
    applyTransform() {
        this.renderer.applyTransform();
    }
    cloneToBufferBitmap() {
        if (this.framebuffer === undefined || this.cloneTexture === undefined)
            return;
        this.renderer.nullActiveBitmap();
        this.framebuffer.cloneToBitmap(this.cloneTexture);
    }
    recreate(gl, newWidth, newHeight) {
        this.framebuffer.dispose();
        this.cloneTexture.dispose();
        this.framebuffer = new WebGLBitmap(gl, undefined, false, false, false, true, newWidth, newHeight);
        this.cloneTexture = new WebGLBitmap(gl, undefined, false, false, false, true, newWidth, newHeight);
    }
    move(x, y) {
        this.translation.x += x;
        this.translation.y += y;
    }
    moveTo(x = 0.0, y = 0.0) {
        this.translation.x = x;
        this.translation.y = y;
    }
    toggleTranslation(state = true) {
        this.translationActive = state;
    }
}
