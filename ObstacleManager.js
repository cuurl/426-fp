import * as THREE from 'three';

import Obstacle from "./Obstacle";
import Enemy from "./Enemy";
import Coin from "./Coin";
import { FBXLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import { coinSound, painSound } from "./util";

import HolographicMaterial from "./HolographicMaterial";

export default class ObstacleManager {
    constructor(
        player,
        scene,
        world,
        trackRadius,
        obstacleMaterial,
        audioListener
    ) {
        this.player = player;
        this.scene = scene;
        this.world = world;
        this.trackRadius = trackRadius;
        this.obstacleMaterial = obstacleMaterial;
        this.obstacles = [];
        this.minSpacing = Math.PI / 4;
        this.maxObstacles = 2;
        this.lastSpawnAngle = 0;

        this.lastSpawnTime = 0;
        this.spawnCooldown = 2000; // 2 seconds between spawns
        this.globalCollisionCooldown = 0;
        this.globalCollisionCooldownDuration = 500; // 0.5 seconds global cooldown

        this.removalThreshold = Math.PI / 6;
        this.antiRemovalThreshold = 5 * this.removalThreshold;

        this.maxLateralOffset = 60; // make sure this is less than track radius
        this.minForwardAngle = Math.PI / 4; // objects can only spawn at least 45 degrees in front of player
        this.maxForwardAngle = Math.PI;

        // add obstacle type weights for spawning
        this.obstacleTypes = [
            { type: Obstacle, weight: 0.33 },
            { type: Enemy, weight: 0.33 },
            { type: Coin, weight: 0.33 },
        ];

        // for audio (enemy shooting sounds)
        this.audioListener = audioListener;

        this.obstacleModel = null;
        const obstacleLoader = new FBXLoader();
        obstacleLoader.load("models/asteroid.fbx", (fbx) => {
            this.obstacleModel = fbx;
        });

        this.shooterModel = null;
        const shooterLoader = new FBXLoader();
        shooterLoader.load("models/enemy.fbx", (fbx) => {
            this.shooterModel = fbx;
        });

        this.coinModel = null;
        const coinLoader = new GLTFLoader();
        coinLoader.load("models/coin.glb", (model) => {
            this.coinModel = model;
        });
    }

    // normalize angle to be between -PI and PI
    normalizeAngle(angle) {
        return Math.atan2(Math.sin(angle), Math.cos(angle));
    }

    // check if spawn attempt is too close to last spawn time
    canSpawnObstacle(currentTime) {
        return currentTime - this.lastSpawnTime >= this.spawnCooldown;
    }

    // get random lateral offset for object spawn
    getRandomOffset() {
        return (Math.random() - 0.5) * 2 * this.maxLateralOffset;
    }

    calculateSpawnPosition(angle) {
        // get base position on track
        const baseX = this.trackRadius * Math.cos(angle);
        const baseZ = this.trackRadius * Math.sin(angle);

        // calculate perpendicular direction for offset
        const perpX = -Math.sin(angle);
        const perpZ = Math.cos(angle);

        // get random offset
        const offset = this.getRandomOffset();

        // apply offset in perpendicular direction
        const finalX = baseX + perpX * offset;
        const finalZ = baseZ + perpZ * offset;

        return { x: finalX, y: -13.5, z: -finalZ };
    }

    // Helper method to select obstacle type based on weights
    selectObstacleType() {
        const totalWeight = this.obstacleTypes.reduce(
            (sum, type) => sum + type.weight,
            0
        );
        let random = Math.random() * totalWeight;

        for (const obstacleType of this.obstacleTypes) {
            if (random < obstacleType.weight) {
                return obstacleType.type;
            }
            random -= obstacleType.weight;
        }

        return Obstacle;
    }

    spawnObstacle() {
        const currentTime = Date.now();

        // check conditions for spawn
        if (
            this.obstacles.length >= this.maxObstacles ||
            !this.canSpawnObstacle(currentTime)
        ) {
            return;
        }

        // const angle = this.lastSpawnAngle + this.minSpacing;
        // calculate position of next object to be spawned relative to player
        const playerAngle = Math.atan2(
            -this.player.body.position.z,
            this.player.body.position.x
        );
        const offset =
            this.minForwardAngle +
            Math.random() * (this.maxForwardAngle - this.minForwardAngle);
        const spawnAngle = this.normalizeAngle(playerAngle + offset);
        const position = this.calculateSpawnPosition(spawnAngle);

        // Select and create obstacle type
        const ObstacleType = this.selectObstacleType();
        const obstacle = new ObstacleType(
            position,
            this.player,
            this.audioListener,
            false
        );
        obstacle.body.material = this.obstacleMaterial;
        //console.log(ObstacleType);

        obstacle.body.collisionFilterGroup = 4; // Same as enemies (changed from 1)
        obstacle.body.collisionFilterMask = 1 | 2;

        // const obstacle = new Obstacle(position);
        // obstacle.body.material = this.obstacleMaterial;

        // apply the appropriate model based on obstacle type
        if (obstacle instanceof Enemy && this.shooterModel) {
            obstacle.audioListener = this.audioListener;
            obstacle.isCoin = false;

            const model = this.shooterModel.clone();
            model.scale.set(0.003, 0.003, 0.003);
            model.position.copy(obstacle.mesh.position);

            for (const child of model.children) {
                child.material = new HolographicMaterial({
                    fresnelAmount: 0.2,
                    fresnelOpacity: 0.5,
                    hologramBrightness: 1.7,
                    scanlineSize: 6,
                    signalSpeed: 2.3,
                    hologramColor: "#FE0000",
                    hologramOpacity: 0.5,
                    blinkFresnelOnly: true,
                    enableBlinking: true,
                });
            }

            // replace the temporary mesh with the model
            obstacle.mesh = model;
        } else if (obstacle instanceof Coin && this.coinModel) {
            obstacle.isCoin = true;
            
            const model = this.coinModel.scene.clone();

            model.scale.set(0.25, 0.25, 0.25);
            model.position.copy(obstacle.mesh.position);

            for (const child of model.children) {
                child.material = new HolographicMaterial({
                    fresnelAmount: 0.2,
                    fresnelOpacity: 0.15,
                    hologramBrightness: 1.7,
                    scanlineSize: 6,
                    signalSpeed: 2.3,
                    hologramColor: "#FFD700",
                    hologramOpacity: 1,
                    blinkFresnelOnly: true,
                    enableBlinking: true,
                });
            }

            obstacle.mesh = model;
        } else if (obstacle instanceof Obstacle && this.obstacleModel) {
            obstacle.isCoin = false;

            const model = this.obstacleModel.clone();
            model.scale.set(0.02, 0.02, 0.02);
            model.position.copy(obstacle.mesh.position);

            for (const child of model.children) {
                child.material = new HolographicMaterial({
                    fresnelAmount: 0.2,
                    fresnelOpacity: 0.15,
                    hologramBrightness: 1.7,
                    scanlineSize: 6,
                    signalSpeed: 2.3,
                    hologramColor: "#8B8589",
                    hologramOpacity: 0.9,
                    blinkFresnelOnly: true,
                    enableBlinking: true,
                });
            }

            // replace the temporary mesh with the model
            obstacle.mesh = model;
        }

        // collision handling
        obstacle.body.addEventListener("collide", (event) => {
            const currentTime = Date.now();

            // prevents collision spam
            if (currentTime < this.globalCollisionCooldown) {
                return;
            }

            if (
                !obstacle.isColliding &&
                obstacle.handleCollision(currentTime)
            ) {
                console.log(obstacle);
                if (obstacle instanceof Coin) {
                    console.log("COLLIDED INTO COIN");
                } else {
                    painSound();
                }
                //console.log("COLLISION DETECTED");
                this.globalCollisionCooldown =
                    currentTime + this.globalCollisionCooldownDuration;
            }
        });

        // calculate and store the base angle for this obstacle
        const baseAngle = Math.atan2(-position.z, position.x);

        this.scene.add(obstacle.mesh);
        this.world.addBody(obstacle.body);
        this.obstacles.push({ obstacle: obstacle, angle: baseAngle });

        // update last spawn information
        this.lastSpawnAngle = spawnAngle;
        this.lastSpawnTime = currentTime;

        /*console.log(
            "SPAWNED OBSTACLE: x: " +
                position.x +
                " z: " +
                position.z
        );*/
    }

    update(playerAngle, playerPosition) {
        this.obstacles = this.obstacles.filter(({ obstacle, angle }) => {
            if (obstacle.shouldBeRemoved) {
                if (obstacle instanceof Enemy) {
                    painSound();
                    obstacle.cleanup(this.scene, this.world);
                } else if (obstacle instanceof Coin) {
                    coinSound();
                    this.player.coins++;

                    this.scene.remove(obstacle.mesh);
                    this.world.removeBody(obstacle.body);
                } else {
                    this.scene.remove(obstacle.mesh);
                    this.world.removeBody(obstacle.body);
                }
                return false;
            }

            // calculate relative angle between player and obstacle
            let relativeAngle = this.normalizeAngle(playerAngle - angle);

            // only remove if obstacle is behind player by more than threshold
            // and accounting for angle wrapping
            if (
                relativeAngle > this.removalThreshold &&
                relativeAngle < this.antiRemovalThreshold
            ) {
                //console.log("REMOVING OBSTACLE: ", relativeAngle);
                if (obstacle instanceof Enemy) {
                    obstacle.cleanup(this.scene, this.world);
                } else {
                    this.scene.remove(obstacle.mesh);
                    this.world.removeBody(obstacle.body);
                }
                return false;
            }

            // update shooting obstacles
            if (obstacle instanceof Enemy) {
                obstacle.player = this.player;
                obstacle.update(playerPosition, this.scene, this.world, 1 / 60);
            }

            return true;
        });

        // Try to spawn new obstacles
        if (Math.random() < 0.1) {
            this.spawnObstacle();
        }
    }

    // remove all obstacles
    clear() {
        this.obstacles.forEach(({ obstacle }) => {
            if (obstacle instanceof Enemy) {
                obstacle.cleanup(this.scene, this.world);
            } else {
                this.scene.remove(obstacle.mesh);
                this.world.removeBody(obstacle.body);
            }
        });
        this.obstacles = [];
        this.lastSpawnAngle = 0;
        this.lastSpawnTime = 0;
        this.globalCollisionCooldown = 0;
    }
}
