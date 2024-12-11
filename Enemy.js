import * as CANNON from "cannon-es";
import * as THREE from "three";
import Obstacle from "./Obstacle";

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
// import { threeToCannon, ShapeType } from 'three-to-cannon';

const mesh = await new FBXLoader().loadAsync('models/enemy.fbx');

class Projectile {
    constructor(position, direction) {
        const geometry = new THREE.SphereGeometry(0.5);
        const material = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            emissive: 0x332200,
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);

        this.shape = new CANNON.Sphere(0.5);
        this.body = new CANNON.Body({
            mass: 0.1,
            type: CANNON.BODY_TYPES.KINEMATIC,
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
        this.lifespan = 5000;
    }

    // checks lifespan of projectile 
    shouldRemove() {
        return Date.now() - this.createdAt > this.lifespan;
    }
}

export default class Enemy extends Obstacle {
    constructor(position = { x: 0, y: -13.5, z: 0 }) {
        // call parent constructor first
        super(position);

        // initialize shooting-specific properties
        this.projectiles = [];
        this.lastShotTime = 0;
        this.shootingCooldown = 2000;
        this.shootingRange = 100;
        
        // store initial position for oscillation
        this.basePosition = {
            x: position.x,
            y: position.y,
            z: position.z
        };
        // this.movementRadius = 5;
        // this.movementSpeed = 1;
        // this.movementOffset = Math.random() * Math.PI * 2;
        // new lateral movement properties
        this.movementDistance = 30; // maximum distance to move left/right
        this.movementSpeed = 5; // speed of movement
        this.movementDirection = 1; // 1 for right, -1 for left
        this.currentOffset = 0; // current lateral offset from base position

        this.mesh.material.color.setHex(0xff6600);
    }

    // checks shot cooldown
    canShoot() {
        return Date.now() - this.lastShotTime >= this.shootingCooldown;
    }

    // normalize angle to be between -PI and PI
    normalizeAngle(angle) {
        return Math.atan2(Math.sin(angle), Math.cos(angle));
    }

    // checks if enemy obstacle is in front of player, return false as soon as player passes its position
    isFrontOfPlayer(playerPosition) {
        // calculate angles of player and enemy relative to center
        const playerAngle = Math.atan2(-playerPosition.z, playerPosition.x);
        const enemyAngle = Math.atan2(-this.mesh.position.z, this.mesh.position.x);

        let angleDiff = this.normalizeAngle(enemyAngle - playerAngle);

        return angleDiff >= 0;
    }

    update(playerPosition, scene, world, deltaTime) {
        // skip if already destroyed
        if (this.isColliding || this.shouldBeRemoved) return;

        // update lateral movement
        this.currentOffset += this.movementDirection * this.movementSpeed * deltaTime;

        // change direction when reaching movement limits
        if (Math.abs(this.currentOffset) >= this.movementDistance) {
            this.movementDirection *= -1;
            this.currentOffset = Math.sign(this.currentOffset) * this.movementDistance;
        }

        // calculate perpendicular direction for lateral movement
        const angle = Math.atan2(-this.basePosition.z, this.basePosition.x);
        const perpX = -Math.sin(angle);
        const perpZ = Math.cos(angle);

        // update position with lateral movement
        const newX = this.basePosition.x + perpX * this.currentOffset;
        const newZ = this.basePosition.z + perpZ * this.currentOffset;
        
        this.mesh.position.set(newX, this.basePosition.y, newZ);
        this.body.position.set(newX, this.basePosition.y, newZ);

        // check if should shoot
        if (this.isFrontOfPlayer(playerPosition)) {
            const toPlayer = new THREE.Vector3(
                playerPosition.x - this.mesh.position.x,
                playerPosition.y - this.mesh.position.y,
                playerPosition.z - this.mesh.position.z
            );

            if (toPlayer.length() <= this.shootingRange && this.canShoot()) {
                this.shoot(toPlayer.normalize(), scene, world);
            }
        }

        this.updateProjectiles(scene, world);
    }

    // creates new projectile 
    shoot(direction, scene, world) {
        const projectilePosition = new THREE.Vector3(
            this.mesh.position.x,
            this.mesh.position.y,
            this.mesh.position.z
        );

        const projectile = new Projectile(projectilePosition, direction);
        scene.add(projectile.mesh);
        world.addBody(projectile.body);
        this.projectiles.push(projectile);
        this.lastShotTime = Date.now();
    }

    updateProjectiles(scene, world) {
        this.projectiles = this.projectiles.filter(projectile => {
            if (projectile.shouldRemove()) {
                scene.remove(projectile.mesh);
                world.removeBody(projectile.body);
                return false;
            }

            projectile.mesh.position.copy(projectile.body.position);
            projectile.mesh.quaternion.copy(projectile.body.quaternion);
            return true;
        });
    }

    // remove all projectiles associated with enemy when removed
    cleanup(scene, world) {
        this.projectiles.forEach(projectile => {
            scene.remove(projectile.mesh);
            world.removeBody(projectile.body);
        });
        this.projectiles = [];

        scene.remove(this.mesh);
        world.removeBody(this.body);
    }

    // override parent's handleCollision to use our own collision logic
    handleCollision() {
        return false;
    }
}