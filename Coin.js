import Obstacle from "./Obstacle";

/*
*   Class for coin objects
*/

export default class Coin extends Obstacle {
    constructor(position = { x: 0, y: -13.5, z: 0 }, player) {
        super(position, player, true);

        this.isCoin = true;

    }

}