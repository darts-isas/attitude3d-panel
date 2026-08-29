import { migrateOptions } from './migrations'
import { ORIGIN_TARGET_ID } from './types'

describe('migrateOptions', () => {
  it('migrates a legacy constant-mode config', () => {
    const result = migrateOptions({
      modelRotationType: 'input',
      modelRotationX: 0,
      modelRotationW: 1,
    })

    expect(result.objects).toHaveLength(1)
    expect(result.objects[0].quatX).toEqual({ sourceType: 'const', value: '0' })
    expect(result.objects[0].quatW).toEqual({ sourceType: 'const', value: '1' })
  })

  it('does not lose a decimal constant to the old parseInt bug', () => {
    const result = migrateOptions({
      modelRotationType: 'input',
      modelRotationX: 0.7071,
    })

    expect(result.objects[0].quatX).toEqual({ sourceType: 'const', value: '0.7071' })
  })

  it('migrates a legacy field-mode config', () => {
    const result = migrateOptions({
      modelRotationType: 'field',
      modelRotationX: 'q_x',
    })

    expect(result.objects[0].quatX).toEqual({ sourceType: 'field', value: 'q_x' })
  })

  it('defaults unset rotation slots to const, with W defaulting to 1 and X/Y/Z to 0', () => {
    const result = migrateOptions({
      modelRotationType: 'input',
      modelRotationW: undefined,
    })

    const [object] = result.objects
    expect(object.quatX).toEqual({ sourceType: 'const', value: '0' })
    expect(object.quatY).toEqual({ sourceType: 'const', value: '0' })
    expect(object.quatZ).toEqual({ sourceType: 'const', value: '0' })
    expect(object.quatW).toEqual({ sourceType: 'const', value: '1' })
  })

  it('carries over modelURI and modelCenter, defaulting modelCenter to sphere', () => {
    const result = migrateOptions({
      modelRotationType: 'input',
      modelURI: 'https://example.com/model.glb',
    })

    expect(result.objects[0].modelURI).toBe('https://example.com/model.glb')
    expect(result.objects[0].modelCenter).toBe('sphere')
  })

  it('carries over an explicit modelCenter', () => {
    const result = migrateOptions({
      modelRotationType: 'input',
      modelCenter: 'average',
    })

    expect(result.objects[0].modelCenter).toBe('average')
  })

  it('carries over quatInterp* into interp*, with defaults when unset', () => {
    const result = migrateOptions({
      modelRotationType: 'input',
      quatInterpEnabled: true,
      quatInterpTimeField: 'time',
      quatInterpBufferSize: 10,
    })

    const [object] = result.objects
    expect(object.interpEnabled).toBe(true)
    expect(object.interpTimeField).toBe('time')
    expect(object.interpBufferSize).toBe(10)
    expect(object.interpCatchUpMs).toBe(300)
  })

  it('defaults interp* fields when quatInterp* are unset', () => {
    const result = migrateOptions({
      modelRotationType: 'input',
    })

    const [object] = result.objects
    expect(object.interpEnabled).toBe(false)
    expect(object.interpTimeField).toBe('')
    expect(object.interpBufferSize).toBe(2)
    expect(object.interpCatchUpMs).toBe(300)
  })

  it('sets position to const 0, visible true, scale 1, and cameraTargetId to origin', () => {
    const result = migrateOptions({
      modelRotationType: 'input',
    })

    const [object] = result.objects
    expect(object.posX).toEqual({ sourceType: 'const', value: '0' })
    expect(object.posY).toEqual({ sourceType: 'const', value: '0' })
    expect(object.posZ).toEqual({ sourceType: 'const', value: '0' })
    expect(object.visible).toBe(true)
    expect(object.scale).toBe(1)
    expect(result.cameraTargetId).toBe(ORIGIN_TARGET_ID)
  })

  it('defaults the migrated object to unchanged brightness', () => {
    const result = migrateOptions({
      modelRotationType: 'input',
    })

    expect(result.objects[0].brightness).toEqual({ sourceType: 'const', value: '1' })
  })

  it('strips legacy keys from the migrated result', () => {
    const result = migrateOptions({
      modelURI: 'https://example.com/model.glb',
      modelCenter: 'average',
      modelRotationType: 'input',
      modelRotationX: 0,
      modelRotationY: 0,
      modelRotationZ: 0,
      modelRotationW: 1,
      quatInterpEnabled: true,
      quatInterpTimeField: 'time',
      quatInterpBufferSize: 10,
      quatInterpMaxExtrapMs: 1000,
      cameraDistanceType: 'input',
      directionalLightIntensityType: 'input',
      ambientLightIntensityType: 'input',
    }) as unknown as Record<string, unknown>

    expect(result.modelURI).toBeUndefined()
    expect(result.modelCenter).toBeUndefined()
    expect(result.modelRotationType).toBeUndefined()
    expect(result.modelRotationX).toBeUndefined()
    expect(result.modelRotationY).toBeUndefined()
    expect(result.modelRotationZ).toBeUndefined()
    expect(result.modelRotationW).toBeUndefined()
    expect(result.quatInterpEnabled).toBeUndefined()
    expect(result.quatInterpTimeField).toBeUndefined()
    expect(result.quatInterpBufferSize).toBeUndefined()
    expect(result.quatInterpMaxExtrapMs).toBeUndefined()
    expect(result.cameraDistanceType).toBeUndefined()
    expect(result.directionalLightIntensityType).toBeUndefined()
    expect(result.ambientLightIntensityType).toBeUndefined()

    expect(Object.keys(result)).not.toEqual(
      expect.arrayContaining([
        'modelURI',
        'modelCenter',
        'modelRotationType',
        'modelRotationX',
        'modelRotationY',
        'modelRotationZ',
        'modelRotationW',
        'quatInterpEnabled',
        'quatInterpTimeField',
        'quatInterpBufferSize',
        'quatInterpMaxExtrapMs',
        'cameraDistanceType',
        'directionalLightIntensityType',
        'ambientLightIntensityType',
      ])
    )
  })

  it('preserves camera, light, and background settings that are not part of the legacy shape', () => {
    const result = migrateOptions({
      modelRotationType: 'input',
      cameraDistance: '3',
      backgroundColor: '#123456',
      directionalLightColor: '#abcdef',
    }) as unknown as Record<string, unknown>

    expect(result.cameraDistance).toBe('3')
    expect(result.backgroundColor).toBe('#123456')
    expect(result.directionalLightColor).toBe('#abcdef')
  })

  it('is idempotent: migrating an already-migrated result again is a no-op', () => {
    const once = migrateOptions({
      modelRotationType: 'input',
      modelRotationX: 0.5,
      modelURI: 'https://example.com/model.glb',
    })

    const twice = migrateOptions(once)

    expect(twice).toEqual(once)
  })

  it('returns already-migrated options unchanged when objects is already an array', () => {
    const alreadyMigrated = {
      objects: [{ id: 'a', name: 'A' }],
      cameraTargetId: 'a',
      backgroundColor: '#000000',
    }

    const result = migrateOptions(alreadyMigrated)

    expect(result).toEqual(alreadyMigrated)
  })

  it('treats a panel with no legacy keys as new, adding an empty objects array', () => {
    const result = migrateOptions({
      backgroundColor: '#000000',
      cameraDistance: '2',
    }) as unknown as Record<string, unknown>

    expect(result.objects).toEqual([])
    expect(result.backgroundColor).toBe('#000000')
    expect(result.cameraDistance).toBe('2')
  })

  it('does not throw for undefined options', () => {
    const result = migrateOptions(undefined)
    expect(result.objects).toEqual([])
  })

  it('does not throw for null options', () => {
    const result = migrateOptions(null)
    expect(result.objects).toEqual([])
  })

  it('leaves a pre-Key-Parameters panel JSON untouched, without injecting the new keys', () => {
    // Regression test: dashboards saved before the Key Parameters feature was added have
    // none of the keyParam* keys. The migration handler must not require or inject them —
    // that is the panel-options builder's defaultValue's job, not the migration's.
    const legacy = {
      objects: [{ id: 'a', name: 'A' }],
      cameraTargetId: 'a',
      backgroundColor: '#000000',
    } as unknown as Record<string, unknown>

    const result = migrateOptions(legacy) as unknown as Record<string, unknown>

    expect(result).toEqual(legacy)
    expect(result.keyParams).toBeUndefined()
  })
})
