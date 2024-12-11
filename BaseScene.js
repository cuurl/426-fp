import * as CANNON from "cannon-es";
import * as THREE from "three";

import { GUI } from "dat.gui";
import { NUM_LANE_SAMPLES, INITIAL_LANE_IDX, orientCameraTowardsPlayer, GRAVITY, TRACK_LANE_Y_POS } from "./util";

import Player from "./Player";
import GroundTrack from "./GroundTrack";
import ObstacleManager from "./ObstacleManager";

class BaseScene {
    /* ---------------------------------------------------------------------------- */
    // THREE.js related declarations
    renderer = null;
    scene = null;
    camera = null;
    lights = [];

    tanFOV = null;                  // see threeInit() - important for window resizing
    initialWindowHeight = null;     // (same as above)
    /* ---------------------------------------------------------------------------- */
    // cannon.js related declarations (+ general collision handling)
    world = null;
    obstacleManager = null;
    /* ---------------------------------------------------------------------------- */
    // core game logic declarations
    lanes = [];
    currentLane = null;             // which lane is the player currently moving on?
    currentLaneIndex = INITIAL_LANE_IDX;
    t = 0.001;
    tStep = 0.001;
    /* ---------------------------------------------------------------------------- */

    /**
     * Sets up required bindings, & initializes THREE.js + Cannon.js primitives, 
     * event handlers for user input, and various utility tools.
     */

    constructor() {
        this.threeInit();   // threeJS-related initializations & lane logic setup

        this.player = new Player(this.scene);

        this.cannonInit();  // cannonJS-related initializations (for physics)
        this.inputInit();   // player event listeners
        this.utilInit();    // DAT GUI, for debugging

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

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            90,
            window.innerWidth / window.innerHeight,
            1,
            2000
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

        const mainLight = new THREE.HemisphereLight(0xFFFFBB, 0x080820, 1);
        this.scene.add(mainLight);
        this.lights.push(mainLight);

        this.floor = new GroundTrack();
        this.scene.add(this.floor.basePlane);

        // lane setups
        this.lanes = this.floor.validLanes;
        for (const lanePath of this.lanes) {
            const points = lanePath.getPoints(NUM_LANE_SAMPLES);
            const laneGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const laneMaterial = new THREE.LineBasicMaterial({color: 0xff0000});

            const lane = new THREE.Line(laneGeometry, laneMaterial);

            lane.rotateX(-Math.PI / 2);
            lane.position.set(0, TRACK_LANE_Y_POS, 0);

            lane.visible = visibleLanes;

            this.scene.add(lane);
        }

        // initially, player is placed on the middle lane
        this.currentLane = this.lanes[INITIAL_LANE_IDX];
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
        this.world = new CANNON.World(
            {gravity: GRAVITY}
        );

        this.world.addBody(this.floor.body);
        this.world.addBody(this.player.body);

        // player-to-obstacle collisions
        console.log("BaseScene: Initializing ObstacleManager");
        const playerMaterial = new CANNON.Material("player"), obstacleMaterial = new CANNON.Material("obstacle");
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
            this.player, this.scene, this.world, this.currentLane.xRadius, obstacleMaterial
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
        playerFolder.addColor(this.player.mesh.material, "color");
    }

    /* ---------------------------------------------------------------------------- */

    /**
     * Sets up event listeners for allowing players to switch between lanes.
     */
    inputInit() {
        document.addEventListener("keydown", (event) => {
            switch (event.code) {
                case "ArrowLeft":
                    this.currentLaneIndex++;
                    this.currentLaneIndex = Math.min(
                        this.currentLaneIndex,
                        this.floor.validLanes.length - 1
                    );
                    this.currentLane =
                        this.floor.validLanes[this.currentLaneIndex];
                    break;

                case "ArrowRight":
                    this.currentLaneIndex--;
                    this.currentLaneIndex = Math.max(this.currentLaneIndex, 0);
                    this.currentLane =
                        this.floor.validLanes[this.currentLaneIndex];
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

        this.t += this.tStep;
        if (this.t >= 1) {
            this.t = 0.001;
        }

        // get next expected pos'n along correct path, and curr pos'n of player
        const currPlayerPos = this.player.worldPosition(),
            nextPosOnPath = this.currentLane.getPointAt(this.t);

        const x = nextPosOnPath.x, y = nextPosOnPath.y, z = currPlayerPos.z;

        this.player.mesh.position.lerp(new THREE.Vector3(x, -13.5, -y), 0.1);

        // correctly orient the player w.r.t. the path
        const orient = new THREE.Vector3()
            .subVectors(new THREE.Vector3(x, y, z), currPlayerPos)
            .normalize();

        this.player.mesh.lookAt(orient);

        // camera positioning
        orientCameraTowardsPlayer(this.camera, this.player);

        // three -> cannon
        this.player.body.position.copy(this.player.mesh.position);
        this.player.body.quaternion.copy(this.player.mesh.quaternion);

        // advance physics simulation
        this.world.fixedStep();

        // TODO perhaps this would be better served to be moved directly into 
        //      ObstacleManager? i think that isolating the angle computation
        //      logic to the manager class would be nice, since angles are 
        //      otherwise not referenced in BaseScene so far;
        //      - e.g.) update(playerAngle) => update(currPlayerPosition),
        //              and in update, calculate angle from pos'n directly.
        const playerAngle = Math.atan2(-currPlayerPos.z, currPlayerPos.x);
        this.obstacleManager.update(playerAngle, this.player.body.position);

        this.renderer.render(this.scene, this.camera);
    }

    /* ---------------------------------------------------------------------------- */
}

const scene = new BaseScene();
scene.animate();
