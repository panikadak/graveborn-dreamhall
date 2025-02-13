export class SceneManager {
    constructor() {
        this.activeScene = undefined;
        this.scenes = new Map();
    }
    addScene(name, scene, makeActive = true) {
        this.scenes.set(name, scene);
        if (makeActive) {
            this.activeScene = scene;
        }
    }
    init(event) {
        this.activeScene?.init?.(undefined, event);
    }
    update(event) {
        this.activeScene?.update(event);
    }
    redraw(canvas, assets, isCloningToBuffer = false) {
        this.activeScene?.redraw(canvas, assets, isCloningToBuffer);
    }
    postDraw(canvas, assets) {
        this.activeScene?.postDraw?.(canvas, assets);
    }
    changeScene(name, event) {
        const param = this.activeScene?.dispose();
        this.activeScene = this.scenes.get(name);
        this.activeScene?.init?.(param, event);
    }
}
