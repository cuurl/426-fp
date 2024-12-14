import { Vector3 } from "three";
import { Vec3 } from "cannon-es";

import { Audio, AudioLoader, AudioListener } from "three";


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

export const PLAYER_HEALTH_FULL = 3;
export const PLAYER_HEALTH_MED  = 2;
export const PLAYER_HEALTH_NEAR_DEATH = 1;

export const PLAYER_INVINCIBILITY_PERIOD = 5;   // 5 sec of invincibility on spawning
/* ------------------------------------------------------------------------------------------- */
// Geometric, mathematical, or otherwise useful non-numeric constants.

export const CAMERA_OFFSET = new Vector3(1, 10, 1);
export const GRAVITY       = new Vec3(0, -9.81, 0);

export const PLAYER_MODELS_F_NAME_PREFIX = 'models/Player/';

export const PLAYER_MODELS = ['ufo1.fbx', 'ufo2.fbx', 'ufo3.fbx', 'ufo4.fbx'];
export const DEFAULT_PLAYER_MODEL_INDEX = 0;

export const BG_MUSIC_PATH   = 'song.ogg';
export const PAIN_SOUND_PATH = 'pain.ogg';
export const COIN_SOUND_PATH = 'coin.ogg';
export const FIRE_SOUND_PATH = 'fire.ogg';

export const EARTH_MODEL_PATH = "earth.glb";
export const ENEMY_MODEL_PATH = "enemy.fbx";
export const PLAYER_MODEL_PATH = "player.fbx";
export const ASTEROID_MODEL_PATH = "asteroid.fbx";
export const COIN_MODEL_PATH = "coin.glb";

let audioListener = initAudio();
let sound = new Audio(audioListener);
let audioLoader = new AudioLoader();

const BG_AUDIO = await audioLoader.loadAsync(BG_MUSIC_PATH);
const FIRE_AUDIO = await audioLoader.loadAsync(FIRE_SOUND_PATH);
const COIN_AUDIO = await audioLoader.loadAsync(COIN_SOUND_PATH);
const PAIN_AUDIO = await audioLoader.loadAsync(PAIN_SOUND_PATH);

console.log(BG_AUDIO)
console.log(FIRE_AUDIO)
console.log(COIN_AUDIO)
console.log(PAIN_AUDIO)

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
export function orientCameraTowardsPlayer(camera, player) {
    const playerPosition = new Vector3();
    player.mesh.getWorldPosition(playerPosition);

    const newCameraPos = new Vector3().clone().applyMatrix4(player.mesh.matrixWorld).add(CAMERA_OFFSET);

    camera.position.lerp(newCameraPos.clone(), 0.0375);
    camera.lookAt(playerPosition);
}

// Returns the correct ship color for the player, given their current
// health / hit-point count.
export function healthToShipColor(playerHealth) {
    let color;

    switch (playerHealth) {
        case PLAYER_HEALTH_FULL:
            color = '#66FF00';
            break;
        case PLAYER_HEALTH_MED:
            color = '#FFBF00';
            break
        case PLAYER_HEALTH_NEAR_DEATH:
            color = '#E60026';
            break; 
    }

    return color;
}

/* ------------------------------------------------------------------------------------------- */
// Audio handling.

export function initAudio() {
    return new AudioListener();
}

export function bgMusic() {
    let sound = new Audio(audioListener);

    sound.setBuffer(BG_AUDIO);
    sound.setLoop(false);
    sound.setVolume(0.5);
    sound.play()
}

export function painSound() {
    let sound = new Audio(audioListener);

    sound.setBuffer(PAIN_AUDIO);
    sound.setLoop(false);
    sound.setVolume(0.5);
    sound.play()
}

export function coinSound() {
    let sound = new Audio(audioListener);

    sound.setBuffer(COIN_AUDIO);
    sound.setLoop(false);
    sound.setVolume(0.5);
    sound.play()
}

export function fireSound() {
    let sound = new Audio(audioListener);

    sound.setBuffer(FIRE_AUDIO);
    sound.setLoop(false);
    sound.setVolume(0.5);
    sound.play()
}
/* ------------------------------------------------------------------------------------------- */
