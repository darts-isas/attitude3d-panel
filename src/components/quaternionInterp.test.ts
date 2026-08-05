import * as THREE from 'three'
import { DataFrame, FieldType } from '@grafana/data'
import { collectQuatSamples, QuatSample, sampleQuaternionAt, slerpPair } from './quaternionInterp'

const qFromAxisAngleY = (degrees: number) => {
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(degrees))
}

describe('slerpPair', () => {
  it('slerps between the pair and extrapolates past it at the same rate, unbounded', () => {
    const a: QuatSample = { t: 0, q: qFromAxisAngleY(0) }
    const b: QuatSample = { t: 1000, q: qFromAxisAngleY(90) }

    expect(slerpPair(a, b, 500).angleTo(qFromAxisAngleY(45))).toBeLessThan(1e-6)
    expect(slerpPair(a, b, 100_000).angleTo(qFromAxisAngleY(9000))).toBeLessThan(1e-6)
  })

  it('clamps u below 0 when targetMs is before a', () => {
    const a: QuatSample = { t: 1000, q: qFromAxisAngleY(0) }
    const b: QuatSample = { t: 2000, q: qFromAxisAngleY(90) }

    expect(slerpPair(a, b, -5000).angleTo(qFromAxisAngleY(0))).toBeLessThan(1e-6)
  })

  it('returns b as-is when dt is under 1ms, avoiding division by a near-zero interval', () => {
    const a: QuatSample = { t: 1000, q: qFromAxisAngleY(0) }
    const b: QuatSample = { t: 1000, q: qFromAxisAngleY(90) }

    expect(slerpPair(a, b, -5000).angleTo(qFromAxisAngleY(90))).toBeLessThan(1e-6)
  })
})

describe('sampleQuaternionAt', () => {
  it('returns null for an empty buffer', () => {
    expect(sampleQuaternionAt([], 0)).toBeNull()
  })

  it('returns a clone of the single sample', () => {
    const q = qFromAxisAngleY(30)
    const buffer: QuatSample[] = [{ t: 0, q }]

    const result = sampleQuaternionAt(buffer, 12345)
    expect(result).not.toBeNull()
    expect(result!.equals(q)).toBe(true)

    // mutating the source should not affect the returned clone
    q.set(1, 2, 3, 4)
    expect(result!.equals(q)).toBe(false)
  })

  it('slerps to the midpoint between two samples', () => {
    const q0 = qFromAxisAngleY(0)
    const q1 = qFromAxisAngleY(90)
    const buffer: QuatSample[] = [{ t: 0, q: q0 }, { t: 1000, q: q1 }]

    const result = sampleQuaternionAt(buffer, 500)
    const expected = qFromAxisAngleY(45)
    expect(result).not.toBeNull()
    expect(result!.angleTo(expected)).toBeLessThan(1e-6)
  })

  it('returns the endpoints exactly at t0 and t1', () => {
    const q0 = qFromAxisAngleY(0)
    const q1 = qFromAxisAngleY(90)
    const buffer: QuatSample[] = [{ t: 0, q: q0 }, { t: 1000, q: q1 }]

    expect(sampleQuaternionAt(buffer, 0)!.angleTo(q0)).toBeLessThan(1e-6)
    expect(sampleQuaternionAt(buffer, 1000)!.angleTo(q1)).toBeLessThan(1e-6)
  })

  it('extrapolates past the last sample while staying unit length', () => {
    const q0 = qFromAxisAngleY(0)
    const q1 = qFromAxisAngleY(90)
    const buffer: QuatSample[] = [{ t: 0, q: q0 }, { t: 1000, q: q1 }]

    // u = 2 -> 180 degrees around Y
    const result = sampleQuaternionAt(buffer, 2000)
    const expected = qFromAxisAngleY(180)
    expect(result).not.toBeNull()
    expect(result!.angleTo(expected)).toBeLessThan(1e-6)
    expect(Math.abs(result!.length() - 1)).toBeLessThan(1e-9)
  })

  it('keeps extrapolating at the same rate indefinitely, with no cap', () => {
    const q0 = qFromAxisAngleY(0)
    const q1 = qFromAxisAngleY(90)
    const buffer: QuatSample[] = [{ t: 0, q: q0 }, { t: 1000, q: q1 }]

    // u = 100 -> 9000 degrees around Y, i.e. 25 full turns past q1 (never clamped)
    const result = sampleQuaternionAt(buffer, 100_000)
    const expected = qFromAxisAngleY(9000)
    expect(result).not.toBeNull()
    expect(result!.angleTo(expected)).toBeLessThan(1e-6)
  })

  it('does not diverge when dt is 0', () => {
    const q0 = qFromAxisAngleY(0)
    const q1 = qFromAxisAngleY(90)
    const buffer: QuatSample[] = [{ t: 1000, q: q0 }, { t: 1000, q: q1 }]

    const result = sampleQuaternionAt(buffer, 1000)
    expect(result).not.toBeNull()
    expect(result!.angleTo(q1)).toBeLessThan(1e-6)
  })

  it('selects the correct bracket among three or more points', () => {
    const q0 = qFromAxisAngleY(0)
    const q1 = qFromAxisAngleY(90)
    const q2 = qFromAxisAngleY(180)
    const buffer: QuatSample[] = [{ t: 0, q: q0 }, { t: 1000, q: q1 }, { t: 2000, q: q2 }]

    const first = sampleQuaternionAt(buffer, 500)
    expect(first!.angleTo(qFromAxisAngleY(45))).toBeLessThan(1e-6)

    const second = sampleQuaternionAt(buffer, 1500)
    expect(second!.angleTo(qFromAxisAngleY(135))).toBeLessThan(1e-6)
  })

  it('clamps u below 0 when targetMs is before the first sample', () => {
    const q0 = qFromAxisAngleY(0)
    const q1 = qFromAxisAngleY(90)
    const buffer: QuatSample[] = [{ t: 1000, q: q0 }, { t: 2000, q: q1 }]

    const result = sampleQuaternionAt(buffer, -5000)
    expect(result).not.toBeNull()
    expect(result!.angleTo(q0)).toBeLessThan(1e-6)
  })
})

