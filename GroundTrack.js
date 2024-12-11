import * as CANNON from 'cannon-es';
import * as THREE  from 'three';
import { INITIAL_LANE_IDX, INITIAL_LANE_RAD, LARGE_LANE_RAD, SMALL_LANE_RAD, TRACK_BASE_Y_POS, TRACK_RAD } from './util';

export default class GroundTrack {
    constructor() {
        // three
        const p = new THREE.CircleGeometry(TRACK_RAD, TRACK_RAD);
        const pMat = new THREE.MeshBasicMaterial({color: 0x5e5e5e, side: THREE.DoubleSide} );
        this.basePlane = new THREE.Mesh(p, pMat);
        this.basePlane.rotation.set(Math.PI / 2, 0, 0);

        this.basePlane.position.set(0, TRACK_BASE_Y_POS, 0);

        this.basePlane.visible = false;

        // cannon
        const material = new CANNON.Material('ground')
        const shape = new CANNON.Cylinder(100,100,1)

        this.body = new CANNON.Body({ mass: 0, material: material, type: CANNON.BODY_TYPES.STATIC})
        this.body.position.set(0, TRACK_BASE_Y_POS, 0);

        this.body.addShape(shape)
        this.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0)

        this.validLanes = [];

        // inner path
        this.validLanes.push(
            new THREE.EllipseCurve(0, 0, SMALL_LANE_RAD, SMALL_LANE_RAD)
        );

        // default path
        this.validLanes.push(
            new THREE.EllipseCurve(0, 0, INITIAL_LANE_RAD, INITIAL_LANE_RAD)
        );

        this.validLanes.push(
            new THREE.EllipseCurve(0, 0, LARGE_LANE_RAD, LARGE_LANE_RAD)
        );

        this.trackStartingPoint = this.validLanes[0].getPoint(0);
    }
}