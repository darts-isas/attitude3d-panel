import { DataFrame, Field, FieldType } from '@grafana/data'
import {
  clampBrightness,
  getDataFieldValue,
  getLastFieldValue,
  getLastRawFieldValue,
  getNumericFieldOptions,
  getTimeFieldOptions,
  resolveField,
  resolveFieldInFrame,
} from './dataFields'
import { createDataField } from 'types'

const makeFrame = (
  refId: string | undefined,
  fields: Array<{ name: string; type: FieldType; values: number[] }>,
  name?: string,
): DataFrame => {
  return {
    name,
    refId,
    fields: fields.map(f => ({ name: f.name, type: f.type, values: f.values, config: {} })),
    length: fields.length > 0 ? fields[0].values.length : 0,
  } as unknown as DataFrame
}

describe('resolveFieldInFrame', () => {
  it('resolves a bare field name', () => {
    const frame = makeFrame('A', [{ name: 'q_x', type: FieldType.number, values: [1] }])
    expect(resolveFieldInFrame(frame, 'q_x')?.name).toBe('q_x')
  })

  it('resolves a qualified field name', () => {
    const frame = makeFrame('A', [{ name: 'q_x', type: FieldType.number, values: [1] }])
    expect(resolveFieldInFrame(frame, 'A.q_x')?.name).toBe('q_x')
  })

  it('does not match a positional "Query-N" label when index is omitted (default -1)', () => {
    const frame = makeFrame(undefined, [{ name: 'q_x', type: FieldType.number, values: [1] }])
    expect(resolveFieldInFrame(frame, 'Query-1.q_x')).toBeUndefined()
  })

  it('still falls back to a bare field name match when index is omitted', () => {
    const frame = makeFrame(undefined, [{ name: 'q_x', type: FieldType.number, values: [1] }])
    expect(resolveFieldInFrame(frame, 'q_x')?.name).toBe('q_x')
  })

  it('matches a positional "Query-N" label when the frame index is passed', () => {
    const frame = makeFrame(undefined, [{ name: 'q_x', type: FieldType.number, values: [1] }])
    expect(resolveFieldInFrame(frame, 'Query-1.q_x', 0)?.name).toBe('q_x')
  })
})

describe('resolveField', () => {
  it('resolves a qualified spec', () => {
    const frames = [makeFrame('A', [{ name: 'q_x', type: FieldType.number, values: [1] }])]
    expect(resolveField(frames, 'A.q_x')?.name).toBe('q_x')
  })

  it('resolves a bare spec', () => {
    const frames = [makeFrame('A', [{ name: 'q_x', type: FieldType.number, values: [1] }])]
    expect(resolveField(frames, 'q_x')?.name).toBe('q_x')
  })

  it('picks the field from the frame matching the qualified spec when the same field name exists in multiple frames', () => {
    const frames = [
      makeFrame('A', [{ name: 'q_x', type: FieldType.number, values: [1] }]),
      makeFrame('B', [{ name: 'q_x', type: FieldType.number, values: [2] }]),
    ]

    const field = resolveField(frames, 'B.q_x')
    expect(field).toBeDefined()
    expect(getLastFieldValue(field!)).toBe(2)
  })

  it('resolves a spec whose field name itself contains dots', () => {
    const frames = [makeFrame('A', [{ name: 'adcs.q_x', type: FieldType.number, values: [5] }])]
    expect(resolveField(frames, 'A.adcs.q_x')?.name).toBe('adcs.q_x')
  })

  it('returns undefined when the spec cannot be resolved', () => {
    const frames = [makeFrame('A', [{ name: 'q_x', type: FieldType.number, values: [1] }])]
    expect(resolveField(frames, 'A.missing')).toBeUndefined()
    expect(resolveField(frames, 'missing')).toBeUndefined()
  })

  it('returns undefined for undefined/null series', () => {
    expect(resolveField(undefined, 'q_x')).toBeUndefined()
    expect(resolveField(null, 'q_x')).toBeUndefined()
  })

  it('picks the field from the second frame via its positional "Query-2" label when both frames are unnamed and share a field name', () => {
    const frames = [
      makeFrame(undefined, [{ name: 'q_x', type: FieldType.number, values: [1] }]),
      makeFrame(undefined, [{ name: 'q_x', type: FieldType.number, values: [2] }]),
    ]

    const field = resolveField(frames, 'Query-2.q_x')
    expect(field).toBeDefined()
    expect(getLastFieldValue(field!)).toBe(2)
  })

  // frameLabel() only falls back to "Query-N" when a frame has neither name nor refId, so for a
  // frame that does have a refId, the positional label is the refId itself, not "Query-N". This
  // documents that current behavior rather than assuming the positional label is always available.
  it('resolves via refId, but NOT via the positional "Query-N" label, for a frame that has a refId', () => {
    const frame = makeFrame('A', [{ name: 'q_x', type: FieldType.number, values: [1] }])
    expect(resolveField([frame], 'A.q_x')?.name).toBe('q_x')
    expect(resolveField([frame], 'Query-1.q_x')).toBeUndefined()
  })
})

