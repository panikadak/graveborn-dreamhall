import { clamp } from "../math/utility.js";
const MINIMUM_VOLUME = 0.001;
export class AudioSample {
    constructor(ctx, data) {
        this.activeBuffer = undefined; // TODO: undefined, maybe?
        this.startTime = 0.0;
        this.pauseTime = 0.0;
        this.baseVolume = 0.0;
        this.loop = false;
        this.data = data;
        this.gain = ctx.createGain();
    }
    play(ctx, volume = 1.0, volumeModifier = 1.0, loop = false, startTime = 0.0) {
        this.fadeIn(ctx, volume, volume, volumeModifier, loop, startTime, 0);
    }
    fadeIn(ctx, initial, end, volumeModifier, loop = false, startTime = 0, fadeTime = 0) {
        this.activeBuffer?.disconnect();
        this.activeBuffer = undefined;
        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = this.data;
        bufferSource.loop = loop;
        this.baseVolume = end;
        initial = clamp(initial * volumeModifier, MINIMUM_VOLUME, 1.0);
        end = clamp(end * volumeModifier, MINIMUM_VOLUME, 1.0);
        if (fadeTime > 0) {
            this.gain.gain.setValueAtTime(initial, startTime);
            this.gain.gain.exponentialRampToValueAtTime(end, startTime + fadeTime / 1000.0);
        }
        else {
            this.gain.gain.setValueAtTime(end, startTime);
        }
        this.startTime = ctx.currentTime - startTime;
        this.pauseTime = 0;
        this.loop = loop;
        bufferSource.connect(this.gain).connect(ctx.destination);
        bufferSource.start(0, startTime);
        this.activeBuffer = bufferSource;
    }
    stop() {
        this.activeBuffer?.disconnect();
        this.activeBuffer?.stop();
        this.activeBuffer = undefined;
    }
    pause(ctx) {
        if (this.activeBuffer === undefined) {
            return;
        }
        this.pauseTime = ctx.currentTime - this.startTime;
        this.stop();
    }
    resume(ctx, volumeModifier, newVolume) {
        this.play(ctx, newVolume ?? this.baseVolume, volumeModifier, this.loop, this.pauseTime);
    }
    changeVolume(ctx, newVolume) {
        if (this.activeBuffer === undefined) {
            return;
        }
        this.gain.gain.setValueAtTime(clamp(this.baseVolume * newVolume, MINIMUM_VOLUME, 1.0), ctx.currentTime);
    }
}
