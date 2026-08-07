import { Attitude3DOptions, DataField, ModelObject, ORIGIN_TARGET_ID } from './types'

// Legacy (pre multi-object) shape. Only the migration handler touches these.
export type LegacyOptions = {
  objects?: unknown
  modelURI?: string
  modelCenter?: 'origin' | 'sphere' | 'average'
  modelRotationType?: 'field' | 'input'
  modelRotationX?: string
  modelRotationY?: string
  modelRotationZ?: string
  modelRotationW?: string
  quatInterpEnabled?: boolean
  quatInterpTimeField?: string
  quatInterpBufferSize?: number
  // Removed dead options — stripped on migration.
  quatInterpMaxExtrapMs?: unknown
  cameraDistanceType?: unknown
  directionalLightIntensityType?: unknown
  ambientLightIntensityType?: unknown
}

// A legacy rotation slot was either a field name or a numeric constant, chosen by
// modelRotationType. Note the constant may be a number, not a string.
const toDataField = (type: 'field' | 'input' | undefined, raw: unknown, fallback: string): DataField => {
  if (type === 'field') {
    return { sourceType: 'field', value: raw === undefined || raw === null ? '' : String(raw) }
  }
  const value = raw === undefined || raw === null || raw === '' ? fallback : String(raw)
  return { sourceType: 'const', value }
}

export const migrateOptions = (rawOptions: unknown): Attitude3DOptions => {
  const {
    modelURI,
    modelCenter,
    modelRotationType,
    modelRotationX,
    modelRotationY,
    modelRotationZ,
    modelRotationW,
    quatInterpEnabled,
    quatInterpTimeField,
    quatInterpBufferSize,
    quatInterpMaxExtrapMs: _quatInterpMaxExtrapMs,
    cameraDistanceType: _cameraDistanceType,
    directionalLightIntensityType: _directionalLightIntensityType,
    ambientLightIntensityType: _ambientLightIntensityType,
    ...rest
  } = (rawOptions ?? {}) as Attitude3DOptions & LegacyOptions

  // Already migrated, or a brand new panel whose defaults are about to be applied.
  if (Array.isArray(rest.objects)) {
    return rest as Attitude3DOptions
  }
  if (modelURI === undefined && modelRotationType === undefined) {
    return { ...rest, objects: [] } as Attitude3DOptions
  }

  const migrated: ModelObject = {
    id: 'migrated',
    name: 'Model 1',
    visible: true,
    modelURI: modelURI ?? '',
    modelCenter: modelCenter ?? 'sphere',
    scale: 1,
    brightness: { sourceType: 'const', value: '1' },
    posX: { sourceType: 'const', value: '0' },
    posY: { sourceType: 'const', value: '0' },
    posZ: { sourceType: 'const', value: '0' },
    quatX: toDataField(modelRotationType, modelRotationX, '0'),
    quatY: toDataField(modelRotationType, modelRotationY, '0'),
    quatZ: toDataField(modelRotationType, modelRotationZ, '0'),
    quatW: toDataField(modelRotationType, modelRotationW, '1'),
    interpEnabled: quatInterpEnabled === true,
    interpTimeField: quatInterpTimeField ?? '',
    interpBufferSize: quatInterpBufferSize ?? 2,
    interpCatchUpMs: 300,
  }

  // The legacy model sat at the origin and the camera looked at the origin, so
  // targeting the origin reproduces the old view exactly.
  return { ...rest, cameraTargetId: ORIGIN_TARGET_ID, objects: [migrated] } as Attitude3DOptions
}