describe('display name resolution', () => {
  // organize/renameByName sets config.displayName only; field.name keeps the raw name.
  const renamed = (): DataFrame => ({
    refId: 'A',
    length: 1,
    fields: [{ name: 'GNA.H2A.Q1_A', type: FieldType.number, values: [7], config: { displayName: 'Q1' } }],
  } as unknown as DataFrame)

  it('resolves a field by its display name, bare and qualified', () => {
    expect(resolveField([renamed()], 'Q1')?.name).toBe('GNA.H2A.Q1_A')
    expect(resolveField([renamed()], 'A.Q1')?.name).toBe('GNA.H2A.Q1_A')
    expect(resolveFieldInFrame(renamed(), 'Q1')?.name).toBe('GNA.H2A.Q1_A')
  })

  it('still resolves by the raw field name', () => {
    expect(resolveField([renamed()], 'GNA.H2A.Q1_A')).toBeDefined()
  })

  it('prefers an exact field.name over another field\'s displayName', () => {
    const frame = {
      refId: 'A',
      length: 1,
      fields: [
        { name: 'a', type: FieldType.number, values: [1], config: { displayName: 'b' } },
        { name: 'b', type: FieldType.number, values: [2], config: {} },
      ],
    } as unknown as DataFrame
    expect(resolveField([frame], 'b')?.values[0]).toBe(2)
  })

  it('offers the display name in the editor options', () => {
    expect(getNumericFieldOptions([renamed()]).map(o => o.value)).toEqual(['A.Q1'])
  })
})

describe('getLastFieldValue', () => {
  it('returns undefined when there are no rows', () => {
    const field = { name: 'q_x', type: FieldType.number, values: [], config: {} } as unknown as Field
    expect(getLastFieldValue(field)).toBeUndefined()
  })

  it('returns undefined when no value is finite', () => {
    const field = { name: 'q_x', type: FieldType.number, values: [NaN, NaN], config: {} } as unknown as Field
    expect(getLastFieldValue(field)).toBeUndefined()
  })

  it('skips a trailing NaN row, e.g. calculateField output over a concatenated frame', () => {
    const field = { name: 'Sun_dx', type: FieldType.number, values: [-5, NaN], config: {} } as unknown as Field
    expect(getLastFieldValue(field)).toBe(-5)
  })

  it('skips trailing null/undefined rows left by a concatenate transformation', () => {
    const field = { name: 'Sun_dx', type: FieldType.number, values: [-5, undefined, null], config: {} } as unknown as Field
    expect(getLastFieldValue(field)).toBe(-5)
  })

  it('returns undefined when every row is empty', () => {
    const field = { name: 'Sun_dx', type: FieldType.number, values: [null, undefined], config: {} } as unknown as Field
    expect(getLastFieldValue(field)).toBeUndefined()
  })
})

