import * as CANNON from "cannon-es";
import * as THREE from "three";

import { GUI } from "dat.gui";
import {
    NUM_LANE_SAMPLES,
    INITIAL_LANE_IDX,
    orientCameraTowardsPlayer,
    GRAVITY,
    TRACK_LANE_Y_POS,
    CAMERA_OFFSET,
    PLAYER_MODEL_PATH,
} from "./util";

import HolographicMaterial from "./HolographicMaterial";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPixelatedPass } from "three/addons/postprocessing/RenderPixelatedPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FBXLoader, OutputPass } from "three/examples/jsm/Addons.js";
import { DotScreenShader } from "three/examples/jsm/Addons.js";

import Player from "./Player";
import GroundTrack from "./GroundTrack";
import ObstacleManager from "./ObstacleManager";

let earthIsDeadMesh = await new FBXLoader().loadAsync(PLAYER_MODEL_PATH);

class DeathScene {
    /* ---------------------------------------------------------------------------- */
    // THREE.js related declarations
    renderer = null;
    scene = null;
    camera = null;
    lights = [];

    tanFOV = null; // see threeInit() - important for window resizing
    initialWindowHeight = null; // (same as above)

    laneObjects = []; // for varying lane colors later

    composer = null; // post-processing
    /* ---------------------------------------------------------------------------- */
    // cannon.js related declarations (+ general collision handling)
    world = null;
    obstacleManager = null;
    /* ---------------------------------------------------------------------------- */
    // core game logic declarations
    lanes = [];
    currentLane = null; // which lane is the player currently moving on?
    currentLaneIndex = INITIAL_LANE_IDX;
    t = 0.001;
    tStep = 0.001;
    score = 0;
    /* ---------------------------------------------------------------------------- */

    /**
     * Sets up required bindings, & initializes THREE.js + Cannon.js primitives,
     * event handlers for user input, and various utility tools.
     */

    constructor() {
        this.threeInit(); // threeJS-related initializations & lane logic setup

        this.player = new Player(this.scene, null);

        this.cannonInit(); // cannonJS-related initializations (for physics)
        this.inputInit(); // player event listeners

        // start w/ high y-pos, for initial animation
        this.camera.position.x = 80;
        this.camera.position.y = 10;
        this.camera.position.z = 80;

        this.camera.lookAt(earthIsDeadMesh.position);

        // https://stackoverflow.com/questions/4011793/this-is-undefined-in-javascript-class-methods
        this.animate = this.animate.bind(this);
    }

    /* ---------------------------------------------------------------------------- */

