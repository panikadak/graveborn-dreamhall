import { RGBA } from "../../math/rgba.js";
import { Vector } from "../../math/vector.js";
import { WebGLBitmap } from "./bitmap.js";
import { WebGLCanvas } from "./canvas.js";
import { Mesh } from "./mesh.js";
import { Shader } from "./shader.js";
import { FragmentSource, VertexSource } from "./shadersource.js";
import { WebGLTransform } from "./transform.js";
const createCanvasElement = (width, height) => {
    const div = document.createElement("div");
    div.id = "base_div";
    div.setAttribute("style", "position: absolute; top: 0; left: 0; z-index: -1;");
    const canvas = document.createElement("canvas");
    canvas.setAttribute("style", "position: absolute; top: 0; left: 0; z-index: -1;");
    canvas.width = width;
    canvas.height = height;
    div.appendChild(canvas);
    document.body.appendChild(div);
    return [
        canvas,
        canvas.getContext("webgl", { alpha: false, antialias: true, stencil: true })
    ];
};
const createRectangleMesh = (gl) => new Mesh(gl, new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 1,
]), new Uint16Array([
    0, 1, 2,
    2, 3, 0
]), new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 1
]));
const initGL = (gl) => {
    gl.activeTexture(gl.TEXTURE0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // TODO: Useless? (leftover from an older project)
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.stencilMask(0xff);
    gl.disable(gl.STENCIL_TEST);
};
;
;
;
export class WebGLRenderer {
    get width() {
        return this.screenWidth;
    }
    get height() {
        return this.screenHeight;
    }
    get canvasWidth() {
        return this.canvas.width;
    }
    get canvasHeight() {
        return this.canvas.height;
    }
    constructor(canvasWidth, canvasHeight, preserveSquarePixels = false, dynamicCanvas = false, linearFilter = false, maxCanvasWidth = undefined, maxCanvasHeight = undefined) {
        this.fixedSizeCanvas = true;
        this.preserveSquarePixels = true;
        this.screenWidth = 1;
        this.screenHeight = 1;
        this.activeShader = undefined;
        this.activeMesh = undefined;
        this.activeBitmap = undefined;
        const [hcanvas, gl] = createCanvasElement(window.innerWidth, window.innerHeight);
        if (gl === null) {
            throw new Error("Failed to create a WebGL context!");
        }
        this.htmlCanvas = hcanvas;
        this.gl = gl;
        initGL(gl);
        this.meshRect = createRectangleMesh(gl);
        this.internalTransform = new WebGLTransform((transf) => transf.use(this.activeShader));
        this.internalTransform.setTarget(1 /* TransformTarget.Camera */);
        this.canvasTransform = new WebGLTransform((transf) => transf.use(this.activeShader));
        this.canvas = new WebGLCanvas(this, this.canvasTransform, this.gl, canvasWidth, canvasHeight, linearFilter);
        this.fixedSizeCanvas = canvasWidth !== undefined && canvasHeight !== undefined;
        this.shaders = new Map();
        this.shaders.set(0 /* ShaderType.Textured */, new Shader(gl, VertexSource.Textured, FragmentSource.Textured));
        this.shaders.set(1 /* ShaderType.NoTexture */, new Shader(gl, VertexSource.NoTexture, FragmentSource.NoTexture));
        this.shaders.set(2 /* ShaderType.FixedColorTextured */, new Shader(gl, VertexSource.Textured, FragmentSource.TexturedFixedColor));
        this.shaders.set(3 /* ShaderType.InvertTextured */, new Shader(gl, VertexSource.Textured, FragmentSource.TexturedInvert));
        this.shaders.set(4 /* ShaderType.SwapRedAndBlue */, new Shader(gl, VertexSource.Textured, FragmentSource.TexturedSwapRedBlue));
        this.shaders.set(5 /* ShaderType.BlackAndWhite */, new Shader(gl, VertexSource.Textured, FragmentSource.TexturedBlackAndWhite));
        this.activeShader = this.shaders.get(0 /* ShaderType.Textured */);
        this.activeShader.use();
        this.canvasPos = new Vector();
        this.canvasScale = new Vector(1, 1);
        this.activeColor = new RGBA();
        this.dynamicCanvas = dynamicCanvas;
        this.preserveSquarePixels = preserveSquarePixels;
        this.maxCanvasWidth = maxCanvasWidth;
        this.maxCanvasHeight = maxCanvasHeight;
        this.targetWidth = canvasWidth;
        this.targetHeight = canvasHeight;
        this.resize(window.innerWidth, window.innerHeight);
        window.addEventListener("resize", () => this.resize(window.innerWidth, window.innerHeight));
    }
    resizeCanvas(width, height) {
        if (this.canvas.width == width && this.canvas.height == height)
            return;
        // Compute new optimal size
        const targetRatio = this.targetWidth / this.targetHeight;
        const windowRatio = width / height;
        let newWidth = 0;
        let newHeight = 0;
        if (windowRatio >= targetRatio) {
            newWidth = Math.round(windowRatio * this.targetHeight);
            newHeight = this.targetHeight;
        }
        else {
            newWidth = this.targetWidth;
            newHeight = Math.round(this.targetWidth / windowRatio);
        }
        newWidth = Math.min(newWidth, this.maxCanvasWidth);
        newHeight = Math.min(newHeight, this.maxCanvasHeight);
        this.canvas.recreate(this.gl, newWidth, newHeight);
    }
    resize(width, height) {
        const gl = this.gl;
        gl.viewport(0, 0, width, height);
        this.htmlCanvas.width = width;
        this.htmlCanvas.height = height;
        this.screenWidth = width;
        this.screenHeight = height;
        if (!this.fixedSizeCanvas) {
            return;
        }
        if (this.dynamicCanvas) {
            this.resizeCanvas(width, height);
        }
        let m = Math.min(width / this.canvas.width, height / this.canvas.height);
        if (m > 1.0 && this.preserveSquarePixels)
            m |= 0;
        this.canvasScale.x = m * this.canvas.width;
        this.canvasScale.y = m * this.canvas.height;
        this.canvasPos.x = width / 2 - this.canvasScale.x / 2;
        this.canvasPos.y = height / 2 - this.canvasScale.y / 2;
        this.internalTransform.view(this.screenWidth, this.screenHeight);
    }
    changeShader(type) {
        const shader = this.shaders.get(type);
        if (shader === undefined || this.activeShader === shader)
            return;
        this.activeShader = shader;
        shader.use();
        this.canvasTransform.use(shader);
        shader.setColor(this.activeColor.r, this.activeColor.g, this.activeColor.b, this.activeColor.a);
    }
    clear(r, g, b) {
        const gl = this.gl;
        gl.clearColor(r, g, b, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    bindTexture(bmp) {
        if (this.activeBitmap === bmp)
            return;
        this.activeBitmap = bmp;
        bmp?.bind();
    }
    drawMesh(mesh) {
        mesh = mesh ?? this.meshRect;
        if (this.activeMesh !== mesh) {
            this.activeMesh = mesh;
            mesh.bind();
        }
        mesh.draw();
    }
    setColor(r, g, b, a) {
        this.activeColor = new RGBA(r, g, b, a);
        this.activeShader?.setColor(r, g, b, a);
    }
    setAlpha(alpha) {
        this.activeColor.a = alpha;
        this.activeShader?.setColor(this.activeColor.r, this.activeColor.g, this.activeColor.b, alpha);
    }
    applyTransform() {
        if (this.activeShader === undefined)
            return;
        this.canvasTransform.use(this.activeShader);
    }
    setVertexTransform(x = 0, y = 0, w = 1, h = 1) {
        this.activeShader?.setVertexTransform(x, y, w, h);
    }
    setFragmenTransform(x = 0, y = 0, w = 1, h = 1) {
        this.activeShader?.setFragTransform(x, y, w, h);
    }
    drawToCanvas(cb) {
        if (!this.fixedSizeCanvas) {
            cb(this.canvas);
            return;
        }
        const gl = this.gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.setRenderTarget();
        cb(this.canvas);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.screenWidth, this.screenHeight);
    }
    refresh() {
        if (!this.fixedSizeCanvas)
            return;
        const gl = this.gl;
        const shader = this.shaders.get(0 /* ShaderType.Textured */);
        if (shader === undefined)
            return;
        if (shader !== this.activeShader) {
            shader.use();
        }
        this.internalTransform.use(shader);
        shader.setVertexTransform(Math.round(this.canvasPos.x), Math.round(this.canvasPos.y + this.canvasScale.y), Math.round(this.canvasScale.x), -Math.round(this.canvasScale.y));
        shader.setFragTransform(0, 0, 1, 1);
        shader.setColor(1, 1, 1, 1);
        this.clear(0, 0, 0);
        this.meshRect.bind();
        this.canvas.bind();
        this.meshRect.draw();
        gl.bindTexture(gl.TEXTURE_2D, null);
        if (shader !== this.activeShader) {
            this.activeShader?.use();
        }
        this.activeMesh?.bind();
        this.activeBitmap?.bind();
        this.activeShader?.setColor(this.activeColor.r, this.activeColor.g, this.activeColor.b, this.activeColor.a);
    }
    createBitmap(img, linearFilter = false, repeatx = false, repeaty = false) {
        const gl = this.gl;
        return new WebGLBitmap(gl, img, linearFilter, repeatx, repeaty);
    }
    nullActiveBitmap() {
        this.activeBitmap = null;
    }
    cloneCanvasToBufferBitmap() {
        this.canvas.cloneToBufferBitmap();
    }
    createBitmapFromPixelData(pixels, width, height) {
        return new WebGLBitmap(this.gl, undefined, false, false, false, false, width, height, pixels);
    }
    setStencilCondition(cond) {
        const gl = this.gl;
        const FUNCTION_LOOKUP = [gl.ALWAYS, gl.NOTEQUAL, gl.EQUAL, gl.GEQUAL, gl.LEQUAL, gl.LESS, gl.GREATER];
        gl.stencilFunc(FUNCTION_LOOKUP[cond], 1, 0xff);
    }
    setStencilOperation(op) {
        const gl = this.gl;
        const FAIL_LOOKUP = [gl.KEEP, gl.ZERO];
        const PASS_LOOKUP = [gl.REPLACE, gl.ZERO];
        gl.stencilOp(FAIL_LOOKUP[op], FAIL_LOOKUP[op], PASS_LOOKUP[op]);
    }
    clearStencilBuffer() {
        const gl = this.gl;
        gl.clear(gl.STENCIL_BUFFER_BIT);
    }
    toggleStencilTest(state) {
        const gl = this.gl;
        state ? gl.enable(gl.STENCIL_TEST) : gl.disable(gl.STENCIL_TEST);
    }
}
