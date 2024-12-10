import Obstacle from "./Obstacle";
import Enemy from "./Enemy";

export default class ObstacleManager {
    constructor(player, scene, world, trackRadius, obstacleMaterial) {
        this.player = player;
        this.scene = scene;
        this.world = world;
        this.trackRadius = trackRadius;
        this.obstacleMaterial = obstacleMaterial;
        this.obstacles = [];
        this.minSpacing = Math.PI / 4;
        this.maxObstacles = 8;
        this.lastSpawnAngle = 0;

        this.lastSpawnTime = 0;
        this.spawnCooldown = 2000; // 2 seconds between spawns
        this.globalCollisionCooldown = 0;
        this.globalCollisionCooldownDuration = 500; // 0.5 seconds global cooldown

        this.removalThreshold = Math.PI / 6;

        this.maxLateralOffset = 60; // make sure this is less than track radius
        this.minForwardAngle = Math.PI / 4; // objects can only spawn at least 45 degrees in front of player
        this.maxForwardAngle = Math.PI

        // Add obstacle type weights for spawning
        this.obstacleTypes = [
            { type: Obstacle, weight: 0.8 },
            { type: Enemy, weight: 0.2 }
        ];
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

        return { x: finalX, y: -13.9, z: -finalZ };
    }

    // Helper method to select obstacle type based on weights
    selectObstacleType() {
        const totalWeight = this.obstacleTypes.reduce((sum, type) => sum + type.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const obstacleType of this.obstacleTypes) {
            if (random < obstacleType.weight) {
                return obstacleType.type;
            }
            random -= obstacleType.weight;
        }
        
        return Obstacle; // Default fallback
    }

    spawnObstacle() {
        const currentTime = Date.now();
        
        // check conditions for spawn
        if (this.obstacles.length >= this.maxObstacles || !this.canSpawnObstacle(currentTime)) {
            return;
        }

        // const angle = this.lastSpawnAngle + this.minSpacing;
        // calculate position of next object to be spawned relative to player
        const playerAngle = Math.atan2(-this.player.body.position.z, this.player.body.position.x);
        const offset = this.minForwardAngle + Math.random() * (this.maxForwardAngle - this.minForwardAngle);
        const spawnAngle = this.normalizeAngle(playerAngle + offset);
        const position = this.calculateSpawnPosition(spawnAngle);

        // Select and create obstacle type
        const ObstacleType = this.selectObstacleType();
        const obstacle = new ObstacleType(position);
        obstacle.body.material = this.obstacleMaterial;
        
        // const obstacle = new Obstacle(position);
        // obstacle.body.material = this.obstacleMaterial;

        // collision handling
        obstacle.body.addEventListener("collide", (event) => {
            const currentTime = Date.now();
            
            // prevents collision spam
            if (currentTime < this.globalCollisionCooldown) {
                return;
            }

            if (!obstacle.isColliding && obstacle.handleCollision(currentTime)) {
                console.log("Collision detected! Removing obstacle...");
                this.globalCollisionCooldown = currentTime + this.globalCollisionCooldownDuration;
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

        console.log("Spawned obstacle at position: x: " + position.x + " z: " + position.z);
    }

    update(playerAngle, playerPosition) {
        this.obstacles = this.obstacles.filter(({obstacle, angle}) => {
            if (obstacle.shouldBeRemoved) {
                if (obstacle instanceof Enemy) {
                    obstacle.cleanup(this.scene, this.world);
                } else {
                    this.scene.remove(obstacle.mesh);
                    this.world.removeBody(obstacle.body);
                }
                return false;
            }

            // Calculate relative angle between player and obstacle
            let relativeAngle = this.normalizeAngle(playerAngle - angle);
            
            // Only remove if obstacle is behind player by more than threshold
            // and accounting for angle wrapping
            if (relativeAngle > this.removalThreshold) {
                console.log("Removing obstacle at angle:", relativeAngle);
                if (obstacle instanceof Enemy) {
                    obstacle.cleanup(this.scene, this.world);
                } else {
                    this.scene.remove(obstacle.mesh);
                    this.world.removeBody(obstacle.body);
                }
                return false;
            }

            // Update shooting obstacles
            if (obstacle instanceof Enemy) {
                obstacle.update(playerPosition, this.scene, this.world, 1/60);
            }

            return true;
        });

        // Try to spawn new obstacles
        if (Math.random() < 0.10) {
            this.spawnObstacle();
        }
    }

    // remove all obstacles
    clear() {
        this.obstacles.forEach(({obstacle}) => {
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