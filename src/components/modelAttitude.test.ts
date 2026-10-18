import * as THREE from 'three'
import { createModelObject } from 'types'
import { modelOffsetQuaternion, upAxisQuaternion } from './modelAttitude'

describe('modelOffsetQuaternion', () => {
  it('is identity for objects without offset fields', () => {
    const o = createModelObject('m', 'Model')
    delete o.modelOffsetX
    delete o.modelOffsetY
    delete o.modelOffsetZ
    expect(modelOffsetQuaternion(o).angleTo(new THREE.Quaternion())).toBeLessThan(1e-9)
  })

  it('rotates model-local axes by the XYZ Euler offset in degrees', () => {
    const o = { ...createModelObject('m', 'Model'), modelOffsetX: 90 }
    const v = new THREE.Vector3(0, 1, 0).applyQuaternion(modelOffsetQuaternion(o))
    expect(v.distanceTo(new THREE.Vector3(0, 0, 1))).toBeLessThan(1e-9)
  })

  it('composes as (q or q^-1) * offset when nested under the attitude root', () => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 3)
    const o = { ...createModelObject('m', 'Model'), modelOffsetX: 90 }
    const root = new THREE.Group()
    const offset = new THREE.Group()
    root.add(offset)
    root.quaternion.copy(q).invert()
    offset.quaternion.copy(modelOffsetQuaternion(o))
    root.updateMatrixWorld(true)

    const world = new THREE.Quaternion()
    offset.getWorldQuaternion(world)
    const expected = q.clone().invert().multiply(modelOffsetQuaternion(o))
    expect(world.angleTo(expected)).toBeLessThan(1e-9)
  })
})

describe('upAxisQuaternion', () => {
  it('is identity for +Y (as-is) and for dashboards without the option', () => {
    expect(upAxisQuaternion('y').angleTo(new THREE.Quaternion())).toBeLessThan(1e-9)
    expect(upAxisQuaternion(undefined).angleTo(new THREE.Quaternion())).toBeLessThan(1e-9)
  })

  it('for +Z draws (x, y, z) at (x, z, -y) and a quaternion as (qx, qz, -qy, qw), as shown in the editor', () => {
    const up = upAxisQuaternion('z')
    const v = new THREE.Vector3(0.3, -1.2, 2.5)
    expect(v.clone().applyQuaternion(up).distanceTo(new THREE.Vector3(v.x, v.z, -v.y))).toBeLessThan(1e-9)

    const q = new THREE.Quaternion(0.1, -0.4, 0.7, 0.5).normalize()
    const seen = up.clone().multiply(q).multiply(up.clone().invert())
    const expected = new THREE.Quaternion(q.x, q.z, -q.y, q.w)
    expect(seen.angleTo(expected)).toBeLessThan(1e-6)
  })
})
