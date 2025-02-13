export function next(arr) {
    for (let o of arr) {
        if (!o.doesExist()) {
            return o;
        }
    }
    return undefined;
}