const makeFrame = (
  fields: Array<{ name: string; type: FieldType; values: number[] }>,
  refId?: string,
): DataFrame => {
  return {
    refId,
    fields: fields.map(f => ({ name: f.name, type: f.type, values: f.values, config: {} })),
    length: fields.length > 0 ? fields[0].values.length : 0,
  } as unknown as DataFrame
}

describe('collectQuatSamples', () => {
  const names = { x: 'x', y: 'y', z: 'z', w: 'w' }

  it('takes the last maxRows rows in ascending order when a time field is present', () => {
    const frames = [
      makeFrame([
        { name: 'time', type: FieldType.time, values: [0, 1000, 2000, 3000] },
        { name: 'x', type: FieldType.number, values: [0, 0, 0, 0] },
        { name: 'y', type: FieldType.number, values: [0, 0, 0, 0] },
        { name: 'z', type: FieldType.number, values: [0, 0, 0, 0] },
        { name: 'w', type: FieldType.number, values: [1, 1, 1, 1] },
      ]),
    ]

    const samples = collectQuatSamples(frames, names, 'time', 2, 0)
    expect(samples.map(s => s.t)).toEqual([2000, 3000])
  })

  it('normalizes non-unit input quaternions', () => {
    const frames = [
      makeFrame([
        { name: 'time', type: FieldType.time, values: [0] },
        { name: 'x', type: FieldType.number, values: [0] },
        { name: 'y', type: FieldType.number, values: [0] },
        { name: 'z', type: FieldType.number, values: [0] },
        { name: 'w', type: FieldType.number, values: [2] },
      ]),
    ]

    const samples = collectQuatSamples(frames, names, 'time', 10, 0)
    expect(samples).toHaveLength(1)
    expect(Math.abs(samples[0].q.length() - 1)).toBeLessThan(1e-9)
  })

  it('returns an empty array when no frame has all four fields', () => {
    const frames = [
      makeFrame([
        { name: 'x', type: FieldType.number, values: [0] },
        { name: 'y', type: FieldType.number, values: [0] },
      ]),
    ]

    expect(collectQuatSamples(frames, names, 'time', 10, 0)).toEqual([])
  })

  it('returns a single fallback-timed sample when no time field is found', () => {
    const frames = [
      makeFrame([
        { name: 'x', type: FieldType.number, values: [0, 0] },
        { name: 'y', type: FieldType.number, values: [0, 0] },
        { name: 'z', type: FieldType.number, values: [0, 1] },
        { name: 'w', type: FieldType.number, values: [1, 0] },
      ]),
    ]

    const samples = collectQuatSamples(frames, names, '', 10, 42)
    expect(samples).toHaveLength(1)
    expect(samples[0].t).toBe(42)
    expect(samples[0].q.equals(new THREE.Quaternion(0, 0, 1, 0))).toBe(true)
  })

  it('resolves a qualified spec to the matching frame among same-named fields', () => {
    const frames = [
      makeFrame([
        { name: 'time', type: FieldType.time, values: [0] },
        { name: 'q_x', type: FieldType.number, values: [0] },
        { name: 'q_y', type: FieldType.number, values: [0] },
        { name: 'q_z', type: FieldType.number, values: [0] },
        { name: 'q_w', type: FieldType.number, values: [1] },
      ], 'A'),
      makeFrame([
        { name: 'time', type: FieldType.time, values: [0] },
        { name: 'q_x', type: FieldType.number, values: [0] },
        { name: 'q_y', type: FieldType.number, values: [0] },
        { name: 'q_z', type: FieldType.number, values: [1] },
        { name: 'q_w', type: FieldType.number, values: [0] },
      ], 'B'),
    ]

    const qualifiedNames = { x: 'B.q_x', y: 'B.q_y', z: 'B.q_z', w: 'B.q_w' }
    const samples = collectQuatSamples(frames, qualifiedNames, 'time', 10, 0)
    expect(samples).toHaveLength(1)
    expect(samples[0].q.equals(new THREE.Quaternion(0, 0, 1, 0))).toBe(true)
  })

  it('resolves an unqualified (bare) spec as before', () => {
    const frames = [
      makeFrame([
        { name: 'time', type: FieldType.time, values: [0] },
        { name: 'x', type: FieldType.number, values: [0] },
        { name: 'y', type: FieldType.number, values: [0] },
        { name: 'z', type: FieldType.number, values: [1] },
        { name: 'w', type: FieldType.number, values: [0] },
      ], 'A'),
    ]

    const samples = collectQuatSamples(frames, names, 'time', 10, 0)
    expect(samples).toHaveLength(1)
    expect(samples[0].q.equals(new THREE.Quaternion(0, 0, 1, 0))).toBe(true)
  })
})
