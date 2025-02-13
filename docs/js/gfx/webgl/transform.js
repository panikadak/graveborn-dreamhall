import { Matrix } from "../../math/matrix.js";
class Target {
    constructor() {
        this.matrix = Matrix.identity();
        this.stack = new Array();
    }
}
export class WebGLTransform {
    constructor(applyEvent) {
        this.productComputed = true; // Why is this public?
        const initialTarget = new Target();
        this.target = new Map();
        this.target.set(0 /* TransformTarget.Model */, initialTarget);
        this.target.set(1 /* TransformTarget.Camera */, new Target());
        this.activeTarget = initialTarget;
        this.applyEvent = applyEvent;
        this.product = Matrix.identity();
    }
    computeProduct() {
        const view = this.target.get(1 /* TransformTarget.Camera */)?.matrix ?? Matrix.identity();
        const model = this.target.get(0 /* TransformTarget.Model */)?.matrix ?? Matrix.identity();
        this.product = Matrix.transpose(Matrix.multiply(view, model));
    }
    setTarget(target) {
        this.activeTarget = this.target.get(target) ?? this.activeTarget;
    }
    loadIdentity() {
        this.activeTarget.matrix = Matrix.identity();
        this.productComputed = false;
    }
    translate(x, y) {
        this.activeTarget.matrix = Matrix.multiply(this.activeTarget.matrix, Matrix.translate(x, y));
        this.productComputed = false;
    }
    scale(sx, sy) {
        this.activeTarget.matrix = Matrix.multiply(this.activeTarget.matrix, Matrix.scale(sx, sy));
        this.productComputed = false;
    }
    rotate(angle) {
        this.activeTarget.matrix = Matrix.multiply(this.activeTarget.matrix, Matrix.rotate(angle));
        this.productComputed = false;
    }
    operateBasis(v1, v2) {
        this.activeTarget.matrix = Matrix.multiply(this.activeTarget.matrix, Matrix.basis(v1, v2));
        this.productComputed = false;
    }
    view(width, height) {
        this.activeTarget.matrix = Matrix.view(0, width, height, 0);
        this.productComputed = false;
    }
    fitDimension(dimension, width, height) {
        const ratio = width / height;
        if (ratio >= 1.0) {
            this.view(Math.round(ratio * dimension), dimension);
            return;
        }
        this.view(dimension, Math.round(dimension / ratio));
    }
    push() {
        const MAX_SIZE = 64;
        if (this.activeTarget.stack.length >= MAX_SIZE) {
            console.warn("Warning: matrix stack overflow!");
            return;
        }
        this.activeTarget.stack.push(this.activeTarget.matrix.clone());
    }
    pop() {
        this.activeTarget.matrix = this.activeTarget.stack.pop() ?? this.activeTarget.matrix;
        this.productComputed = false;
    }
    use(shader) {
        if (!this.productComputed) {
            this.computeProduct();
            this.productComputed = true;
        }
        shader.setTransformMatrix(this.product);
    }
    apply() {
        this.applyEvent(this);
    }
}
