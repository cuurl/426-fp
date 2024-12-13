import { Vector3 } from "three";
import { Vec3 } from "cannon-es";

/* ------------------------------------------------------------------------------------------- */
// Numerical constants.

export const NUM_LANE_SAMPLES = 100;               // default # ellipse/lane samples
export const INITIAL_LANE_IDX = 1;                 // 3 lanes; player initially in middle lane:
                                                   //             |   |   |   |
                                                   //             |   |   |   |
                                                   //              (0) (1) (2)

export const TRACK_BASE_Y_POS = -15;               // standard y-value for GroundTrack placement
export const TRACK_LANE_Y_POS = -14.99;            // small variation to avoid clipping

export const TRACK_RAD        = 100;               // radius of standard GroundTrack

export const SMALL_LANE_RAD   = 62.5;              // radius of inner-most lane
export const INITIAL_LANE_RAD = 75;                // radius of middle (initial) lane
export const LARGE_LANE_RAD   = 87.5;              // radius of outer-most lane
/* ------------------------------------------------------------------------------------------- */
// Geometric, mathematical, or otherwise useful non-numeric constants.

export const CAMERA_OFFSET = new Vector3(0, 10, 0);
export const GRAVITY       = new Vec3(0, -9.81, 0);

export const PLAYER_MODELS_F_NAME_PREFIX = 'models/Player/';

// TODO auto-scan models/ dir for each model category
export const PLAYER_MODELS = ['ufo1.fbx', 'ufo2.fbx', 'ufo3.fbx', 'ufo4.fbx'];

export const DEFAULT_PLAYER_MODEL_INDEX = 0;
/* ------------------------------------------------------------------------------------------- */
// Useful functions.

// Returns a random integer in the range [min, max].
export default function randRanged(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

// Returns a random color for an obstacle, in its hex representation.
export function randObstacleColor() {
    const OBSTACLE_COLORS = ['#ff0000', '#00d5ff'];

    return OBSTACLE_COLORS[randRanged(0, OBSTACLE_COLORS.length)];
}

// Positions and orients the camera towards the player mesh.
// This is meant to be used each frame.
export function orientCameraTowardsPlayer(camera, player, lookAtVec) {
    const playerPosition = new Vector3();
    player.mesh.getWorldPosition(playerPosition);

    const newCameraPos = new Vector3().clone().applyMatrix4(player.mesh.matrixWorld);

    newCameraPos.x += 1;
    newCameraPos.y += 10;
    newCameraPos.z += 1

    camera.position.lerp(newCameraPos.clone(), 0.0375);

    camera.lookAt(playerPosition);

}