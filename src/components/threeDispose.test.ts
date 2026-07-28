import * as THREE from 'three'
import { disposeObject3D, removeAndDispose } from './threeDispose'

describe('disposeObject3D', () => {
  it('disposes geometry and material on nested meshes (grandchildren)', () => {
    const root = new THREE.Group()
    const child = new THREE.Group()
    const grandchildGeometry = new THREE.BoxGeometry()
    const grandchildMaterial = new THREE.MeshStandardMaterial()
    const grandchild = new THREE.Mesh(grandchildGeometry, grandchildMaterial)

    root.add(child)
    child.add(grandchild)

    const geometrySpy = jest.spyOn(grandchildGeometry, 'dispose')
    const materialSpy = jest.spyOn(grandchildMaterial, 'dispose')

    disposeObject3D(root)

    expect(geometrySpy).toHaveBeenCalledTimes(1)
    expect(materialSpy).toHaveBeenCalledTimes(1)
  })

  it('disposes each material in an array of materials', () => {
    const materialA = new THREE.MeshStandardMaterial()
    const materialB = new THREE.MeshStandardMaterial()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [materialA, materialB])

    const spyA = jest.spyOn(materialA, 'dispose')
    const spyB = jest.spyOn(materialB, 'dispose')

    disposeObject3D(mesh)

    expect(spyA).toHaveBeenCalledTimes(1)
    expect(spyB).toHaveBeenCalledTimes(1)
  })

  it('disposes textures referenced by a material', () => {
    const texture = new THREE.Texture()
    const material = new THREE.MeshStandardMaterial({ map: texture })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material)

    const textureSpy = jest.spyOn(texture, 'dispose')

    disposeObject3D(mesh)

    expect(textureSpy).toHaveBeenCalledTimes(1)
  })

  it('disposes a geometry shared by multiple meshes only once', () => {
    const sharedGeometry = new THREE.BoxGeometry()
    const meshA = new THREE.Mesh(sharedGeometry, new THREE.MeshStandardMaterial())
    const meshB = new THREE.Mesh(sharedGeometry, new THREE.MeshStandardMaterial())

    const root = new THREE.Group()
    root.add(meshA)
    root.add(meshB)

    const geometrySpy = jest.spyOn(sharedGeometry, 'dispose')

    disposeObject3D(root)

    expect(geometrySpy).toHaveBeenCalledTimes(1)
  })
})

describe('removeAndDispose', () => {
  it('removes the object from its parent before disposing', () => {
    const parent = new THREE.Group()
    const geometry = new THREE.BoxGeometry()
    const material = new THREE.MeshStandardMaterial()
    const mesh = new THREE.Mesh(geometry, material)
    parent.add(mesh)

    const removeSpy = jest.spyOn(parent, 'remove')
    const geometrySpy = jest.spyOn(geometry, 'dispose')

    removeAndDispose(mesh)

    expect(removeSpy).toHaveBeenCalledWith(mesh)
    expect(mesh.parent).toBeNull()
    expect(geometrySpy).toHaveBeenCalledTimes(1)
  })

  it('disposes without error when there is no parent', () => {
    const geometry = new THREE.BoxGeometry()
    const material = new THREE.MeshStandardMaterial()
    const mesh = new THREE.Mesh(geometry, material)

    const geometrySpy = jest.spyOn(geometry, 'dispose')

    expect(() => removeAndDispose(mesh)).not.toThrow()
    expect(geometrySpy).toHaveBeenCalledTimes(1)
  })
})
