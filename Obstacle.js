import * as CANNON from "cannon-es";
import * as THREE from "three";

export default class Obstacle {
    constructor(position = { x: 0, y: -13.9, z: 0 }) {
        // three.js-related initializations
        const geometry = new THREE.BoxGeometry(4, 4, 4);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0x072534,
            transparent: true,
            opacity: 1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(position.x, position.y, position.z);

        // cannon.js-related initializations
        this.shape = new CANNON.Box(new CANNON.Vec3(2, 2, 2));
        this.body = new CANNON.Body({
            mass: 1,
            type: CANNON.BODY_TYPES.STATIC
        });

        this.body.addShape(this.shape);
        this.body.position.set(position.x, position.y, position.z);

        this.isColliding = false;
        this.shouldBeRemoved = false;
    }

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
            this.body.type = CANNON.BODY_TYPES.STATIC; // freeze physics
            this.body.collisionResponse = false; // disable further collisions
            return true;
        }

        return false;
    }
}