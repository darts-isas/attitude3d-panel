import * as THREE from 'three'

// Resolved dimensions of one drawn arrow, in world units, ready to apply to a
// shaft (cylinder) + head (cone) pair oriented along `direction`.
export interface VectorShape {
  /** false when nothing should be drawn: a degenerate/non-finite direction, a
   * non-positive magnitude, or a truncate at or beyond 1. */
  visible: boolean
  origin: THREE.Vector3      // base of the drawn segment (start + dir * magnitude * truncate)
  direction: THREE.Vector3   // unit vector from start toward end
  shaftRadius: number
  shaftLength: number
  headRadius: number
  headLength: number
}

const INVISIBLE: VectorShape = {
  visible: false,
  origin: new THREE.Vector3(),
  direction: new THREE.Vector3(0, 1, 0),
  shaftRadius: 0,
  shaftLength: 0,
  headRadius: 0,
  headLength: 0,
}

const isFiniteVec3 = (v: THREE.Vector3): boolean =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)

// Resolves start/end/magnitude/truncate/thickness into concrete arrow dimensions. The
// input vector (end - start) only supplies a direction — its length is discarded in favor
// of `magnitude` — and `truncate` is a fraction (0.0-1.0) of that magnitude, cut off the
// start side. Never mutates `start`/`end` (callers may pass reused scratch vectors), and
// never returns non-finite numbers: any invalid input yields `visible: false`.
export const computeVectorShape = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  magnitude: number,
  truncate: number,
  thickness: number,
): VectorShape => {
  if (!isFiniteVec3(start) || !isFiniteVec3(end)) { return INVISIBLE }
  if (!Number.isFinite(magnitude) || !Number.isFinite(truncate) || !Number.isFinite(thickness)) { return INVISIBLE }
  if (magnitude <= 0) { return INVISIBLE }

  const dir = end.clone().sub(start)
  const dirLength = dir.length()
  // Guard on length, not lengthSq: lengthSq can underflow to exactly 0 for a direction
  // that is merely very short, not actually degenerate.
  if (!Number.isFinite(dirLength) || dirLength < 1e-12) { return INVISIBLE }
  dir.divideScalar(dirLength)

  const clampedTruncate = Math.min(Math.max(truncate, 0), 1)
  if (clampedTruncate >= 1) { return INVISIBLE }

  const truncateLength = clampedTruncate * magnitude
  const len = magnitude - truncateLength
  const origin = start.clone().addScaledVector(dir, truncateLength)

  const t = Math.max(thickness, 1e-6)
  // Cap both the head's length and radius by the same factor, so a short arrow's head
  // never outgrows the segment it's drawn on (and never ends up wider than it is long).
  const cap = Math.min(1, (0.4 * len) / (5 * t))
  const headLength = 5 * t * cap
  const headRadius = 2.5 * t * cap
  const shaftRadius = t * cap
  const shaftLength = len - headLength

  return {
    visible: true,
    origin,
    direction: dir,
    shaftRadius,
    shaftLength,
    headRadius,
    headLength,
  }
}
