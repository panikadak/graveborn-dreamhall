import { Program } from "./core/program.js";
import { WebGLRenderer } from "./gfx/webgl/renderer.js";
import { Game } from "./game/game.js";
import { TitleScreen } from "./game/titlescreen.js";
import { Intro } from "./game/intro.js";
import { Ending } from "./game/ending.js";
import { Credits } from "./game/credits.js";
import { SETTINGS_LOCAL_STORAGE_KEY } from "./game/settings.js";
import { clamp } from "./math/utility.js";
const loadSetting = (event) => {
    try {
        const str = window["localStorage"]["getItem"](SETTINGS_LOCAL_STORAGE_KEY);
        if (str === null) {
            return;
        }
        const json = JSON.parse(str) ?? {};
        const musicVolume = clamp(Number(json["musicvolume"]), 0, 100);
        const soundVolume = clamp(Number(json["soundvolume"]), 0, 100);
        if (window["nw"] !== undefined && json["fullscreen"] === "true") {
            window["nw"]?.["Window"]?.["get"]?.()?.["toggleFullscreen"]?.();
        }
        event.audio.setMusicVolume(musicVolume);
        event.audio.setSoundVolume(soundVolume);
    }
    catch (e) {
        console.error("Not-so-fatal error: failed to load settings: " + e["message"]);
    }
};
const initialEvent = (event) => {
    event.assets.parseIndexFile("assets/index.json");
    // TODO: Read from JSON so I can change these without having
    // to recompile each time.
    event.input.addAction("jump", ["Space", "KeyZ", "KeyJ"], [0]);
    event.input.addAction("attack", ["ControlLeft", "ControlRight", "KeyX", "KeyK"], [2, 3], [0]);
    event.input.addAction("shoot", ["ShiftLeft", "ShiftRight", "KeyC", "KeyL"], [1], [2]);
    event.input.addAction("pause", ["Enter", "Escape"], [7, 9]);
    event.input.addAction("back", ["Escape"], [1, 6, 8], undefined, false); // We do not want to prevent escape!
    event.input.addAction("back2", ["Backspace"]);
    event.input.addAction("select", ["Enter", "Space", "KeyZ", "KeyJ"], [0, 7, 9], [0]);
    event.input.addAction("start", ["Enter", "Space", "KeyZ", "KeyJ"], [0, 7, 9], [0]);
    event.audio.setMusicVolume(60);
    event.audio.setSoundVolume(60);
    loadSetting(event);
};
const onloadEvent = (event) => {
    const loc = event.assets.getDocument("en-us");
    if (loc !== undefined) {
        event.addLocalizationJSON("en-us", loc);
        event.setActiveLocalization("en-us");
    }
    event.scenes.addScene("intro", new Intro(event), true);
    event.scenes.addScene("title", new TitleScreen(event), false);
    event.scenes.addScene("game", new Game(event), false);
    event.scenes.addScene("ending", new Ending(event), false);
    event.scenes.addScene("credits", new Credits(event), false);
};
const printError = (e) => {
    console.log(e["stack"]);
    document.getElementById("base_div")?.remove();
    const textOut = document.createElement("b");
    textOut.setAttribute("style", "color: rgb(224,73,73); font-size: 16px");
    textOut.innerText = "Fatal error:\n\n " + e["stack"];
    document.body.appendChild(textOut);
};
function waitForInitialEvent() {
    return new Promise((resolve) => {
        window.addEventListener("keydown", (e) => {
            e.preventDefault();
            document.getElementById("div_initialize")?.remove();
            const ctx = new AudioContext();
            resolve(ctx);
        }, { once: true });
    });
}
if (window["nw"] !== undefined) {
    document.body.style.setProperty("cursor", "none");
    window.onload = () => {
        const ctx = new AudioContext();
        document.getElementById("div_initialize")?.remove();
        try {
            (new Program(ctx, WebGLRenderer, 256, 192, false, true, false, 576, 192)).run(initialEvent, onloadEvent, printError);
        }
        catch (e) {
            printError(e);
        }
    };
}
else {
    window.onload = () => (async () => {
        document.getElementById("init_text").innerText = "Press Any Key to Start";
        const ctx = await waitForInitialEvent();
        try {
            (new Program(ctx, WebGLRenderer, 256, 192, false, true, false, 576, 192)).run(initialEvent, onloadEvent, printError);
        }
        catch (e) {
            printError(e);
        }
    })();
}
