export class RGBA {
    constructor(r = 255, g = r, b = g, a = 1) {
        this.clone = () => new RGBA(this.r, this.g, this.b, this.a);
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    static invertUnsignedByte(c) {
        const out = new RGBA();
        out.r = Math.round(255 - c.r);
        out.g = Math.round(255 - c.g);
        out.b = Math.round(255 - c.b);
        return out;
    }
}
