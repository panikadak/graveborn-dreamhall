import { Tilemap } from "../tilemap/tilemap.js";
export class Assets {
    constructor(audio, renderer) {
        this.loaded = 0;
        this.totalAssets = 0;
        this.hasLoaded = () => this.loaded >= this.totalAssets;
        // In range [0,1], actually...
        this.getLoadingPercentage = () => this.totalAssets == 0 ? 1.0 : this.loaded / this.totalAssets;
        this.bitmaps = new Map();
        this.samples = new Map();
        this.tilemaps = new Map();
        this.documents = new Map();
        this.audio = audio;
        this.renderer = renderer;
    }
    loadTextFile(path, type, func) {
        ++this.totalAssets;
        const xobj = new XMLHttpRequest();
        xobj.overrideMimeType("text/" + type);
        xobj.open("GET", path, true);
        xobj.onreadystatechange = () => {
            if (xobj.readyState == 4) {
                if (String(xobj.status) == "200") {
                    func(xobj.responseText);
                }
                ++this.loaded;
            }
        };
        xobj.send(null);
    }
    loadItems(jsonData, func, basePathName, arrayName) {
        const path = jsonData[basePathName];
        const objects = jsonData[arrayName];
        if (path !== undefined && objects !== undefined) {
            for (let o of objects) {
                func(o["name"], path + o["path"], o["alias"], o["filter"]);
            }
        }
    }
    loadBitmaps(jsonData, basePathName, arrayName) {
        const path = jsonData[basePathName];
        const objects = jsonData[arrayName];
        if (path !== undefined && objects !== undefined) {
            for (let o of objects) {
                this.loadBitmap(o["name"], path + o["path"], o["alias"], o["filter"], o["repeatx"] ?? false, o["repeaty"] ?? false);
            }
        }
    }
    loadBitmap(name, path, alias, filter, repeatx, repeaty) {
        // TODO: Also check other cases
        const linearFilter = filter === "linear";
        ++this.totalAssets;
        const image = new Image();
        image.onload = (_) => {
            ++this.loaded;
            const bmp = this.renderer.createBitmap(image, linearFilter, repeatx, repeaty);
            this.bitmaps.set(name, bmp);
        };
        image.src = path;
    }
    loadTilemap(name, path) {
        ++this.totalAssets;
        this.loadTextFile(path, "xml", (str) => {
            this.tilemaps.set(name, new Tilemap(str));
            ++this.loaded;
        });
    }
    loadSample(name, path, alias) {
        ++this.totalAssets;
        console.log(`Loading audio sample ${name} from ${path}`);
        fetch(path)
            .then(async (response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
            }
            const headers = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });
            console.log(`Response headers for ${name}:`, headers);
            const buffer = await response.arrayBuffer();
            console.log(`Buffer received for ${name}, size: ${buffer.byteLength} bytes`);
            // Log first few bytes to check header
            const firstBytes = new Uint8Array(buffer.slice(0, 32));
            console.log(`First 32 bytes of ${name}:`, Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
            return buffer;
        })
            .then(buffer => {
            console.log(`Starting audio decoding for ${name}...`);
            return this.audio.decodeSample(buffer, (sample) => {
                console.log(`Successfully decoded audio for ${name}`);
                ++this.loaded;
                this.samples.set(name, sample);
                if (alias !== undefined) {
                    this.samples.set(alias, sample);
                }
            });
        })
            .catch(error => {
            console.error(`Error loading audio sample ${name} from ${path}:`, error);
            ++this.loaded; // Still increment to avoid hanging
        });
    }
    loadDocument(name, path) {
        this.loadTextFile(path, "json", (s) => {
            this.documents.set(name, s);
        });
    }
    parseIndexFile(path) {
        this.loadTextFile(path, "json", (s) => {
            const data = JSON.parse(s);
            /*
                this.loadItems(data, (name : string, path : string, alias? : string, filter? : string) => {
                    this.loadBitmap(name, path, alias, filter);
                }, "bitmapPath", "bitmaps");
            */
            this.loadBitmaps(data, "bitmapPath", "bitmaps");
            this.loadItems(data, (name, path) => {
                this.loadTilemap(name, path);
            }, "tilemapPath", "tilemaps");
            this.loadItems(data, (name, path, alias) => {
                this.loadSample(name, path, alias);
            }, "samplePath", "samples");
            this.loadItems(data, (name, path) => {
                this.loadDocument(name, path);
            }, "documentPath", "documents");
        });
    }
    addBitmap(key, bmp) {
        if (bmp === undefined)
            return;
        this.bitmaps.set(key, bmp);
    }
    getBitmap(name) {
        return this.bitmaps.get(name);
    }
    getSample(name) {
        return this.samples.get(name);
    }
    getTilemap(name) {
        return this.tilemaps.get(name);
    }
    getDocument(name) {
        return this.documents.get(name);
    }
}
