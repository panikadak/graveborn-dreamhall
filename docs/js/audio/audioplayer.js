import { clamp } from "../math/utility.js";
import { AudioSample } from "./sample.js";
export class AudioPlayer {
    ;
    constructor(ctx, initialSoundVolume = 100, initialMusicVolume = 100) {
        this.musicTrack = undefined;
        this.soundVolume = 100;
        this.musicVolume = 100;
        this.getSoundVolume = () => this.soundVolume;
        this.getMusicVolume = () => this.musicVolume;
        this.isMusicPlaying = () => this.musicTrack !== undefined;
        this.ctx = ctx;
        this.soundVolume = initialSoundVolume;
        this.musicVolume = initialMusicVolume;
    }
    playSample(sample, volume = 1.0) {
        const EPS = 0.001;
        if (this.ctx === undefined || this.soundVolume == 0 ||
            volume * (this.soundVolume / 100) <= EPS) {
            return;
        }
        sample?.play(this.ctx, volume, this.soundVolume / 100.0, false, 0);
    }
    playMusic(sample, vol = 1.0) {
        if (sample === undefined) {
            return;
        }
        this.fadeInMusic(sample, vol);
    }
    fadeInMusic(sample, volume = 1.0, fadeTime) {
        if (this.ctx === undefined) {
            return;
        }
        // For some reason 0 fade time does not work
        fadeTime = Math.max(0.1, fadeTime);
        if (this.musicTrack !== undefined) {
            this.musicTrack.stop();
            this.musicTrack = undefined;
        }
        sample?.fadeIn(this.ctx, fadeTime === undefined ? volume : Math.min(volume, 0.01), volume, this.musicVolume / 100.0, true, 0, fadeTime ?? 0);
        this.musicTrack = sample;
    }
    pauseMusic() {
        if (this.ctx === undefined || this.musicTrack === undefined) {
            return;
        }
        this.musicTrack.pause(this.ctx);
    }
    resumeMusic(newVolume) {
        if (this.ctx === undefined || this.musicTrack === undefined) {
            return false;
        }
        this.musicTrack.resume(this.ctx, this.musicVolume / 100.0, newVolume);
        return true;
    }
    stopMusic() {
        this.musicTrack?.stop();
        this.musicTrack = undefined;
    }
    setSoundVolume(vol) {
        this.soundVolume = clamp(vol, 0, 100);
    }
    setMusicVolume(vol) {
        this.musicVolume = clamp(vol, 0, 100);
        this.musicTrack?.changeVolume(this.ctx, this.musicVolume / 100.0);
    }
    decodeSample(sampleData, callback) {
        if (this.ctx === undefined)
            return;
        this.ctx.decodeAudioData(sampleData, (data) => {
            // I know that this.ctx cannot be undefined at this point, but vscode apparently
            // does not, thus the type conversion
            callback(new AudioSample(this.ctx, data));
        });
    }
}
