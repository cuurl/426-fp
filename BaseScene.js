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
    PLAYER_INVINCIBILITY_PERIOD,
    bgMusic,
    EARTH_MODEL_PATH,
} from "./util";

import HolographicMaterial from "./HolographicMaterial";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPixelatedPass } from "three/addons/postprocessing/RenderPixelatedPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { Timer } from "three/examples/jsm/Addons.js";

import Player from "./Player";
import GroundTrack from "./GroundTrack";
import ObstacleManager from "./ObstacleManager";

let earthMesh = await new GLTFLoader().loadAsync(EARTH_MODEL_PATH);

class BaseScene {
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

    audio = null;
    listener = null;

    mixer = null;
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
    gameOver = false;
    /* ---------------------------------------------------------------------------- */

    /**
     * Sets up required bindings, & initializes THREE.js + Cannon.js primitives,
     * event handlers for user input, and various utility tools.
     */

    constructor(debug = false) {
        this.threeInit(); // threeJS-related initializations & lane logic setup

        this.player = new Player(this.scene, this.listener);
        this.player.isInvincible = true; // prevent color change b4 animate() runs
        this.gameOver = false;

        this.cannonInit(); // cannonJS-related initializations (for physics)
        this.inputInit(); // player event listeners

        if (debug) {
            this.utilInit(); // DAT GUI, for debugging
        }

        // for initial animation
        this.camera.position.x = 80;
        this.camera.position.y = 10;
        this.camera.position.z = 80;

        this.camera.lookAt(earthMesh.position);

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

        this.mixer = new THREE.AnimationMixer(earthMesh.scene);
        this.mixer.clipAction(earthMesh.animations[0]).play();

        console.log(earthMesh);

        earthMesh = earthMesh.scene;

        earthMesh.position.set(0, -13.9, 0);
        earthMesh.scale.set(25, 25, 25);
        earthMesh.visible = true;

        earthMesh.traverse((obj) => {
            if (obj.material) {
                obj.material = new HolographicMaterial({
                    fresnelAmount: 0.3,
                    fresnelOpacity: 0.3,
                    hologramBrightness: 0.1,
                    scanlineSize: 2,
                    signalSpeed: 2.3,
                    hologramColor: "#89CFF0",
                    hologramOpacity: 0.4,
                    enableBlinking: true,
                });
            }
        });

        this.scene.add(earthMesh);

        // initially, player is placed on the middle lane
        this.currentLane = this.lanes[INITIAL_LANE_IDX];

        // post-processing
        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPixelatedPass(4, this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight)
        );

