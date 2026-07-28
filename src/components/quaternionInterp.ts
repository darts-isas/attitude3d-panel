import * as THREE from 'three'
import { DataFrame, FieldType } from '@grafana/data'
import { resolveFieldInFrame } from './dataFields'

export type QuatSample = { t: number; q: THREE.Quaternion }

// Sample a quaternion buffer (sorted by t ascending) at targetMs, slerping between the
// bracketing pair. THREE.Quaternion.slerp implements the great-circle formula
// (ratioA = sin((1-t)*theta)/sin(theta), ratioB = sin(t*theta)/sin(theta)), so u > 1 still
// extrapolates correctly along the great circle while keeping the result unit length.
export const sampleQuaternionAt = (
  buffer: QuatSample[],
  targetMs: number,
  maxExtrapMs: number,
): THREE.Quaternion | null => {
  if (buffer.length === 0) { return null }
  if (buffer.length === 1) { return buffer[0].q.clone() }

  const n = buffer.length
  const tLast = buffer[n - 1].t
  const tEff = Math.min(targetMs, tLast + maxExtrapMs)

  let a = buffer[0]
  let b = buffer[1]

  if (tEff >= tLast) {
    a = buffer[n - 2]
    b = buffer[n - 1]
  }
  else if (tEff <= buffer[0].t) {
    a = buffer[0]
    b = buffer[1]
  }
  else {
    for (let i = 0; i < n - 1; i++) {
      if (buffer[i].t <= tEff && tEff <= buffer[i + 1].t) {
        a = buffer[i]
        b = buffer[i + 1]
        break
      }
    }
  }

  const dt = b.t - a.t
  if (dt < 1) { return b.q.clone() }

  let u = (tEff - a.t) / dt
  if (u < 0) { u = 0 }

  return a.q.clone().slerp(b.q, u)
}

export const collectQuatSamples = (
  frames: DataFrame[],
  names: { x: string; y: string; z: string; w: string },
  timeFieldName: string,
  maxRows: number,
  fallbackTimeMs: number,
): QuatSample[] => {
  const index = frames.findIndex((f, i) => {
    const hasX = !!resolveFieldInFrame(f, names.x, i)
    const hasY = !!resolveFieldInFrame(f, names.y, i)
    const hasZ = !!resolveFieldInFrame(f, names.z, i)
    const hasW = !!resolveFieldInFrame(f, names.w, i)
    return hasX && hasY && hasZ && hasW
  })
  if (index < 0) { return [] }
  const frame = frames[index]

  const xField = resolveFieldInFrame(frame, names.x, index)
  const yField = resolveFieldInFrame(frame, names.y, index)
  const zField = resolveFieldInFrame(frame, names.z, index)
  const wField = resolveFieldInFrame(frame, names.w, index)
  if (!xField || !yField || !zField || !wField) { return [] }

  let timeField = timeFieldName ? resolveFieldInFrame(frame, timeFieldName, index) : undefined
  if (!timeField) {
    timeField = frame.fields.find(field => field.type === FieldType.time)
  }

  const len = Math.min(xField.values.length, yField.values.length, zField.values.length, wField.values.length)
  if (len === 0) { return [] }

  if (!timeField) {
    const i = len - 1
    const x = Number(xField.values[i])
    const y = Number(yField.values[i])
    const z = Number(zField.values[i])
    const w = Number(wField.values[i])
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(w)) { return [] }

    const q = new THREE.Quaternion(x, y, z, w)
    if (q.length() === 0) { return [] }
    q.normalize()
    return [{ t: fallbackTimeMs, q }]
  }

  const rows = Math.max(1, maxRows)
  const start = Math.max(0, len - rows)

  const samples: QuatSample[] = []
  for (let i = start; i < len; i++) {
    const x = Number(xField.values[i])
    const y = Number(yField.values[i])
    const z = Number(zField.values[i])
    const w = Number(wField.values[i])
    const t = Number(timeField.values[i])

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(w)) { continue }
    if (!Number.isFinite(t)) { continue }

    const q = new THREE.Quaternion(x, y, z, w)
    if (q.length() === 0) { continue }
    q.normalize()

    samples.push({ t, q })
  }

  samples.sort((a, b) => a.t - b.t)
  return samples
}
