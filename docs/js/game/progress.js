import { clamp } from "../math/utility.js";
import { Vector } from "../math/vector.js";
import { updateSpeedAxis } from "./utility.js";
import { VERSION } from "./version.js";
const INITIAL_MAP = "graveyard";
// No idea why these are here, not in "computeStats"
const BASE_HEALTH_UP = 2;
const BASE_BULLETS_UP = 3;
// No, not "truth" values, but a list of values that a true...
const booleanArrayToListOfTrueValues = (arr) => {
    const out = new Array();
    for (let i = 0; i < arr.length; ++i) {
        if (arr[i]) {
            out.push(i);
        }
    }
    return out;
};
const listOfTrueValuesToBooleanArray = (values) => {
    if (values.length == 0) {
        return [];
    }
    const len = Math.max(...values);
    const out = (new Array(len + 1)).fill(false);
    for (const v of values) {
        out[v] = true;
    }
    return out;
};
export const LOCAL_STORAGE_KEY = "the_end_of_dreams__savedata_";
export class Progress {
    constructor(fileIndex) {
        this.health = 10;
        this.maxHealth = 10;
        // Don't ask why these are here
        this.healthBarTarget = 1.0;
        this.healthBarSpeed = 0.0;
        this.healthBarPos = 1.0;
        this.bullets = 10;
        this.maxBullets = 10;
        this.bulletRestoreTime = 0.0;
        this.attackPower = 5;
        this.attackSpeedBonus = 0;
        this.projectilePower = 3;
        this.armor = 0;
        this.speedBonus = 0;
        this.recoverBonus = 0;
        this.money = 0;
        this.orbCount = 0;
        this.minibossDefeated = false;
        this.gameSaved = false;
        this.gameSavedSuccess = false;
        this.fileIndex = 0;
        this.areaName = INITIAL_MAP;
        this.hasPulledLever = (id) => this.leversPulled[id] ?? false;
        this.isDoorOpen = (id) => this.doorsOpened[id] ?? false;
        this.getHealth = () => this.health;
        this.getMaxHealth = () => this.maxHealth;
        this.getSpeedBonus = () => this.speedBonus;
        this.getAttackSpeedBonus = () => this.attackSpeedBonus;
        this.getMoney = () => this.money;
        this.getBulletCount = () => this.bullets;
        this.getMaxBulletCount = () => this.maxBullets;
        this.getOrbCount = () => this.orbCount;
        this.getAttackPower = () => this.attackPower;
        this.getProjectilePower = () => this.projectilePower;
        this.getChargeAttackPower = () => Math.ceil(this.attackPower * 1.5);
        this.getChargeProjectilePower = () => Math.ceil(this.projectilePower * 1.5);
        this.getDownAttackPower = () => this.attackPower + 2;
        this.getCheckpointPosition = () => this.checkpointPosition.clone();
        this.getHealthBarPos = () => this.healthBarPos;
        this.hasDefeatedMiniboss = () => this.minibossDefeated;
        this.wasGameSavingSuccessful = () => this.gameSavedSuccess;
        this.getAreaName = () => this.areaName;
        this.temporaryFlags = new Array();
        this.obtainedItems = (new Array(32)).fill(false);
        this.obtainedHealthUps = (new Array(8)).fill(false);
        this.obtainedAmmoUps = (new Array(8)).fill(false);
        this.obtainedDreamOrbs = (new Array(6)).fill(false);
        this.hintShown = (new Array(10)).fill(false);
        this.cutsceneWatched = (new Array(16)).fill(false);
        this.leversPulled = new Array();
        this.doorsOpened = new Array();
        this.checkpointPosition = new Vector();
        this.fileIndex = fileIndex;
        // TODO: Compute attack power etc. from the list of
        // items.
        this.computeStats();
    }
    generateSavefileJSON() {
        const output = {};
        const date = new Date();
        const dateString = String(date.getMonth() + 1).padStart(2, "0") + "/" +
            String(date.getDate()).padStart(2, "0") + "/" +
            String(date.getFullYear());
        output["date"] = dateString;
        output["version"] = VERSION;
        // TODO: Later can be deduced/computed from the item list
        // output["maxHealth"] = this.maxHealth;
        // output["maxBullets"] = this.maxBullets;
        output["items"] = booleanArrayToListOfTrueValues(this.obtainedItems);
        output["healthups"] = booleanArrayToListOfTrueValues(this.obtainedHealthUps);
        output["ammoups"] = booleanArrayToListOfTrueValues(this.obtainedAmmoUps);
        output["dreamorbs"] = booleanArrayToListOfTrueValues(this.obtainedDreamOrbs);
        output["hints"] = booleanArrayToListOfTrueValues(this.hintShown);
        output["cutscenes"] = booleanArrayToListOfTrueValues(this.cutsceneWatched);
        output["levers"] = booleanArrayToListOfTrueValues(this.leversPulled);
        output["doors"] = booleanArrayToListOfTrueValues(this.doorsOpened);
        output["miniboss"] = String(this.minibossDefeated);
        output["checkpoint"] = {
            "x": this.checkpointPosition.x,
            "y": this.checkpointPosition.y
        };
        output["money"] = this.money;
        output["area"] = this.areaName;
        return output;
    }
    computeStats() {
        this.maxHealth = 10;
        this.maxBullets = 12;
        this.orbCount = 0;
        // TODO: Find out if there is a good way to check how many
        // times a certain value exists in an array, this looks a bit silly.
        // NOTE: array.filter(v => v).length should do the trick, but... eh.
        // Health
        for (const h of this.obtainedHealthUps) {
            if (h) {
                this.maxHealth += BASE_HEALTH_UP;
            }
        }
        if (this.obtainedItems[32 /* Item.ExtraHealth */]) {
            this.maxHealth += 2;
        }
        if (this.obtainedItems[38 /* Item.GoldenHeart */]) {
            this.maxHealth += 3;
        }
        // Correct the health bar
        this.healthBarPos = this.health / this.maxHealth;
        // Ammo
        for (const h of this.obtainedAmmoUps) {
            if (h) {
                this.maxBullets += BASE_BULLETS_UP;
            }
        }
        if (this.obtainedItems[33 /* Item.ExtraAmmo */]) {
            this.maxBullets += BASE_BULLETS_UP;
        }
        // Dream orbs
        for (const h of this.obtainedDreamOrbs) {
            if (h) {
                ++this.orbCount;
            }
        }
        // Attack power
        this.attackPower = 5;
        if (this.obtainedItems[34 /* Item.Bracelet */]) {
            this.attackPower += 1;
        }
        if (this.obtainedItems[13 /* Item.PowerfulSword */]) {
            this.attackPower += 3;
        }
        // Projectile power
        this.projectilePower = 3;
        if (this.obtainedItems[35 /* Item.Spectacles */]) {
            this.projectilePower += 1;
        }
        if (this.obtainedItems[14 /* Item.PowerfulGun */]) {
            this.projectilePower += 3;
        }
        // Damage reduction
        this.armor = 0;
        if (this.obtainedItems[21 /* Item.PlutoniumShield */]) {
            this.armor += 1;
        }
        // Health recovery bonus
        this.recoverBonus = 0;
        if (this.obtainedItems[37 /* Item.Potion */]) {
            this.recoverBonus += 1;
        }
        // Speed
        this.speedBonus = 0;
        if (this.obtainedItems[36 /* Item.RunningShoes */]) {
            this.speedBonus += 1;
        }
        if (this.obtainedItems[22 /* Item.RunningPants */]) {
            this.speedBonus += 1;
        }
        // Attack speed
        this.attackSpeedBonus = 0;
        if (this.obtainedItems[40 /* Item.Hourglass */]) {
            this.attackSpeedBonus += 1;
        }
    }
    resetStats() {
        this.health = this.maxHealth;
        this.bullets = this.maxBullets;
        this.healthBarTarget = 1;
        this.healthBarPos = 1;
    }
    obtainItem(itemID) {
        this.obtainedItems[itemID] = true;
        this.computeStats();
    }
    hasItem(itemID) {
        return this.obtainedItems[itemID] ?? false;
    }
    obtainDreamOrb(orbID) {
        this.obtainedDreamOrbs[orbID] = true;
        this.computeStats();
    }
    hasDreamOrb(orbID) {
        return this.obtainedDreamOrbs[orbID] ?? false;
    }
    markHintAsShown(id) {
        this.hintShown[id] = true;
    }
    hasShownHint(id) {
        return this.hintShown[id] ?? false;
    }
    markCutsceneWatched(id) {
        this.cutsceneWatched[id] = true;
    }
    hasWatchedCutscene(id) {
        return this.cutsceneWatched[id] ?? false;
    }
    markLeverPulled(id) {
        this.leversPulled[id] = true;
    }
    markDoorOpened(id) {
        this.doorsOpened[id] = true;
    }
    obtainHealthUp(id) {
        if (this.obtainedHealthUps[id]) {
            return;
        }
        this.obtainedHealthUps[id] = true;
        this.health += BASE_HEALTH_UP;
        this.computeStats();
    }
    hasObtainedHealthUp(id) {
        return this.obtainedHealthUps[id] ?? false;
    }
    obtainAmmoUp(id) {
        if (this.obtainedAmmoUps[id]) {
            return;
        }
        this.obtainedAmmoUps[id] = true;
        this.bullets += BASE_BULLETS_UP;
        this.computeStats();
    }
    hasObtainedAmmoUp(id) {
        return this.obtainedAmmoUps[id] ?? false;
    }
    updateHealth(change, ignoreBonus = false) {
        if (change < 0) {
            change = Math.min(-1, change + this.armor);
        }
        else if (change > 0 && !ignoreBonus) {
            change += this.recoverBonus * 2;
        }
        this.health = clamp(this.health + change, 0, this.maxHealth);
        this.healthBarTarget = this.health / this.maxHealth;
        this.healthBarSpeed = Math.abs(change / this.maxHealth) / 15.0;
        return change;
    }
    updateMoney(change) {
        this.money = Math.max(0, this.money + change);
    }
    getBulletRestoreTime() {
        if (!this.hasItem(39 /* Item.MagicBullets */)) {
            return null;
        }
        return this.bulletRestoreTime;
    }
    setBulletRestoreTime(time) {
        this.bulletRestoreTime = time;
    }
    updateBulletCount(change) {
        this.bullets = clamp(this.bullets + change, 0, this.maxBullets);
    }
    setCheckpointPosition(v) {
        this.checkpointPosition = v.clone();
    }
    markMinibossDefeated() {
        this.minibossDefeated = true;
    }
    reset() {
        this.health = this.maxHealth;
        this.bullets = this.maxBullets;
        this.healthBarPos = 1.0;
        this.healthBarTarget = 1.0;
    }
    update(event) {
        const BULLET_RESTORE_SPEED = 1.0 / 150.0;
        this.healthBarPos =
            clamp(updateSpeedAxis(this.healthBarPos, this.healthBarTarget, this.healthBarSpeed * event.tick), 0.0, 1.0);
        if (this.bullets >= this.maxBullets) {
            this.bulletRestoreTime = 1.0;
        }
        else if (this.hasItem(39 /* Item.MagicBullets */)) {
            this.bulletRestoreTime += BULLET_RESTORE_SPEED * event.tick;
            if (this.bulletRestoreTime >= 1.0) {
                ++this.bullets;
                if (this.bullets < this.maxBullets) {
                    this.bulletRestoreTime -= 1.0;
                }
            }
        }
    }
    save() {
        this.gameSaved = true;
        try {
            const content = JSON.stringify(this.generateSavefileJSON());
            const key = LOCAL_STORAGE_KEY + String(this.fileIndex);
            // Note: in the past Closure did not work with calls like "window.localStorage"
            // since the function name got optimized away, so I'm playing safe here.
            window["localStorage"]["setItem"](key, content);
            this.gameSavedSuccess = true;
        }
        catch (e) {
            console.error("Not-so-fatal error: failed to save the game: " + e["message"]);
            this.gameSavedSuccess = false;
            return false;
        }
        return true;
    }
    wasGameSaved() {
        const returnValue = this.gameSaved;
        this.gameSaved = false;
        return returnValue;
    }
    loadGame(fileIndex) {
        this.fileIndex = fileIndex;
        try {
            const str = window["localStorage"]["getItem"](LOCAL_STORAGE_KEY + String(this.fileIndex));
            if (str === null) {
                console.log(`Could not find a save file in the index ${this.fileIndex}, creating a new file.`);
                return false;
            }
            const json = JSON.parse(str) ?? {};
            // this.maxHealth = Number(json["maxHealth"] ?? this.maxHealth);
            // this.maxBullets = Number(json["maxBullets"] ?? this.maxBullets);
            this.obtainedItems = listOfTrueValuesToBooleanArray(json["items"] ?? []);
            this.obtainedHealthUps = listOfTrueValuesToBooleanArray(json["healthups"] ?? []);
            this.obtainedAmmoUps = listOfTrueValuesToBooleanArray(json["ammoups"] ?? []);
            this.obtainedDreamOrbs = listOfTrueValuesToBooleanArray(json["dreamorbs"] ?? []);
            this.hintShown = listOfTrueValuesToBooleanArray(json["hints"] ?? []);
            this.cutsceneWatched = listOfTrueValuesToBooleanArray(json["cutscenes"] ?? []);
            this.leversPulled = listOfTrueValuesToBooleanArray(json["levers"] ?? []);
            this.doorsOpened = listOfTrueValuesToBooleanArray(json["doors"] ?? []);
            this.money = Number(json["money"] ?? this.money);
            this.minibossDefeated = json["miniboss"] === "true";
            const checkpoint = json["checkpoint"];
            if (checkpoint !== undefined) {
                this.checkpointPosition.x = Number(checkpoint["x"] ?? this.checkpointPosition.x);
                this.checkpointPosition.y = Number(checkpoint["y"] ?? this.checkpointPosition.y);
            }
            this.areaName = json["area"] ?? this.areaName;
            this.computeStats();
            this.resetStats();
        }
        catch (e) {
            // TODO: Not a good way to return an error
            return false;
        }
        return true;
    }
    setAreaName(name) {
        this.areaName = name;
    }
    setTemporaryFlag(flag) {
        if (this.temporaryFlags.includes(flag)) {
            return;
        }
        this.temporaryFlags.push(flag);
    }
    hasTemporaryFlag(flag) {
        return this.temporaryFlags.includes(flag);
    }
}