        bloomPass.strength = 0.5;
        bloomPass.radius = 0.1;

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
        this.world.gravity = new THREE.Vector3(0, 0, 0);
        this.player.world = this.world;

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
            obstacleMaterial,
            this.listener
        );
    }

    /* ---------------------------------------------------------------------------- */

    /**
     * Sets up primitives for debugging; for now, just DAT-Gui, to
     * allow more granular control of the scene parameters and internal
     * game logic.
     */
    utilInit() {
        this.gui = new GUI();

        const tuningFolder = this.gui.addFolder("Tuning");
        tuningFolder.add(this, "tStep", 0, 1, 0.001);
        tuningFolder.open();

        const playerFolder = this.gui.addFolder("Player");

        playerFolder.add(CAMERA_OFFSET, "x", -100, 100, 1);
        playerFolder.add(CAMERA_OFFSET, "y", -100, 100, 1);
        playerFolder.add(CAMERA_OFFSET, "z", -100, 100, 1);

        playerFolder
            .add(this.player, "currentModelIndex", [0, 1, 2, 3])
            .name("Player model")
            .onChange((modelIndex) => {
                this.player.currentModelIndex = modelIndex;
                this.player.chooseModel(this.scene);
            });

        playerFolder
            .add(this.player, "meshScaleFactor", 0.01, 2)
            .name("Full scale")
            .onChange(() => {
                this.player.meshScale.multiplyScalar(
                    this.player.meshScaleFactor
                );
                this.player.mesh.scale.copy(this.player.meshScale);
            });

        const graphicsFolder = this.gui.addFolder("Graphics");

        graphicsFolder.add(this.renderer, "toneMapping", {
            No: THREE.NoToneMapping,
            Linear: THREE.LinearToneMapping,
            Reinhard: THREE.ReinhardToneMapping,
            Cineon: THREE.CineonToneMapping,
            ACESFilmic: THREE.ACESFilmicToneMapping,
        });

        graphicsFolder.add(this.renderer, "toneMappingExposure", 0, 10, 0.001);

        const cameraFolder = this.gui.addFolder("Camera");
        cameraFolder.add(this.camera.position, "x", -1000, 1000, 1);
        cameraFolder.add(this.camera.position, "y", -1000, 1000, 1);
        cameraFolder.add(this.camera.position, "z", -1000, 1000, 1);
    }

    /* ---------------------------------------------------------------------------- */

    /**
     * Sets up event listeners for allowing players to switch between lanes.
     */
    inputInit() {
        document.addEventListener("keydown", (event) => {
            switch (event.code) {
                case "ArrowRight":
                    this.currentLaneIndex++;
                    this.currentLaneIndex = Math.min(
                        this.currentLaneIndex,
                        this.floor.validLanes.length - 1
                    );
                    this.currentLane =
                        this.floor.validLanes[this.currentLaneIndex];
                    break;

                case "ArrowLeft":
                    this.currentLaneIndex--;
                    this.currentLaneIndex = Math.max(this.currentLaneIndex, 0);
                    this.currentLane =
                        this.floor.validLanes[this.currentLaneIndex];
                    break;

                case "Enter":
                    this.inGame = true;
                    this.player.health = 3;
                    this.timer = new Timer();

                    bgMusic();

                    break;

                case "Space":
                    this.player.shoot();
                    this.player.displayWorld();
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
        if (this.gameOver || this.player.health <= 0) {
            document.location.replace("./death.html");
        }

        requestAnimationFrame(this.animate);

        if (this.inGame) {
            this.timer.update();

            if (this.timer.getElapsed() > PLAYER_INVINCIBILITY_PERIOD) {
                this.player.isInvincible = false;
            }
        }

        // not in game => in initial splash screen animation
        else {
            this.camera.lookAt(earthMesh.position);
        }

        if (this.player.health <= 0) {
            this.gameOver = true;
        }

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
        // coin.scene.children[0].position.lerp(
        //     new THREE.Vector3(x + 5, -13.5, -y + 5),
        //     0.05
        // );

        // correctly orient the player w.r.t. the path
        const orient = new THREE.Vector3()
            .subVectors(new THREE.Vector3(x, y, z), currPlayerPos)
            .normalize();

        this.player.mesh.lookAt(orient);

        const forward = new THREE.Vector3()
            .subVectors(new THREE.Vector3(x, -13.5, -y), currPlayerPos)
            .normalize();

        this.player.forwardVector = forward;

        // camera positioning
        if (this.inGame) {
            orientCameraTowardsPlayer(this.camera, this.player);
        }

        // animation step
        if (this.mixer) {
            this.mixer.update(1 / 60);
        }

        // three -> cannon
        this.player.body.position.copy(this.player.mesh.position);
        this.player.body.quaternion.copy(this.player.mesh.quaternion);

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
        this.player.updateProjectiles();

        // change score text
        if (this.inGame) {
            document.getElementById("score").innerHTML = this.score;
            document.getElementById("coins").innerHTML =
                "Coins: " + this.player.coins;
        } else {
            document.getElementById("score").innerHTML = "Press Enter to play.";
            document.getElementById("coins").innerHTML = "";
        }

        this.composer.render();
    }

    /* ---------------------------------------------------------------------------- */
}

const scene = new BaseScene(false);
scene.animate();
