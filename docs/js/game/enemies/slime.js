import { Enemy } from "./enemy.js";
export class Slime extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.sprite.setFrame(0, 1);
        this.health = 6;
        this.attackPower = 2;
        this.dropProbability = 0.33;
    }
    updateLogic(event) {
        const ANIMATION_SPEED = 8;
        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
    }
    playerEvent(player, event) {
        this.flip = player.getPosition().x > this.pos.x ? 1 /* Flip.Horizontal */ : 0 /* Flip.None */;
    }
}
