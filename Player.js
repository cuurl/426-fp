import * as CANNON from "cannon-es";
import * as THREE from "three";

import randRanged from "./util";

export default class Player {
    /* ---------------------------------------------------------------------------- */

    /**
     * Creates, renders, and physically instantiates the Player in the provided scene.
     */

    constructor(scene) {
        // three.js-related initializations
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({
            color: 0x156289,
            emissive: 0x072534,
        });

        this.mesh = new THREE.Mesh(geometry, material);

        // adding scene to args allows one less THREE step in BaseScene =)
        scene.add(this.mesh);

        // cannon.js-related initializations
        this.shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
        this.body = new CANNON.Body({
            mass: 1,
            type: CANNON.BODY_TYPES.DYNAMIC
        });

        this.body.addShape(this.shape);
    }
    /* ---------------------------------------------------------------------------- */

    // Returns the player's position in world coordinates.
    worldPosition() {
        return this.mesh.position;
    }

    /* ---------------------------------------------------------------------------- */
}
