export class Localization {
    constructor(jsonSource) {
        this.jsonData = JSON.parse(jsonSource);
    }
    getItem(key) {
        const item = this.jsonData[key];
        if (typeof (item) === "string") {
            return [item];
        }
        if (item?.["length"] !== undefined) {
            return item;
        }
        return undefined;
    }
}
