export class MenuButton {
    constructor(text, callback = undefined, leftEvent = undefined, rightEvent = undefined) {
        this.callback = undefined;
        this.leftEvent = undefined;
        this.rightEvent = undefined;
        this.deactivated = false;
        this.getText = () => this.text;
        this.isDeactivated = () => this.deactivated;
        this.text = text;
        this.callback = callback;
        this.leftEvent = leftEvent;
        this.rightEvent = rightEvent;
    }
    evaluateCallback(event) {
        if (this.callback === undefined) {
            return false;
        }
        this.callback(event);
        return true;
    }
    changeCallback(cb) {
        this.callback = cb;
    }
    evaluateLeftCallback(event) {
        if (this.leftEvent === undefined) {
            return false;
        }
        this.leftEvent(event);
        return true;
    }
    evaluateRightCallback(event) {
        if (this.rightEvent === undefined) {
            return false;
        }
        this.rightEvent(event);
        return true;
    }
    clone() {
        return new MenuButton(this.text, this.callback, this.leftEvent, this.rightEvent);
    }
    changeText(newText) {
        this.text = newText;
    }
    toggleDeactivation(state) {
        this.deactivated = state;
    }
}
