export class Vector {
    constructor(x = 0.0, y = 0.0, z = 0, w = 0) {
        this.clone = () => new Vector(this.x, this.y, this.z, this.w);
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
    get length() {
        return Math.hypot(this.x, this.y, this.z, this.w);
    }
    normalize(forceUnit = false) {
        const EPS = 0.0001;
        const len = this.length;
        if (len < EPS) {
            this.x = forceUnit ? 1 : 0;
            this.y = 0;
            return;
        }
        this.x /= len;
        this.y /= len;
    }
    cloneFrom(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        this.w = v.w;
    }
    zeros() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 0;
    }
    static normalize(v, forceUnit = false) {
        const out = v.clone();
        out.normalize(forceUnit);
        return out;
    }
    static cap(v, r, eps = 0.0001) {
        const out = v.clone();
        if (out.length >= r - eps) {
            out.normalize();
            out.x *= r;
            out.y *= r;
        }
        return out;
    }
}
Vector.dot = (u, v) => u.x * v.x + u.y * v.y + u.z * v.z + u.w * v.w;
Vector.scalarMultiply = (v, s) => new Vector(v.x * s, v.y * s, v.z * s, v.w * s);
Vector.distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w);
// Reminder to self: direction FROM a TO b
Vector.direction = (a, b) => Vector.normalize(new Vector(b.x - a.x, b.y - a.y, b.z - a.z, b.w - a.w), true);
Vector.add = (a, b) => new Vector(a.x + b.x, a.y + b.y, a.z + b.z, a.w + b.w);
Vector.subtract = (a, b) => new Vector(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w);
Vector.project = (u, v) => Vector.scalarMultiply(v, Vector.dot(u, v));
Vector.lerp = (a, b, t) => new Vector((1 - t) * a.x + t * b.x, (1 - t) * a.y + t * b.y, (1 - t) * a.z + t * b.z, (1 - t) * a.w + t * b.w);
Vector.max = (v) => Math.max(v.x, v.y, v.z, v.w);
