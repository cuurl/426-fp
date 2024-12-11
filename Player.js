import * as CANNON from "cannon-es";
import * as THREE from "three";

import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

import randRanged, { PLAYER_MODELS, PLAYER_MODELS_F_NAME_PREFIX } from "./util";
import { DEFAULT_PLAYER_MODEL_INDEX } from "./util";

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
                scene.add(modelMesh);

                this.mesh = modelMesh;
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
        });

        this.body.addShape(this.shape);
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
}
