export class WebGLBitmap {
    constructor(gl, image, linearFilter = false, repeatx = false, repeaty = false, makeFramebuffer = false, width = 256, height = 256, pixeldata = undefined) {
        this.texture = null;
        this.framebuffer = null;
        this.renderbuffer = null;
        this.texture = gl.createTexture();
        if (this.texture === null) {
            throw new Error("Failed to create a WebGL texture!");
        }
        const filter = linearFilter ? gl.LINEAR : gl.NEAREST;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeatx ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeaty ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        if (image !== undefined) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            this.width = image.width;
            this.height = image.height;
        }
        else if (pixeldata !== undefined) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixeldata);
            this.width = width;
            this.height = height;
        }
        else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            this.width = width;
            this.height = height;
        }
        if (makeFramebuffer) {
            this.createFramebuffer(gl, width, height);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.gl = gl;
    }
    createFramebuffer(gl, width, height) {
        this.framebuffer = gl.createFramebuffer();
        if (this.framebuffer === null) {
            throw new Error("Failed to create a WebGL framebuffer!");
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        this.renderbuffer = gl.createRenderbuffer();
        if (this.renderbuffer === null) {
            throw new Error("Failed to create a WebGL renderbuffer!");
        }
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }
    bind() {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }
    setRenderTarget() {
        if (this.framebuffer === null)
            return;
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    }
    cloneToBitmap(target) {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, target.texture);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this.width, this.height, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    dispose() {
        const gl = this.gl;
        if (this.renderbuffer !== null) {
            gl.deleteRenderbuffer(this.renderbuffer);
        }
        if (this.framebuffer !== null) {
            gl.deleteFramebuffer(this.framebuffer);
        }
        if (this.texture !== null) {
            gl.deleteTexture(this.texture);
        }
    }
}
