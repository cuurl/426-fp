import * as CANNON from 'cannon-es';
import * as THREE  from 'three';

export default class GroundTrack {
    constructor() {
        // three
        const plane = new THREE.Plane(
            new THREE.Vector3(0, -1, 0),
            -10
        )

        const p = new THREE.CircleGeometry(100, 100);
        const pMat = new THREE.MeshBasicMaterial({color: 0x5e5e5e, side: THREE.DoubleSide} );
        this.pPlane = new THREE.Mesh(p, pMat);
        this.pPlane.rotation.set(Math.PI / 2, 0, 0);

        this.pPlane.position.set(0,-15,0);

        // cannon
        const material = new CANNON.Material('ground')
        const shape = new CANNON.Box(new CANNON.Vec3(100, 100, 0.1))

        this.body = new CANNON.Body({ mass: 0, material: material, type: CANNON.BODY_TYPES.STATIC})
        this.body.position.set(0, -15, 0);

        this.body.addShape(shape)
        this.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0)

        // three & cannon for a "helper" circle that denotes the track the player will move on
        // (subject to perturbation in left-right directions)
        this.pHelper = new THREE.EllipseCurve(0, 0, 75, 75);
        const pHelperGeometry = new THREE.BufferGeometry().setFromPoints(this.pHelper.getPoints(50)),
              pHelperMaterial = new THREE.LineBasicMaterial({color: 0xc20a00});
        
        this.pHelperCurve = new THREE.Line(pHelperGeometry, pHelperMaterial);
        this.pHelperCurve.rotation.set(-Math.PI/2,0,0);
        this.pHelperCurve.position.set(0, -14.99, 0);

        this.trackStartingPoint = this.pHelper.getPoint(1);
    }
}