export class Rectangle {
    constructor(x = 0, y = 0, w = 0, h = 0) {
        this.clone = () => new Rectangle(this.x, this.y, this.w, this.h);
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
}
export const overlayRect = (ashift, A, bshift, B) => ashift.x + A.x + A.w / 2 >= bshift.x + B.x - B.w / 2 &&
    ashift.x + A.x - A.w / 2 <= bshift.x + B.x + B.w / 2 &&
    ashift.y + A.y + A.h / 2 >= bshift.y + B.y - B.h / 2 &&
    ashift.y + A.y - A.h / 2 <= bshift.y + B.y + B.h / 2;
