import * as CANNON from "cannon-es";
import * as THREE from "three";

import randRanged from "./util";

// makes mesh and body attributes public, so we can access them in BaseScene
// when adding the Player to the scene, but while avoiding extra bloat in
// its constructor
export default class Player {
    constructor() {
        // three.js-related initializations
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({
            color: 0x156289,
            emissive: 0x072534,
        });

        this.mesh = new THREE.Mesh(geometry, material);

        // cannon.js-related initializations
        this.shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
        this.body = new CANNON.Body({
            mass: 1,
            type: CANNON.BODY_TYPES.DYNAMIC
        });

        this.body.addShape(this.shape);
        /*this.body.angularVelocity.set(0, 10, 0);
        this.body.angularDamping = 0.5;*/

        this.moveLeft = false;
        this.moveRight = false;
        this.moveForward = false;
        this.moveBackward = false;
    }

    // Returns a random point on the player for debugging purposes.
    randomPoint() {
        const {lowerBound, upperBound} = this.body.aabb;

        const xMin = lowerBound.x,
            xMax = upperBound.x,
            yMin = lowerBound.y,
            yMax = upperBound.y,
            zMin = lowerBound.z,
            zMax = upperBound.z;

        // Select a random face of the cube
        const faceIndex = Math.floor(Math.random() * 6);
        let x, y, z;

        switch (faceIndex) {
            case 0: // Front face (z = zMax)
                x = randRanged(xMin, xMax);
                y = randRanged(yMin, yMax);
                z = zMax;
                break;
            case 1: // Back face (z = zMin)
                x = randRanged(xMin, xMax);
                y = randRanged(yMin, yMax);
                z = zMin;
                break;
            case 2: // Left face (x = xMin)
                x = xMin;
                y = randRanged(yMin, yMax);
                z = randRanged(zMin, zMax);
                break;
            case 3: // Right face (x = xMax)
                x = xMax;
                y = randRanged(yMin, yMax);
                z = randRanged(zMin, zMax);
                break;
            case 4: // Top face (y = yMax)
                x = randRanged(xMin, xMax);
                y = yMax;
                z = randRanged(zMin, zMax);
                break;
            case 5: // Bottom face (y = yMin)
                x = randRanged(xMin, xMax);
                y = yMin;
                z = randRanged(zMin, zMax);
                break;
            default:
                throw new Error("Invalid face index");
        }

        return new CANNON.Vec3(x, y, z);
    }
}
