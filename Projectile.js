import * as CANNON from "cannon-es";
import * as THREE from "three";

import HolographicMaterial from "./HolographicMaterial";

export default class Projectile {
    constructor(position, direction, fromPlayer) {
        const geometry = new THREE.SphereGeometry(0.5);
        const material = new HolographicMaterial({
            fresnelAmount: 0.2,
            fresnelOpacity: 0.15,
            hologramBrightness: 1.7,
            scanlineSize: 6,
            signalSpeed: 2.3,
            hologramColor: fromPlayer ? "#FDEE00" : "#FF0000", 
            hologramOpacity: 1,
            blinkFresnelOnly: true,
            enableBlinking: true,
            side: THREE.FrontSide,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);

        this.shape = new CANNON.Sphere(0.5);
        this.body = new CANNON.Body({
            mass: 0.1,
            type: fromPlayer ? CANNON.BODY_TYPES.DYNAMIC : CANNON.BODY_TYPES.KINEMATIC,
            collisionFilterGroup: fromPlayer ? 2 : 8,  // Group 2 for player projectiles, 8 for enemy
            collisionFilterMask: fromPlayer ? 4 : 1    // Player projectiles hit enemies(4), Enemy projectiles hit player(1)
        });
        this.body.addShape(this.shape);
        this.body.position.copy(position);
        
        const speed = 50;
        this.body.velocity.set(
            direction.x * speed,
            direction.y * speed,
            direction.z * speed
        );

        this.createdAt = Date.now();
        this.lifespan = 2500;
        this.hasHitEnemy = false;

        //console.log("Player projectile group:", this.body.collisionFilterGroup);
        //console.log("Collision mask:", this.body.collisionFilterMask);
    }

    // checks lifespan of projectile 
    shouldRemove() {
        return Date.now() - this.createdAt > this.lifespan;
    }
}