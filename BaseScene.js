import * as CANNON from "cannon-es";
import * as THREE from "three";

import { GUI } from "dat.gui";

import Player from "../testing/Player";
import GroundTrack from "../testing/GroundTrack";

class BaseScene {
    constructor() {
        this.t = 0.001;
        this.simulationStepSize = 0.001;
        
        // threeJS-related initializations
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            1,
            2000
        );

        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        window.addEventListener("resize", (e) => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
        this.scene.add(light);

        this.floor = new GroundTrack();
        this.scene.add(this.floor.pPlane);
        this.scene.add(this.floor.pHelperCurve);

        this.player = new Player();
        (this.playerSpeed = 0.5),
            (this.playerDirection = new THREE.Vector3(1, 0, 0));

        this.scene.add(this.player.mesh); // THREE.Scene.add(<Mesh>)

        const cameraFromPlayer = new THREE.Vector3(0, 0, 0);
        const playerPosition = new THREE.Vector3();

        this.player.mesh.getWorldPosition(playerPosition);

        this.camera.position.copy(playerPosition).add(cameraFromPlayer);
        this.camera.lookAt(playerPosition);

        // cannon.js-related initializations
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.81, 0);
        this.world.addBody(this.floor.body);
        this.world.addBody(this.player.body);

        this.playerStartingPosition = this.floor.trackStartingPoint;
        this.player.mesh.position.set(
            this.floor.pHelper.xRadius,
            -13.5,
            this.floor.pHelper.yRadius
        );
        this.player.body.position.set(
            this.floor.pHelper.xRadius,
            -13.5,
            this.floor.pHelper.yRadius
        );

        // https://stackoverflow.com/questions/4011793/this-is-undefined-in-javascript-class-methods
        this.animate = this.animate.bind(this);

        // player event listeners
        document.addEventListener("keydown", (event) => {
            switch (event.code) {
                case "ArrowLeft":
                    this.player.moveLeft = true;
                    break;
                case "ArrowRight":
                    this.player.moveRight = true;
                    break;
                case "ArrowUp":
                    this.player.moveForward = true;
                    break;
                case "ArrowDown":
                    this.player.moveBackward = true;
                    break;
            }
        });

        document.addEventListener("keyup", (event) => {
            switch (event.code) {
                case "ArrowLeft":
                    this.player.moveLeft = false;
                    break;
                case "ArrowRight":
                    this.player.moveRight = false;
                    break;
                case "ArrowUp":
                    this.player.moveForward = false;
                    break;
                case "ArrowDown":
                    this.player.moveBackward = false;
                    break;
            }
        });

        // DAT GUI, for debugging
        this.gui = new GUI();

        const tuningFolder = this.gui.addFolder("Tuning");
        tuningFolder.add(this, "simulationStepSize", 0, 1, 0.001);
        tuningFolder.open();

        const playerFolder = this.gui.addFolder("Player");
        playerFolder.addColor(this.player.mesh.material, "color");

    }

    animate() {
        requestAnimationFrame(this.animate);

        this.t += this.simulationStepSize;
        console.log(this.t);

        const x = this.floor.pHelper.xRadius * Math.cos(this.t),
            y = -13.9,
            z = this.floor.pHelper.yRadius * Math.sin(this.t);

        this.player.body.position.set(x, y, -z);
        this.player.mesh.position.set(x, y, -z);

        // move camera with player
        const cameraFromPlayer = new THREE.Vector3(30, 20, 0);
        const playerPosition = new THREE.Vector3();

        this.player.mesh.getWorldPosition(playerPosition);

        this.camera.position.copy(playerPosition).add(cameraFromPlayer);
        this.camera.lookAt(new THREE.Vector3(x, y, -z));

        this.player.mesh.lookAt(cameraFromPlayer.clone().negate());

        // player movements that need to b handled?
        if (this.player.moveLeft) {
            const point = this.player.randomPoint();
            this.player.body.applyImpulse(new CANNON.Vec3(-1, 0, 0), point);
        }
        if (this.player.moveRight) {
            const point = this.player.randomPoint();
            this.player.body.applyImpulse(new CANNON.Vec3(+1, 0, 0), point);
        }
        if (this.player.moveForward) {
            const point = this.player.randomPoint();
            this.player.body.applyImpulse(new CANNON.Vec3(0, 0, -1), point);
        }
        if (this.player.moveBackward) {
            const point = this.player.randomPoint();
            this.player.body.applyImpulse(new CANNON.Vec3(0, 0, +1), point);
        }

        // Step the physics world
        this.world.fixedStep();

        // Copy coordinates from cannon.js to three.js
        this.player.mesh.position.copy(this.player.body.position);
        this.player.mesh.quaternion.copy(this.player.body.quaternion);

        this.renderer.render(this.scene, this.camera);
    }
}

const scene = new BaseScene();
scene.animate();