    /**
     * Performs standard THREE.js initializations - sets up the scene,
     * camera, renderer; and renders necessary primitives (lights, the
     * floor/track object, playable lanes, etc.).
     *
     * If visibleLanes is set to True, the lanes on the track that the
     * player can move between will be explicitly drawn out (mainly for
     * debugging purposes).
     */
    threeInit(visibleLanes = true) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            90,
            window.innerWidth / window.innerHeight,
            1,
            30000
        );

        document.body.appendChild(this.renderer.domElement);
        console.log(this.renderer.domElement);

        this.tanFOV = Math.tan(((Math.PI / 180) * this.camera.fov) / 2);
        this.initialWindowHeight = window.innerHeight;

        // handle fixing camera & renderer if client resizes their browser window
        // https://jsfiddle.net/Q4Jpu/ (from official THREE docs)
        window.addEventListener("resize", (e) => {
            this.camera.aspect = window.innerWidth / window.innerHeight;

            this.camera.fov =
                (360 / Math.PI) *
                Math.atan(
                    this.tanFOV *
                        (window.innerHeight / this.initialWindowHeight)
                );

            this.camera.updateProjectionMatrix();

            this.camera.lookAt(this.scene.position);

            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.render(this.scene, this.camera);
        });

        const hemiLight = new THREE.HemisphereLight(0xffffbb, 0xffffff, 2);

        this.lights.push(hemiLight);
        this.scene.add(hemiLight);
        this.scene.add(new THREE.HemisphereLightHelper(hemiLight));

        this.floor = new GroundTrack();
        this.scene.add(this.floor.basePlane);

        // lane setups
        (this.lanes = this.floor.validLanes), (this.laneObjects = []);
        for (const lanePath of this.lanes) {
            const points = lanePath.getPoints(NUM_LANE_SAMPLES);
            const laneGeometry = new THREE.BufferGeometry().setFromPoints(
                points
            );

            const laneMaterial = new HolographicMaterial({
                fresnelAmount: 0.9,
                fresnelOpacity: 0.9,
                hologramBrightness: 1.7,
                scanlineSize: 2,
                signalSpeed: 2.3,
                hologramColor: "#89CFF0",
                hologramOpacity: 0.6,
                enableBlinking: true,
            });

            const lane = new THREE.Line(laneGeometry, laneMaterial);

            lane.rotateX(-Math.PI / 2);
            lane.position.set(0, TRACK_LANE_Y_POS, 0);

            lane.visible = visibleLanes;

            this.scene.add(lane);
            this.laneObjects.push(lane);
        }

        for (const child of earthIsDeadMesh.children) {
            child.material = new HolographicMaterial({
                fresnelAmount: 0.2,
                fresnelOpacity: 0.15,
                hologramBrightness: 0.1,
                scanlineSize: 6,
                signalSpeed: 2.3,
                hologramColor: "#FE0000",
                hologramOpacity: 0.5,
                blinkFresnelOnly: true,
                enableBlinking: true,
                side: THREE.FrontSide,
            });
        }

        earthIsDeadMesh.position.set(0, -13.9, 0);
        earthIsDeadMesh.scale.set(0.1, 0.1, 0.1);
        earthIsDeadMesh.visible = true;
        earthIsDeadMesh.receiveShadow = true;
        this.scene.add(earthIsDeadMesh);

        // initially, player is placed on the middle lane
        this.currentLane = this.lanes[INITIAL_LANE_IDX];

        // post-processing
        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPixelatedPass(4, this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.8,
            0
        );

        const effect1 = new ShaderPass(DotScreenShader);
        effect1.uniforms["scale"].value = 4;
        this.composer.addPass(effect1);
        this.composer.addPass(renderPass);
        this.composer.addPass(bloomPass);
    }

    /* ---------------------------------------------------------------------------- */

    /**
     * Same as above, but for Cannon - sets up a World for adding rigid bodies,
     * adds rigid bodies for the primitives we've gotten ready to render to
     * the screen already, so that these objects can physically interact, and
     * intitializes an ObstacleManager to actively handle player-to-obstacle
     * collisions (w/ Cannon logic) in the background.
     */
    cannonInit() {
        // create World & add rigid bodies for applicable meshes
        this.world = new CANNON.World({ gravity: GRAVITY });

        this.world.addBody(this.floor.body);
        this.world.addBody(this.player.body);

        // player-to-obstacle collisions
        const playerMaterial = new CANNON.Material("player"),
            obstacleMaterial = new CANNON.Material("obstacle");
        const contactMaterial = new CANNON.ContactMaterial(
            playerMaterial,
            obstacleMaterial,
            {
                friction: 0.0,
                restitution: 0.3,
            }
        );

        this.world.addContactMaterial(contactMaterial); // mat -> material (for consistent naming scheme)
        this.player.body.material = playerMaterial;

        this.obstacleManager = new ObstacleManager(
            this.player,
            this.scene,
            this.world,
            this.currentLane.xRadius,
            obstacleMaterial
        );

        this.obstacleManager.spawnCooldown = 0;
        this.obstacleManager.minForwardAngle = 0;
        this.obstacleManager.maxForwardAngle = Math.PI * 2;
        this.obstacleManager.minSpacing = 0;
        this.obstacleManager.removalThreshold = Infinity;
        this.obstacleManager.maxObstacles = 500;
        this.obstacleManager.obstacleTypes[0].weight = 0.0;
        this.obstacleManager.obstacleTypes[1].weight = 1.0;
        this.obstacleManager.obstacleTypes[2].weight = 0.0;
    }

    /* ---------------------------------------------------------------------------- */

    /**
     * Sets up event listeners for allowing players to switch between lanes.
     */
    inputInit() {
        document.addEventListener("keydown", (event) => {
            switch (event.code) {
                case "Space":
                    document.location.replace("./index.html");
                    break;
            }
        });
    }

    /* ---------------------------------------------------------------------------- */

    /**
     * Updates core game simulation by a frame: advances the player's current
     * forward position w.r.t. the path that they are currently on; moves the
     * player to their desired path if they invoked a path change (via left/
     * right arrow key); re-orients both the player and the camera, and renders
     * the result as the next frame.
     */
    animate() {
        requestAnimationFrame(this.animate);

        this.player.mesh.visible = false;

        this.t += this.tStep;
        if (this.t >= 1) {
            this.t = 0.001;
        }

        this.score++;

        // get next expected pos'n along correct path, and curr pos'n of player
        const currPlayerPos = this.player.worldPosition(),
            nextPosOnPath = this.currentLane.getPointAt(this.t);

        const x = nextPosOnPath.x,
            y = nextPosOnPath.y,
            z = currPlayerPos.z;

        this.player.mesh.position.lerp(new THREE.Vector3(x, -13.5, -y), 0.1);

        const currDefeatModelPos = earthIsDeadMesh.position;
        const offset = new THREE.Vector3(0, 5, 0);

        const desiredPos = currDefeatModelPos.clone().add(offset);

        earthIsDeadMesh.position.lerp(desiredPos, 0.005);

        // correctly orient the player w.r.t. the path
        const orient = new THREE.Vector3()
            .subVectors(new THREE.Vector3(x, y, z), currPlayerPos)
            .normalize();

        // advance physics simulation
        this.world.fixedStep();

        // TODO perhaps this would be better served to be moved directly into
        //      ObstacleManager? i think that isolating the angle computation
        //      logic to the manager class would be nice, since angles arex
        //      otherwise not referenced in BaseScene so far;
        //      - e.g.) update(playerAngle) => update(currPlayerPosition),
        //              and in update, calculate angle from pos'n directly.
        const playerAngle = Math.atan2(-currPlayerPos.z, currPlayerPos.x);
        this.obstacleManager.update(playerAngle, this.player.body.position);

        // change score text
        document.getElementById("score").innerHTML = "You lose!"

        this.composer.render();
    }

    /* ---------------------------------------------------------------------------- */

    /**
     * Renders the game-over screen.
     */
    endGame() {
        this.camera.position.lerp(new THREE.Vector3(500, 500, 500), 0.01);

        this.composer.render();
    }

    /* ---------------------------------------------------------------------------- */
}

const scene = new DeathScene();
scene.animate();
