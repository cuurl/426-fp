import * as CANNON from "cannon-es";
import * as THREE from "three";
import Obstacle from "./Obstacle";
import { GLTFLoader } from "three/examples/jsm/Addons.js";


export default class Coin extends Obstacle {
    constructor(position = { x: 0, y: -13.5, z: 0 }, player) {
        super(position, player);

        this.isCoin = true;

        //this.coinModel = null;
        //const coinLoader = new GLTFLoader();
        //coinLoader.load("models/coin.glb", (glb) => {
        //    this.coinModel = glb;
        //});

    }

}