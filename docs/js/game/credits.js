const ITEM_OFFSET = 32;
const YOFF = 12;
const HEADER_EXTRA_OFF = 4;
const MUSIC_VOLUME = 0.50;
export class Credits {
    constructor(event) {
        this.phase = 0;
        this.pos = 0;
        this.totalHeight = 0;
        this.strTheEnd = "";
        this.creators = new Array();
        this.headers = event.localization?.getItem("credits_titles") ?? [];
        const creatorData = event.localization?.getItem("credits_names") ?? [];
        for (const c of creatorData) {
            this.creators.push(c.split("\n"));
        }
        this.strTheEnd = event.localization?.getItem("the_end")?.[0] ?? "null";
        this.computeTotalHeight();
    }
    computeTotalHeight() {
        this.totalHeight = YOFF;
        for (let i = 0; i < this.headers.length; ++i) {
            this.totalHeight += YOFF + HEADER_EXTRA_OFF;
            this.totalHeight += (this.creators[i].length - 1) * YOFF;
            if (i != this.headers.length - 1) {
                this.totalHeight += ITEM_OFFSET;
            }
        }
    }
    drawSecondPhase(canvas, assets) {
        const bmpLogo = assets.getBitmap("logo");
        const bmpFont = assets.getBitmap("font");
        if (bmpLogo !== undefined) {
            canvas.drawBitmap(bmpLogo, 0 /* Flip.None */, canvas.width / 2 - bmpLogo.width / 2, canvas.height / 2 - bmpLogo.height / 2 - 16);
            canvas.drawText(bmpFont, this.strTheEnd, canvas.width / 2, canvas.height / 2 + bmpLogo.height / 2 - 8, -1, 0, 2 /* Align.Center */);
        }
    }
    init(param, event) {
        event.transition.deactivate();
        event.audio.fadeInMusic(event.assets.getSample("titlescreen"), MUSIC_VOLUME, 1000.0);
        this.phase = 0;
    }
    update(event) {
        const APPEAR_SPEED = 0.5;
        if (event.transition.isActive()) {
            return;
        }
        if (this.phase == 1) {
            if (event.input.isAnyPressed()) {
                event.audio.stopMusic();
                event.audio.playSample(event.assets.getSample("select"), 0.40);
                event.transition.activate(true, 1 /* TransitionType.Fade */, 1.0 / 60.0, event, (event) => {
                    event.scenes.changeScene("title", event);
                    event.transition.activate(false, 2 /* TransitionType.Circle */, 1.0 / 30.0, event);
                });
            }
            return;
        }
        this.pos += APPEAR_SPEED * event.tick;
        if (this.pos >= this.totalHeight + event.screenHeight) {
            event.transition.activate(false, 1 /* TransitionType.Fade */, 1.0 / 30.0, event);
            this.phase = 1;
        }
    }
    redraw(canvas, assets) {
        const bmpFont = assets.getBitmap("font");
        canvas.clear(0, 0, 0);
        if (this.phase == 1) {
            // TODO: Also put the first phase inside a function.
            this.drawSecondPhase(canvas, assets);
            return;
        }
        const top = canvas.height - this.pos;
        let dy = top;
        for (let i = 0; i < this.headers.length; ++i) {
            const creators = this.creators[i];
            const header = this.headers[i];
            // Title
            canvas.setColor(255, 255, 109);
            canvas.drawText(bmpFont, header, canvas.width / 2, dy, -1, 0, 2 /* Align.Center */);
            dy += HEADER_EXTRA_OFF;
            // Names
            canvas.setColor();
            for (let j = 0; j < creators.length; ++j) {
                dy += YOFF;
                canvas.drawText(bmpFont, creators[j], canvas.width / 2, dy, -1, 0, 2 /* Align.Center */);
            }
            dy += ITEM_OFFSET;
        }
    }
    dispose() {
        return undefined;
    }
}
