import { TextBox } from "../ui/textbox.js";
import { ConfirmationBox } from "../ui/confirmationbox.js";
import { negMod } from "../math/utility.js";
import { drawUIBox } from "../ui/box.js";
import { MENU_ITEM_BASE_COLOR, MENU_ITEM_SELECTED_COLOR } from "../ui/menu.js";
import { drawHUD } from "./hud.js";
class ShopItem {
    constructor(name, description, price, itemID, iconID) {
        this.name = "";
        this.description = "";
        this.price = 0;
        this.itemID = 0;
        this.iconID = 0;
        this.obtained = false;
        this.name = name;
        this.description = description;
        this.price = price;
        this.itemID = itemID;
        this.iconID = iconID;
    }
}
export class Shop {
    constructor(event) {
        this.cursorPos = 0;
        this.active = false;
        this.handAnimation = 0;
        this.cancelText = "null";
        this.soldOutText = "null";
        this.buyEvent = undefined;
        this.isActive = () => this.active;
        this.items = new Array();
        this.message = new TextBox();
        this.confirmationMessage = new ConfirmationBox(event.localization?.getItem("yesno") ?? ["null", "null"], (event.localization?.getItem("purchase") ?? ["null"])[0], (event) => {
            this.message.addText(event.localization?.getItem("buyitem") ?? ["null"], [[this.items[this.cursorPos]?.name ?? "null"]]);
            this.message.activate(true);
            this.buyEvent?.(this.items[this.cursorPos]?.price ?? 0);
            this.items[this.cursorPos].obtained = true;
        }, (event) => {
            this.confirmationMessage.deactivate();
        });
        this.cancelText = (event.localization?.getItem("cancel") ?? ["null"])[0];
        this.soldOutText = (event.localization?.getItem("sold") ?? ["null"])[0];
    }
    prepareMessage(progress, event) {
        const price = this.items[this.cursorPos]?.price ?? 0;
        if (price > progress.getMoney()) {
            event.audio.playSample(event.assets.getSample("deny"), 0.70);
            this.message.addText(event.localization?.getItem("nomoney") ?? ["null"]);
            this.message.activate(true);
        }
        else {
            const price = this.items[this.cursorPos]?.price ?? 0;
            const priceString = `${price}${String.fromCharCode(3)}`;
            event.audio.playSample(event.assets.getSample("select"), 0.40);
            this.confirmationMessage.activate(1, [priceString]);
        }
    }
    checkObtainedItems(progress) {
        for (const i of this.items) {
            i.obtained = progress.hasItem(i.itemID);
        }
    }
    addItem(name, description, price, itemID, iconID) {
        this.items.push(new ShopItem(name, description, price, itemID, iconID));
    }
    update(progress, event) {
        const HAND_ANIMATION_SPEED = Math.PI * 2 / 60.0;
        if (!this.active) {
            return;
        }
        if (this.confirmationMessage.isActive()) {
            this.confirmationMessage.update(event);
            return;
        }
        if (this.message.isActive()) {
            this.message.update(event);
            return;
        }
        const oldPos = this.cursorPos;
        if (event.input.upPress()) {
            --this.cursorPos;
        }
        else if (event.input.downPress()) {
            ++this.cursorPos;
        }
        const buttonCount = this.items.length + 1;
        if (oldPos != this.cursorPos) {
            this.cursorPos = negMod(this.cursorPos, buttonCount);
            event.audio.playSample(event.assets.getSample("choose"), 0.50);
        }
        if (event.input.getAction("select") == 3 /* InputState.Pressed */) {
            if (this.cursorPos == buttonCount - 1) {
                event.audio.playSample(event.assets.getSample("select"), 0.40);
                this.deactivate();
                return;
            }
            if (this.items[this.cursorPos].obtained) {
                event.audio.playSample(event.assets.getSample("deny"), 0.70);
            }
            else {
                this.buyEvent = (amount) => {
                    const item = this.items[this.cursorPos];
                    progress.obtainItem(item.itemID);
                    progress.updateMoney(-amount);
                };
                this.prepareMessage(progress, event);
            }
        }
        if (event.input.getAction("back") == 3 /* InputState.Pressed */) {
            event.audio.playSample(event.assets.getSample("select"), 0.40);
            this.deactivate();
        }
        this.handAnimation = (this.handAnimation + HAND_ANIMATION_SPEED * event.tick) % (Math.PI * 2);
    }
    draw(canvas, assets, progress) {
        const BOX_WIDTH = 224;
        const DESCRIPTION_BOX_HEIGHT = 26;
        const ITEM_OFFSET = 12;
        const SIDE_OFFSET = 4;
        const HAND_OFFSET = 14;
        const SHIFT_Y = 16;
        const DARKEN_ALPHA = 0.50;
        if (!this.active) {
            return;
        }
        canvas.setColor(0, 0, 0, DARKEN_ALPHA);
        canvas.fillRect(0, 0, canvas.width, canvas.height);
        canvas.setColor();
        drawHUD(canvas, assets, progress);
        const width = BOX_WIDTH;
        const height = (this.items.length + 2) * ITEM_OFFSET;
        const dx = canvas.width / 2 - width / 2;
        const dy = canvas.height / 2 - height / 2 - SHIFT_Y;
        const yoff = ITEM_OFFSET / 2 + SIDE_OFFSET / 2;
        // Box, my UI is a box!
        drawUIBox(canvas, dx, dy, width, height);
        const font = assets.getBitmap("font");
        // Item names & prices
        for (let i = 0; i < this.items.length + 1; ++i) {
            // This is a beautiful line
            const buttonColor = (i == this.cursorPos ? MENU_ITEM_SELECTED_COLOR : MENU_ITEM_BASE_COLOR)[Number(this.items[i]?.obtained ?? 0)];
            canvas.setColor(...buttonColor);
            const lineY = dy + i * ITEM_OFFSET + yoff;
            // Item text
            const itemText = i == this.items.length ? this.cancelText : this.items[i].name;
            canvas.drawText(font, itemText, dx + HAND_OFFSET + SIDE_OFFSET, lineY);
            // Item price
            if (i != this.items.length) {
                const price = this.items[i].obtained ? this.soldOutText : `${this.items[i].price} `;
                canvas.drawText(font, price, dx + BOX_WIDTH, lineY, 0, 0, 1 /* Align.Right */);
                if (!this.items[i].obtained) {
                    // Coin symbol
                    canvas.setColor();
                    canvas.drawBitmap(font, 0 /* Flip.None */, dx + BOX_WIDTH - 14, lineY, 24, 0, 8, 8);
                }
            }
            // Hand
            if (i == this.cursorPos) {
                canvas.setColor(...MENU_ITEM_SELECTED_COLOR[0]);
                canvas.drawBitmap(font, 0 /* Flip.None */, dx + SIDE_OFFSET + Math.round(Math.sin(this.handAnimation)), lineY, 8, 0, 16, 8);
            }
        }
        // Item descriptions
        const bottomY = dy + height + 4;
        drawUIBox(canvas, dx, bottomY, BOX_WIDTH, DESCRIPTION_BOX_HEIGHT);
        if (this.cursorPos != this.items.length) {
            const item = this.items[this.cursorPos];
            canvas.drawText(font, item.description, dx + 28, bottomY + 4, 0, 2);
            // Item icon
            const bmpItemIcons = assets.getBitmap("item_icons");
            canvas.drawBitmap(bmpItemIcons, 0 /* Flip.None */, dx + 6, bottomY + 5, item.iconID * 16, 32, 16, 16);
        }
        // Messages
        if (this.confirmationMessage.isActive()) {
            canvas.setColor(0, 0, 0, DARKEN_ALPHA);
            canvas.fillRect(0, 0, canvas.width, canvas.height);
            canvas.setColor();
            this.confirmationMessage.draw(canvas, assets);
            return;
        }
        if (this.message.isActive()) {
            canvas.setColor(0, 0, 0, DARKEN_ALPHA);
            canvas.fillRect(0, 0, canvas.width, canvas.height);
            canvas.setColor();
            this.message.draw(canvas, assets);
            return;
        }
    }
    activate(progress) {
        this.checkObtainedItems(progress);
        this.cursorPos = 0;
        this.active = true;
    }
    deactivate() {
        this.active = false;
        this.confirmationMessage.deactivate();
        this.message.deactivate();
    }
}