describe('getLastRawFieldValue', () => {
  const make = (values: unknown[]) => ({ name: 'f', type: FieldType.other, values, config: {} } as unknown as Field)

  it('skips trailing null/undefined/NaN rows', () => {
    expect(getLastRawFieldValue(make([3, null, undefined, NaN]))).toBe(3)
  })

  it('keeps string values, including non-numeric ones', () => {
    expect(getLastRawFieldValue(make(['SAFE', null]))).toBe('SAFE')
  })

  it('returns undefined when every row is empty', () => {
    expect(getLastRawFieldValue(make([null, NaN]))).toBeUndefined()
    expect(getLastRawFieldValue(make([]))).toBeUndefined()
  })
})

describe('getDataFieldValue', () => {
  it('parses a decimal const value (not parseInt)', () => {
    const df = createDataField('0.7071', 'const')
    expect(getDataFieldValue([], df, -1)).toBe(0.7071)
  })

  it('returns the last row of a resolved field', () => {
    const frames = [makeFrame('A', [{ name: 'q_x', type: FieldType.number, values: [1, 2, 3] }])]
    const df = createDataField('A.q_x', 'field')
    expect(getDataFieldValue(frames, df, -1)).toBe(3)
  })

  it('falls back for a non-finite const value', () => {
    const df = createDataField('not-a-number', 'const')
    expect(getDataFieldValue([], df, 99)).toBe(99)
  })

  it('falls back for an empty spec', () => {
    const df = createDataField('', 'field')
    expect(getDataFieldValue([], df, 99)).toBe(99)
  })

  it('falls back when the field cannot be resolved', () => {
    const frames = [makeFrame('A', [{ name: 'q_x', type: FieldType.number, values: [1] }])]
    const df = createDataField('A.missing', 'field')
    expect(getDataFieldValue(frames, df, 99)).toBe(99)
  })
})

describe('clampBrightness', () => {
  it('passes values already within 0-1 through unchanged', () => {
    expect(clampBrightness(0)).toBe(0)
    expect(clampBrightness(0.5)).toBe(0.5)
    expect(clampBrightness(1)).toBe(1)
  })

  it('saturates values above 1 to 1 and below 0 to 0', () => {
    expect(clampBrightness(2)).toBe(1)
    expect(clampBrightness(-1)).toBe(0)
  })

  it('falls back to unchanged (1) for non-finite values', () => {
    expect(clampBrightness(NaN)).toBe(1)
    expect(clampBrightness(Infinity)).toBe(1)
    expect(clampBrightness(-Infinity)).toBe(1)
  })
})

describe('getNumericFieldOptions', () => {
  it('excludes time fields and labels an unnamed frame as Query-1', () => {
    const frame = makeFrame(undefined, [
      { name: 'time', type: FieldType.time, values: [0] },
      { name: 'q_x', type: FieldType.number, values: [1] },
    ])

    const options = getNumericFieldOptions([frame])
    expect(options).toEqual([{ value: 'Query-1.q_x', label: 'Query-1 → q_x' }])
  })

  it('resolves round-trip: a value produced for an unnamed frame can be resolved back to its field', () => {
    const frame = makeFrame(undefined, [{ name: 'q_x', type: FieldType.number, values: [42] }])

    const options = getNumericFieldOptions([frame])
    const value = options[0].value!

    const field = resolveField([frame], value)
    expect(field?.name).toBe('q_x')
    expect(getLastFieldValue(field!)).toBe(42)
  })
})

describe('getTimeFieldOptions', () => {
  it('only returns time fields', () => {
    const frame = makeFrame('A', [
      { name: 'time', type: FieldType.time, values: [0] },
      { name: 'q_x', type: FieldType.number, values: [1] },
    ])

    const options = getTimeFieldOptions([frame])
    expect(options).toEqual([{ value: 'A.time', label: 'A → time' }])
  })

  it('resolves round-trip: a value produced for an unnamed frame can be resolved back to its field', () => {
    const frame = makeFrame(undefined, [{ name: 'time', type: FieldType.time, values: [123] }])

    const options = getTimeFieldOptions([frame])
    const value = options[0].value!

    const field = resolveField([frame], value)
    expect(field?.name).toBe('time')
    expect(getLastFieldValue(field!)).toBe(123)
  })
})
