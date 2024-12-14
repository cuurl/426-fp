import * as CANNON from "cannon-es";
import * as THREE from "three";

import HolographicMaterial from "./HolographicMaterial";
import { randObstacleColor } from "./util";

export default class Obstacle {
    /* ---------------------------------------------------------------------------- */

    /**
     * Creates, renders, and physically instantiates a new default Obstacle object
     * at the provided position (if override provided).
     *
     * Assumes that this Obstacle is not being placed anywhere near the player, so
     * that isColliding is false, by default.
     */

    constructor(
        position = { x: 0, y: -13.5, z: 0 },
        player,
        audioListener,
        isCoin
    ) {
        // three.js-related initializations
        const geometry = new THREE.BoxGeometry(4, 4, 4);
        const material = new HolographicMaterial({
            fresnelAmount: 0.2,
            fresnelOpacity: 0.15,
            hologramBrightness: 1.7,
            scanlineSize: 6,
            signalSpeed: 2.3,
            hologramColor: randObstacleColor(),
            hologramOpacity: 0.9,
            blinkFresnelOnly: true,
            enableBlinking: true,
            side: THREE.FrontSide,
        });

        this.player = player;
        this.audioListener = audioListener;
        this.isCoin = isCoin;

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(position.x, position.y, position.z);

        // cannon.js-related initializations
        this.shape = new CANNON.Box(new CANNON.Vec3(2, 2, 2));
        this.body = new CANNON.Body({
            mass: 1,
            type: CANNON.BODY_TYPES.KINEMATIC,
            collisionFilterGroup: 4, // Enemy group (changed from 1)
            collisionFilterMask: 1 | 2,
        });

        this.body.addShape(this.shape);
        this.body.position.set(position.x, position.y, position.z);

        this.isColliding = false;
        this.shouldBeRemoved = false;

        // const loader = new FBXLoader();
        // loader.load('models/asteroid.fbx', (fbx) => {
        //     fbx.scale.set(0.01, 0.01, 0.01);
        //     fbx.position.copy(this.mesh.position);

        //     this.mesh.parent.add(fbx);
        //     this.mesh.parent.remove(this.mesh);
        //     this.mesh = fbx;
        // });
    }
    /* ---------------------------------------------------------------------------- */

    /**
     * Collision event handler. When called, updates this Obstacle's state fields to
     * reflect a player-to-obstacle collision with this Obstacle, in order to allow
     * for proper collision handling in ObstacleManager.
     *
     * @ run-time: if this was a spurious call (i.e., we're already aware of this
     *             obstacle colliding w/ the player), returns false; otherwise true.
     */

    handleCollision() {
        // const currentTime = Date.now();

        // if (currentTime - this.lastCollisionTime < this.collisionCooldown) {
        //     return false;
        // }

        // this.isColliding = true;
        // this.shouldBeRemoved = true;
        // this.body.type = CANNON.BODY_TYPES.STATIC; // freeze physics
        // this.body.collisionResponse = false; // disable further collisions
        // return true;

        if (!this.isColliding) {
            this.isColliding = true;
            this.shouldBeRemoved = true;
            this.body.collisionResponse = false; // disable further collisions

            this.player.deductHealth(this);

            if (this.player.health <= 0) {
                window.location.href = "./death.html";
            }

            return true;
        }

        return false;
    }

    /* ---------------------------------------------------------------------------- */
}
