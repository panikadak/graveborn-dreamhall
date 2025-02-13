import { clamp } from "../../math/utility.js";
export class Mesh {
    constructor(gl, vertices, indices, textureCoordinates = undefined, // No idea why this can be null
    dynamic = false) {
        this.getMaxElementCount = () => this.maxElementCount;
        this.vertexBuffer = gl.createBuffer();
        this.uvBuffer = textureCoordinates === undefined ? null : gl.createBuffer();
        this.indexBuffer = gl.createBuffer();
        const drawType = dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, drawType);
        if (textureCoordinates !== undefined) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, textureCoordinates, drawType);
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, drawType);
        this.vertexCount = vertices.length;
        this.uvCount = textureCoordinates?.length ?? 0;
        this.elementCount = indices.length;
        this.maxElementCount = indices.length;
        this.gl = gl;
    }
    bind() {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        if (this.uvBuffer !== null) {
            gl.enableVertexAttribArray(1);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
        }
        else {
            gl.disableVertexAttribArray(1);
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    }
    draw() {
        const gl = this.gl;
        gl.drawElements(gl.TRIANGLES, this.elementCount, gl.UNSIGNED_SHORT, 0);
    }
    dispose() {
        const gl = this.gl;
        gl.deleteBuffer(this.vertexBuffer);
        gl.deleteBuffer(this.indexBuffer);
        if (this.uvBuffer !== null) {
            gl.deleteBuffer(this.uvBuffer);
        }
    }
    updateVertices(newVertices) {
        const gl = this.gl;
        if (newVertices.length > this.vertexCount) {
            console.warn("Vertex buffer overflow, refuse to update data!");
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, newVertices);
        return true;
    }
    updateTextureCoordinates(newTexCoords) {
        const gl = this.gl;
        if (newTexCoords.length > this.uvCount) {
            console.warn("UV buffer overflow, refuse to update data!");
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, newTexCoords);
        return true;
    }
    updateIndices(newIndices) {
        const gl = this.gl;
        if (newIndices.length > this.maxElementCount) {
            console.warn("Index buffer overflow, refuse to update data!");
            return false;
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, newIndices);
        this.elementCount = newIndices.length;
        return true;
    }
    updateElementCount(newCount) {
        this.elementCount = clamp(newCount, 0, this.maxElementCount);
    }
}
