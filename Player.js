import * as CANNON from "cannon-es";
import * as THREE from "three";

import Projectile from "./Projectile";

import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

import randRanged, { PLAYER_MODELS, PLAYER_MODELS_F_NAME_PREFIX } from "./util";
import { DEFAULT_PLAYER_MODEL_INDEX } from "./util";

import HolographicMaterial from "./HolographicMaterial";

export default class Player {
    currentModelIndex = DEFAULT_PLAYER_MODEL_INDEX;
    possibleModels = PLAYER_MODELS;

    /* ---------------------------------------------------------------------------- */

    /**
     * Creates, renders, and physically instantiates the Player in the provided scene.
     */

    constructor(scene) {
        this.loader = new FBXLoader();

        this.initialMeshScale = new THREE.Vector3(1, 1, 1);
        this.initialMeshScaleFactor = 0.01;
        
        this.meshScale = new THREE.Vector3(1, 1, 1);
        this.meshScaleFactor = 0.01;

        const modelFilename = this.possibleModels[this.currentModelIndex];
        const modelPath = `${PLAYER_MODELS_F_NAME_PREFIX}${modelFilename}`;

        this.loader.load(
            modelPath,
            (modelMesh) => {
                modelMesh.scale.copy(this.initialMeshScale.clone().multiplyScalar(this.initialMeshScaleFactor));

                this.mesh = modelMesh;
                for (const child of this.mesh.children) {
                    child.material = new HolographicMaterial({
                        fresnelAmount: 0.2,
                        fresnelOpacity: 0.15,
                        hologramBrightness: 1.7,
                        scanlineSize: 6,
                        signalSpeed: 2.3,
                        hologramColor: "#66FF00",
                        hologramOpacity: 0.05,
                        blinkFresnelOnly: true,
                        enableBlinking: true,
                        side: THREE.FrontSide,
                    });
                }

                scene.add(this.mesh);

                console.log(this.mesh);
            },

            undefined,

            (err) => {
                console.log(err);
            }
        );

        // cannon.js-related initializations
        this.shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
        this.body = new CANNON.Body({
            mass: 1,
            type: CANNON.BODY_TYPES.DYNAMIC,
            collisionFilterGroup: 1,  // Player group
            collisionFilterMask: 4 | 8
        });

        this.body.addShape(this.shape);
        this.projectiles = [];
        this.scene = scene;
        this.world = null;
        this.forwardVector = null;
    }
    /* ---------------------------------------------------------------------------- */

    /**
     * Loads, initializes, and properly scales the desired player model, where player
     * model choice is designated by Player.currentModelIndex.
     */

    chooseModel(scene) {
        // if there was already a player model b4 changing, get rid of
        if (this.mesh) {
            scene.remove(this.mesh);
        }

        const modelFilename = this.possibleModels[this.currentModelIndex];
        const modelPath = `${PLAYER_MODELS_F_NAME_PREFIX}${modelFilename}`;

        this.loader.load(modelPath, (modelMesh) => {
            modelMesh.scale.set(this.initialMeshScale.clone().multiplyScalar(this.initialMeshScaleFactor));
            scene.add(modelMesh);

            this.mesh = modelMesh;
        });
    }

    /* ---------------------------------------------------------------------------- */

    // Returns the player's position in world coordinates.
    worldPosition() {
        return this.mesh.position;
    }

    /* ---------------------------------------------------------------------------- */
    shoot() {

        const projectilePosition = new THREE.Vector3().copy(this.mesh.position);

        // const yOffset = 3
        // const temp = projectilePosition.y;
        // projectilePosition.y = temp + yOffset;
        
        const projectile = new Projectile(projectilePosition, this.forwardVector, true);

        projectile.body.addEventListener("collide", (event) => {
            console.log("CASDONWQE:");
        });

        this.scene.add(projectile.mesh);
        this.world.addBody(projectile.body);
        this.projectiles.push(projectile);        
    }

    updateProjectiles() {
        this.projectiles = this.projectiles.filter(projectile => {
            if (projectile.shouldRemove()) {
                this.scene.remove(projectile.mesh);
                this.world.removeBody(projectile.body);
                return false;
            }

            projectile.mesh.position.copy(projectile.body.position);
            projectile.mesh.quaternion.copy(projectile.body.quaternion);
            return true;
        });
    }

    displayVectors() {
        const xVector = new THREE.Vector3(1, 0, 0);
        const yVector = new THREE.Vector3(0, 1, 0);
        const zVector = new THREE.Vector3(0, 0, 1);

        const origin = new THREE.Vector3(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z);

        const xArrowHelper = new THREE.ArrowHelper(xVector, origin, 10, 0xff0000);
        const yArrowHelper = new THREE.ArrowHelper(yVector, origin, 10, 0xffff00);
        const zArrowHelper = new THREE.ArrowHelper(zVector, origin, 10, 0xffffff);

        this.scene.add(xArrowHelper);
        this.scene.add(yArrowHelper);
        this.scene.add(zArrowHelper);
    }

    displayWorld() {
        console.log(this.world);
    }
}
