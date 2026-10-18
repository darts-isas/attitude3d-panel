import * as THREE from 'three'
import { ModelObject, UpAxis } from 'types'

const toRad = (deg: number | undefined): number => THREE.MathUtils.degToRad(Number(deg) || 0)

// Fixed rotation of the model in its own local frame (XYZ Euler, degrees). Applied on a node
// between the attitude root and the model, so the drawn attitude is (q or q^-1) * offset.
export const modelOffsetQuaternion = (o: ModelObject): THREE.Quaternion =>
  new THREE.Quaternion().setFromEuler(
    new THREE.Euler(toRad(o.modelOffsetX), toRad(o.modelOffsetY), toRad(o.modelOffsetZ), 'XYZ')
  )

// Rotation of the scene root for the Up Axis option. 'z' turns input +Z to screen-up (+Y), i.e.
// draws (x, y, z) at (x, z, -y); a quaternion q is then seen as (qx, qz, -qy, qw).
export const upAxisQuaternion = (upAxis: UpAxis | undefined): THREE.Quaternion =>
  upAxis === 'z'
    ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
    : new THREE.Quaternion()
