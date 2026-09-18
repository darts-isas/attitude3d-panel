import * as THREE from 'three'
import { computeVectorShape } from './vectorGeometry'

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

describe('computeVectorShape', () => {
  it('draws the truncated segment from the worked example (0,0,0)->(0,0,1), magnitude 100, truncate 0.8', () => {
    const shape = computeVectorShape(v(0, 0, 0), v(0, 0, 1), 100, 0.8, 1)

    expect(shape.visible).toBe(true)
    expect(shape.origin.toArray()).toEqual([0, 0, 80])
    expect(shape.direction.toArray()).toEqual([0, 0, 1])
    expect(shape.shaftLength + shape.headLength).toBeCloseTo(20, 9)

    const tip = shape.origin.clone().addScaledVector(shape.direction, shape.shaftLength + shape.headLength)
    expect(tip.z).toBeCloseTo(100, 9)
  })

  it('normalizes a non-axis-aligned direction and discards its raw length', () => {
    const shape = computeVectorShape(v(0, 0, 0), v(1, 1, 1), 3, 0, 0.1)

    expect(shape.visible).toBe(true)
    expect(shape.direction.length()).toBeCloseTo(1, 9)

    const tip = shape.origin.clone().addScaledVector(shape.direction, shape.shaftLength + shape.headLength)
    const expectedTip = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(3)
    expect(tip.x).toBeCloseTo(expectedTip.x, 9)
    expect(tip.y).toBeCloseTo(expectedTip.y, 9)
    expect(tip.z).toBeCloseTo(expectedTip.z, 9)
  })

  it('applies truncate as a fraction of magnitude, along the unit direction, from a non-origin start', () => {
    const shape = computeVectorShape(v(5, 0, 0), v(5, 0, 2), 4, 0.25, 0.1)

    expect(shape.visible).toBe(true)
    expect(shape.origin.toArray()).toEqual([5, 0, 1])
    const tip = shape.origin.clone().addScaledVector(shape.direction, shape.shaftLength + shape.headLength)
    expect(tip.toArray()).toEqual([5, 0, 4])
  })

  it('is invisible when start equals end (degenerate direction), without producing NaN', () => {
    const shape = computeVectorShape(v(1, 2, 3), v(1, 2, 3), 1, 0, 0.1)

    expect(shape.visible).toBe(false)
    expect(Number.isNaN(shape.direction.x)).toBe(false)
  })

  it('produces finite output for a direction exactly opposite the shaft-up axis (0,-1,0)', () => {
    const shape = computeVectorShape(v(0, 0, 0), v(0, -1, 0), 1, 0, 0.1)

    expect(shape.visible).toBe(true)
    expect(Number.isFinite(shape.direction.x)).toBe(true)
    expect(Number.isFinite(shape.direction.y)).toBe(true)
    expect(Number.isFinite(shape.direction.z)).toBe(true)
    expect(shape.direction.toArray()).toEqual([0, -1, 0])
  })

  it('clamps a negative truncate to 0 and draws the full length', () => {
    const shape = computeVectorShape(v(0, 0, 0), v(0, 0, 1), 10, -0.5, 0.1)

    expect(shape.visible).toBe(true)
    expect(shape.origin.toArray()).toEqual([0, 0, 0])
    expect(shape.shaftLength + shape.headLength).toBeCloseTo(10, 9)
  })

  it('is invisible when truncate equals 1 (the whole magnitude)', () => {
    const shape = computeVectorShape(v(0, 0, 0), v(0, 0, 1), 10, 1, 0.1)
    expect(shape.visible).toBe(false)
  })

  it('is invisible when truncate exceeds 1, rather than drawing a negative length', () => {
    const shape = computeVectorShape(v(0, 0, 0), v(0, 0, 1), 10, 1.5, 0.1)
    expect(shape.visible).toBe(false)
  })

  it('is invisible when magnitude is zero or negative', () => {
    expect(computeVectorShape(v(0, 0, 0), v(0, 0, 1), 0, 0, 0.1).visible).toBe(false)
    expect(computeVectorShape(v(0, 0, 0), v(0, 0, 1), -5, 0, 0.1).visible).toBe(false)
  })

  it('is invisible and NaN-free when any input is non-finite', () => {
    expect(computeVectorShape(v(NaN, 0, 0), v(0, 0, 1), 1, 0, 0.1).visible).toBe(false)
    expect(computeVectorShape(v(0, 0, 0), v(0, 0, Infinity), 1, 0, 0.1).visible).toBe(false)
    expect(computeVectorShape(v(0, 0, 0), v(0, 0, 1), NaN, 0, 0.1).visible).toBe(false)
    expect(computeVectorShape(v(0, 0, 0), v(0, 0, 1), 1, NaN, 0.1).visible).toBe(false)
    expect(computeVectorShape(v(0, 0, 0), v(0, 0, 1), 1, 0, NaN).visible).toBe(false)
  })

  it('clamps non-positive thickness so the shaft/head radii stay positive', () => {
    const shape = computeVectorShape(v(0, 0, 0), v(0, 0, 1), 1, 0, 0)

    expect(shape.visible).toBe(true)
    expect(shape.shaftRadius).toBeGreaterThan(0)
    expect(shape.headRadius).toBeGreaterThan(0)
  })

  it('caps the head length/radius for a short arrow so it does not outgrow the segment', () => {
    const shape = computeVectorShape(v(0, 0, 0), v(0, 0, 1), 0.05, 0, 0.02)

    expect(shape.visible).toBe(true)
    expect(shape.headLength).toBeLessThanOrEqual(0.4 * 0.05 + 1e-9)
    expect(shape.shaftLength).toBeGreaterThan(0)
    expect(shape.headRadius).toBeGreaterThan(shape.shaftRadius)
  })

  it('keeps shaftLength + headLength equal to magnitude * (1 - clampedTruncate), and shaftLength positive', () => {
    const cases: Array<[number, number, number]> = [
      [1, 0, 0.02],
      [100, 0.8, 1],
      [0.05, 0, 0.02],
      [4, 0.25, 0.1],
    ]
    for (const [magnitude, truncate, thickness] of cases) {
      const shape = computeVectorShape(v(0, 0, 0), v(0, 0, 1), magnitude, truncate, thickness)
      expect(shape.visible).toBe(true)
      expect(shape.shaftLength + shape.headLength).toBeCloseTo(magnitude * (1 - truncate), 9)
      expect(shape.shaftLength).toBeGreaterThan(0)
    }
  })

  it('does not mutate the start/end vectors passed in', () => {
    const start = v(1, 2, 3)
    const end = v(4, 5, 6)
    computeVectorShape(start, end, 2, 0.5, 0.1)

    expect(start.toArray()).toEqual([1, 2, 3])
    expect(end.toArray()).toEqual([4, 5, 6])
  })
})
