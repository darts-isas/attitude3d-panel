import * as THREE from 'three'

type Disposable = { dispose?: () => void }

const disposeOnce = (target: unknown, disposed: Set<unknown>): void => {
  if (!target) { return }
  if (disposed.has(target)) { return }

  const disposable = target as Disposable
  if (typeof disposable.dispose !== 'function') { return }

  disposable.dispose()
  disposed.add(target)
}

const disposeMaterialTextures = (material: THREE.Material, disposed: Set<unknown>): void => {
  Object.values(material).forEach(value => {
    if (value instanceof THREE.Texture) { disposeOnce(value, disposed) }
  })
}

const disposeMaterial = (material: THREE.Material | THREE.Material[] | undefined, disposed: Set<unknown>): void => {
  if (!material) { return }

  const materials = Array.isArray(material) ? material : [material]
  materials.forEach(mat => {
    disposeMaterialTextures(mat, disposed)
    disposeOnce(mat, disposed)
  })
}

// Traverse obj (including obj itself) and dispose the geometry/material (and any
// textures the material references) of every Mesh/Line/Points found. Objects shared
// across multiple nodes (geometry, material, textures) are only disposed once.
export const disposeObject3D = (obj: THREE.Object3D): void => {
  const disposed = new Set<unknown>()

  obj.traverse(node => {
    const mesh = node as THREE.Mesh | THREE.Line | THREE.Points
    if (mesh.geometry) { disposeOnce(mesh.geometry, disposed) }
    if (mesh.material) { disposeMaterial(mesh.material, disposed) }
  })
}

// Remove obj from its parent (if any) and dispose it.
export const removeAndDispose = (obj: THREE.Object3D): void => {
  if (obj.parent) { obj.parent.remove(obj) }

  disposeObject3D(obj)
}
