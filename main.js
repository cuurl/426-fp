import * as CANNON from "cannon-es";
import * as THREE from "three";

/**
 * Really basic example to show cannon.js integration
 * with three.js.
 * Each frame the cannon.js world is stepped forward and then
 * the position and rotation data of the boody is copied
 * over to the three.js scene.
 */

// three.js variables
let camera, scene, renderer;
let mesh;

// cannon.js variables
let world;
let body;

initThree();
initCannon();
animate();

function initThree() {
    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        1,
    );
    camera.position.z = 5;

    // Scene
    scene = new THREE.Scene();

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);

    window.addEventListener("resize", onWindowResize);

    // Box
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
    });

    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function initCannon() {
    world = new CANNON.World();

    // Box
    const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
    body = new CANNON.Body({
        mass: 1,
    });
    body.addShape(shape);
    body.angularVelocity.set(0, 10, 0);
    body.angularDamping = 0.5;
    world.addBody(body);
}

function animate() {
    requestAnimationFrame(animate);

    // Step the physics world
    world.fixedStep();

    // Copy coordinates from cannon.js to three.js
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);

    // Render three.js
    renderer.render(scene, camera);
}
