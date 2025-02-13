import { Mesh } from "./mesh.js";
export class SpriteBatch {
    get outputMesh() {
        return this.bufferMesh;
    }
    constructor(gl, maxSize) {
        this.elementPointer = 0;
        this.prepared = false;
        this.errorShown = false;
        this.anythingToDraw = () => this.prepared;
        const zerosFloat = new Float32Array((new Array(maxSize * 6 * 2)).fill(0.0));
        const indices = new Uint16Array(maxSize * 6);
        for (let i = 0; i < indices.length; ++i) {
            indices[i] = i;
        }
        this.bufferMesh = new Mesh(gl, zerosFloat, indices, zerosFloat, true);
        this.vertexBuffer = new Float32Array(maxSize * 6 * 2);
        this.uvBuffer = new Float32Array(maxSize * 6 * 2);
        this.maxSize = maxSize;
    }
    flush() {
        this.elementPointer = 0;
        this.prepared = false;
    }
    pushSprite(sx, sy, sw, sh, dx, dy, dw, dh) {
        if (this.elementPointer + 6 >= this.maxSize) {
            if (!this.errorShown) {
                console.warn("Sprite batch overflow! Cannot add more objects.");
                this.errorShown = true;
            }
            return;
        }
        // Push data to the buffers
        const p = this.elementPointer * 2;
        this.vertexBuffer[p] = dx;
        this.vertexBuffer[p + 1] = dy;
        this.vertexBuffer[p + 2] = dx + dw;
        this.vertexBuffer[p + 3] = dy;
        this.vertexBuffer[p + 4] = dx + dw;
        this.vertexBuffer[p + 5] = dy + dh;
        this.vertexBuffer[p + 6] = dx + dw;
        this.vertexBuffer[p + 7] = dy + dh;
        this.vertexBuffer[p + 8] = dx;
        this.vertexBuffer[p + 9] = dy + dh;
        this.vertexBuffer[p + 10] = dx;
        this.vertexBuffer[p + 11] = dy;
        this.uvBuffer[p] = sx;
        this.uvBuffer[p + 1] = sy;
        this.uvBuffer[p + 2] = sx + sw;
        this.uvBuffer[p + 3] = sy;
        this.uvBuffer[p + 4] = sx + sw;
        this.uvBuffer[p + 5] = sy + sh;
        this.uvBuffer[p + 6] = sx + sw;
        this.uvBuffer[p + 7] = sy + sh;
        this.uvBuffer[p + 8] = sx;
        this.uvBuffer[p + 9] = sy + sh;
        this.uvBuffer[p + 10] = sx;
        this.uvBuffer[p + 11] = sy;
        this.elementPointer += 6;
    }
    prepareMesh() {
        if (this.elementPointer == 0) {
            return false;
        }
        if (this.prepared) {
            return true;
        }
        const max = this.bufferMesh.getMaxElementCount();
        if (this.elementPointer > max) {
            // TODO: Dynamically allocate more memory
            this.elementPointer = max;
        }
        // Update vertices & uv coords. Note that there is no need to
        // update the index buffer.
        this.bufferMesh.updateVertices(this.vertexBuffer.subarray(0, this.elementPointer * 6 * 2));
        this.bufferMesh.updateTextureCoordinates(this.uvBuffer.subarray(0, this.elementPointer * 6 * 2));
        this.bufferMesh.updateElementCount(this.elementPointer);
        this.prepared = true;
        return true;
    }
}
