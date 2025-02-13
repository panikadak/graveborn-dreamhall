import { Matrix } from "../../math/matrix.js";
const UNIFORM_NAMES = [
    "transform",
    "pos",
    "scale",
    "texPos",
    "texScale",
    "color",
    "texSampler"
];
export class Shader {
    constructor(gl, vertexSource, fragmentSource) {
        this.gl = gl;
        this.uniforms = new Map();
        this.program = this.buildShader(vertexSource, fragmentSource);
        this.getUniformLocations();
    }
    createShader(src, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        // TODO: Does this ever happen?
        if (shader === null) {
            throw new Error("Failed to create a shader!");
        }
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error("Shader error:\n" + gl.getShaderInfoLog(shader));
        }
        return shader;
    }
    buildShader(vertexSource, fragmentSource) {
        const gl = this.gl;
        const vertex = this.createShader(vertexSource, gl.VERTEX_SHADER);
        const frag = this.createShader(fragmentSource, gl.FRAGMENT_SHADER);
        const program = gl.createProgram();
        if (program === null) {
            throw new Error("Failed to create a WebGL shader program!");
        }
        gl.attachShader(program, vertex);
        gl.attachShader(program, frag);
        this.bindLocations(program);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("Shader error: " + gl.getProgramInfoLog(program));
        }
        return program;
    }
    bindLocations(program) {
        const gl = this.gl;
        gl.bindAttribLocation(program, 0, "vertexPos");
        gl.bindAttribLocation(program, 1, "vertexUV");
        // gl.bindAttribLocation(program, 2, "vertexColor");
    }
    getUniformLocations() {
        const gl = this.gl;
        for (let s of UNIFORM_NAMES) {
            this.uniforms.set(s, gl.getUniformLocation(this.program, s));
        }
    }
    use() {
        const gl = this.gl;
        gl.useProgram(this.program);
        this.getUniformLocations();
        gl.uniform1i(this.uniforms.get("texSampler") ?? null, 0);
        this.setVertexTransform(0, 0, 1, 1);
        this.setFragTransform(0, 0, 1, 1);
        this.setTransformMatrix(Matrix.identity());
        this.setColor(1, 1, 1, 1);
    }
    setVertexTransform(x, y, w, h) {
        const gl = this.gl;
        gl.uniform2f(this.uniforms.get("pos") ?? null, x, y);
        gl.uniform2f(this.uniforms.get("scale") ?? null, w, h);
    }
    setFragTransform(x, y, w, h) {
        const gl = this.gl;
        gl.uniform2f(this.uniforms.get("texPos") ?? null, x, y);
        gl.uniform2f(this.uniforms.get("texScale") ?? null, w, h);
    }
    setColor(r = 1, g = 1, b = 1, a = 1) {
        const gl = this.gl;
        gl.uniform4f(this.uniforms.get("color") ?? null, r, g, b, a);
    }
    setTransformMatrix(matrix) {
        const gl = this.gl;
        gl.uniformMatrix4fv(this.uniforms.get("transform") ?? null, false, matrix.m);
    }
}
