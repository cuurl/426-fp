import { BoxGeometry, Mesh, MeshPhongMaterial, Object3D } from "three";

/**
 * Working directly with THREE.Mesh, THREE.Geometry, whatever, is not going to scale 
 * well as our abstractions get more complicated.
 * 
 * This will encapsulate the more annoying work that we need to do w.r.t. our
 * rendered player object, without having to directly work with THREE classes every
 * time, as well as some helpful utility methods.
 */

export default class Player {
    constructor() {
        // ---------------------------------------------------------------------------
        // for now, player is a cube
        this.geometry = new BoxGeometry();
        this.material = new MeshPhongMaterial({color: 0x3396ff});
        this.mesh = new Mesh(this.geometry, this.material);

        this.asMesh = this.asMesh.bind(this);
        // ---------------------------------------------------------------------------
        // player vars
        this.position = this.mesh.position;
        this.rotation = this.mesh.rotation;

        this.speed = 0.1;

        this.moveLeft = false;
        this.moveRight = false;
        this.moveForward = false;
        this.moveBackward = false;
        // ---------------------------------------------------------------------------
    }

    // Rotates the player in-place about the specified axis, by the specified angle,
    // in radians.
    //
    // thetaRad := float; axis := Vector3.
    rotateInPlace(thetaRad, axis) {
        this.mesh.rotateOnAxis(axis, thetaRad);
    }

    // Returns the player mesh, for use in Core, when adding the player to the scene.
    asMesh() {
        return this.mesh;
    }
}
