import { DataFrame, Field, FieldType, SelectableValue } from '@grafana/data'
import { DataField } from 'types'

const frameLabel = (frame: DataFrame, index: number): string => {
  const label = frame.name ?? frame.refId ?? ''
  return label !== '' ? label : `Query-${index + 1}`
}

// The name a user sees (Table view, "Organize fields" renames): transformations such as
// organize's renameByName only set config.displayName and leave field.name untouched.
const shownName = (field: Field): string => field.config?.displayName ?? field.name

// Exact field.name wins, so specs saved before display names were supported keep resolving
// to the same field; displayName is the fallback.
const findFieldByName = (frame: DataFrame, name: string): Field | undefined =>
  frame.fields.find(f => f.name === name) ?? frame.fields.find(f => f.config?.displayName === name)

// Try the qualified form "<label>.<fieldName>". Field names may themselves contain dots, so
// the prefix is stripped and the remainder compared against the whole field name, rather than
// splitting on the first dot.
const matchQualified = (frame: DataFrame, spec: string, label: string): Field | undefined => {
  const prefix = `${label}.`
  if (label === '' || !spec.startsWith(prefix)) { return undefined }
  const fieldName = spec.slice(prefix.length)
  return findFieldByName(frame, fieldName)
}

// Resolve a field spec ("<seriesLabel>.<fieldName>" or bare "<fieldName>") within a single
// frame. Pass the frame's index when it is known, so specs picked from the editor's dropdown
// for an unnamed frame — which are labelled "Query-N" — resolve too.
export const resolveFieldInFrame = (frame: DataFrame, spec: string, index = -1): Field | undefined => {
  const qualified = matchQualified(frame, spec, frame.name ?? frame.refId ?? '')
  if (qualified) { return qualified }

  if (index >= 0) {
    const byPosition = matchQualified(frame, spec, frameLabel(frame, index))
    if (byPosition) { return byPosition }
  }

  return findFieldByName(frame, spec)
}

// Resolve a field spec across all frames. Qualified matches (frame label matches the spec's
// prefix) take priority over bare matches, so that the same field name in multiple frames is
// disambiguated correctly.
export const resolveField = (series: DataFrame[] | undefined | null, spec: string): Field | undefined => {
  if (!series || spec === '') { return undefined }

  for (let i = 0; i < series.length; i++) {
    const frame = series[i]
    const field = matchQualified(frame, spec, frame.name ?? frame.refId ?? '')
      ?? matchQualified(frame, spec, frameLabel(frame, i))
    if (field) { return field }
  }

  for (const frame of series) {
    const field = findFieldByName(frame, spec)
    if (field) { return field }
  }

  return undefined
}

// Returns the last finite value, skipping trailing empty rows: transformations such as
// "concatenate" pad a field with empty rows when the frames being joined differ in length
// (and "calculateField" turns those into NaN), so the literal last row can be empty even
// though the field's latest real sample sits just before it.
export const getLastFieldValue = (field: Field): number | undefined => {
  const values = field.values
  if (!values) { return undefined }

  for (let i = values.length - 1; i >= 0; i--) {
    const raw = values[i]
    if (raw === null || raw === undefined) { continue }

    const value = Number(raw)
    if (Number.isFinite(value)) { return value }
  }

  return undefined
}

// Unlike getLastFieldValue, this returns the raw last value untouched — needed for string
// fields (e.g. a mode name), where coercing through Number() would discard the value.
export const getLastRawFieldValue = (field: Field): unknown => {
  const values = field.values
  if (!values || values.length === 0) { return undefined }

  return values[values.length - 1]
}

// Brightness is always displayed in the 0-1 range: values above 1 saturate to fully bright
// (unchanged), values below 0 saturate to fully black, non-finite values fall back to
// unchanged.
export const clampBrightness = (value: number): number => {
  if (!Number.isFinite(value)) { return 1 }
  return Math.min(1, Math.max(0, value))
}

export const getDataFieldValue = (
  series: DataFrame[] | undefined | null,
  df: DataField | undefined,
  fallback: number,
): number => {
  if (!df) { return fallback }

  if (df.sourceType === 'const') {
    const value = parseFloat(df.value)
    return Number.isFinite(value) ? value : fallback
  }

  const field = resolveField(series, df.value)
  if (!field) { return fallback }

  const value = getLastFieldValue(field)
  return value !== undefined ? value : fallback
}

// fieldType omitted means "any type" — used by getAllFieldOptions below.
const getFieldOptionsByType = (
  series: DataFrame[] | undefined | null,
  fieldType?: FieldType,
): Array<SelectableValue<string>> => {
  if (!series) { return [] }

  const options: Array<SelectableValue<string>> = []
  const seen = new Set<string>()

  series.forEach((frame, index) => {
    const label = frameLabel(frame, index)
    frame.fields.forEach(field => {
      if (fieldType !== undefined && field.type !== fieldType) { return }

      const shown = shownName(field)
      const value = `${label}.${shown}`
      if (seen.has(value)) { return }
      seen.add(value)

      options.push({ value, label: `${label} → ${shown}` })
    })
  })

  return options
}

export const getNumericFieldOptions = (series: DataFrame[] | undefined | null): Array<SelectableValue<string>> => {
  return getFieldOptionsByType(series, FieldType.number)
}

export const getTimeFieldOptions = (series: DataFrame[] | undefined | null): Array<SelectableValue<string>> => {
  return getFieldOptionsByType(series, FieldType.time)
}

// Used by the Key Parameters editor, where the displayed value can come from a field of
// any type (numeric, string, time, boolean, ...).
export const getAllFieldOptions = (series: DataFrame[] | undefined | null): Array<SelectableValue<string>> => {
  return getFieldOptionsByType(series)
}
