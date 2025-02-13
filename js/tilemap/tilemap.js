export class Tilemap {
    constructor(xmlString) {
        const doc = (new DOMParser()).parseFromString(xmlString, "text/xml");
        const root = doc.getElementsByTagName("map")[0];
        this.width = Number(root.getAttribute("width"));
        this.height = Number(root.getAttribute("height"));
        this.tileLayers = new Map();
        this.properties = new Map();
        this.parseLayerData(root);
        this.parseProperties(root);
    }
    parseLayerData(root) {
        const data = root.getElementsByTagName("layer");
        if (data === null) {
            return;
        }
        for (let i = 0; i < data.length; ++i) {
            // I guess this beats typecasting to any...
            const content = data[i].getElementsByTagName("data")[0]?.
                childNodes[0]?.
                nodeValue?.
                replace(/(\r\n|\n|\r)/gm, "")?.
                split(",");
            if (content === undefined)
                continue;
            this.tileLayers.set(data[i].getAttribute("name"), content.map((v) => Number(v)));
        }
    }
    parseProperties(root) {
        const prop = root.getElementsByTagName("properties")[0];
        if (prop !== undefined) {
            const elements = prop.getElementsByTagName("property");
            for (let i = 0; i < elements.length; ++i) {
                const p = elements[i];
                if (p.getAttribute("name") != undefined) {
                    this.properties.set(p.getAttribute("name") ?? "null", p.getAttribute("value") ?? "null");
                }
            }
        }
    }
    getTile(layerName, x, y, def = -1) {
        const layer = this.tileLayers.get(layerName);
        if (layer === undefined ||
            x < 0 || y < 0 || x >= this.width || y >= this.height)
            return def;
        return layer[y * this.width + x];
    }
    getIndexedTile(layerName, i, def = -1) {
        const layer = this.tileLayers.get(layerName);
        if (layer === undefined || i < 0 || i >= this.width * this.height)
            return def;
        return layer[i];
    }
    cloneLayer(layerName) {
        const layer = this.tileLayers.get(layerName);
        if (layer === undefined)
            return undefined;
        return Array.from(layer);
    }
    cloneSubLayer(layerName, left, top, width, height) {
        const layer = this.tileLayers.get(layerName);
        if (layer === undefined)
            return undefined;
        const out = (new Array(width * height)).fill(0);
        for (let y = 0; y < height && top + y < this.height; ++y) {
            for (let x = 0; x < width && left + x < this.width; ++x) {
                out[y * width + x] = layer[(top + y) * this.width + (left + x)];
            }
        }
        return out;
    }
    getProperty(name) {
        return this.properties.get(name);
    }
    getNumericProperty(name) {
        const str = this.properties.get(name);
        if (str === undefined) {
            return undefined;
        }
        return Number(str);
    }
    getBooleanProperty(name) {
        return this.properties.get(name) === "true";
    }
}
