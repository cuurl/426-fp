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

export const CAMERA_OFFSET = new Vector3(20, 20, 20);
export const GRAVITY       = new Vec3(0, -9.81, 0);
/* ------------------------------------------------------------------------------------------- */
// Useful functions.

// Returns a random number in the range [min, max].
export default function randRanged(min, max) {
    return Math.random() * (max - min) + min;
}

// Positions and orients the camera towards the player mesh.
// This is meant to be used each frame.
export function orientCameraTowardsPlayer(camera, player) {
    const playerPosition = new Vector3();
    player.mesh.getWorldPosition(playerPosition);

    camera.position.copy(playerPosition).add(CAMERA_OFFSET);

    camera.lookAt(playerPosition);
}