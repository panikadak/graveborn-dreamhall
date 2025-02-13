export class Matrix {
    // TODO: There is a much better way to do this, believe me
    constructor(a11 = 0.0, a12 = 0.0, a13 = 0.0, a14 = 0.0, a21 = 0.0, a22 = 0.0, a23 = 0.0, a24 = 0.0, a31 = 0.0, a32 = 0.0, a33 = 0.0, a34 = 0.0, a41 = 0.0, a42 = 0.0, a43 = 0.0, a44 = 0.0) {
        this.clone = () => new Matrix(...this.m);
        this.m = new Float32Array([a11, a12, a13, a14,
            a21, a22, a23, a24,
            a31, a32, a33, a34,
            a41, a42, a43, a44]);
    }
    static rotate(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Matrix(c, -s, 0, 0, s, c, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);
    }
    static multiply(left, right) {
        const out = new Matrix();
        for (let i = 0; i < 4; ++i) {
            for (let j = 0; j < 4; ++j) {
                for (let k = 0; k < 4; ++k) {
                    out.m[i * 4 + j] += left.m[i * 4 + k] * right.m[k * 4 + j];
                }
            }
        }
        return out;
    }
    static transpose(A) {
        const out = new Matrix();
        for (let j = 0; j < 4; ++j) {
            for (let i = 0; i < 4; ++i) {
                out.m[i * 4 + j] = A.m[j * 4 + i];
            }
        }
        return out;
    }
}
Matrix.identity = () => new Matrix(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
Matrix.translate = (x, y, z = 0.0) => new Matrix(1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1);
Matrix.scale = (sx, sy, sz = 1.0) => new Matrix(sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1);
Matrix.basis = (v1, v2) => new Matrix(v1.x, v2.x, 0, 0, v1.y, v2.y, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
// TODO: Check if correct
Matrix.view = (left, right, bottom, top) => new Matrix(2.0 / (right - left), 0, 0, -(right + left) / (right - left), 0, 2.0 / (top - bottom), 0, -(top + bottom) / (top - bottom), 0, 0, 0, 0, 0, 0, 0, 1);
