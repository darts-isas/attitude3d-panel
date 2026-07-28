import React, { useEffect } from 'react'
import { StandardEditorProps } from '@grafana/data'
import { Combobox } from '@grafana/ui'
import { ModelObject, ORIGIN_TARGET_ID } from '../types'

export const TargetObjectEditor = ({ value, onChange, context }: StandardEditorProps<string>) => {
  const objectsOption = context.options?.objects
  const objects: ModelObject[] = Array.isArray(objectsOption) ? objectsOption : []

  const options = [
    { value: ORIGIN_TARGET_ID, label: 'Origin (0, 0, 0)' },
    ...objects.map((obj) => ({ value: obj.id, label: obj.name || '(unnamed)' })),
  ]

  const currentValue = options.some((o) => o.value === value) ? value : ORIGIN_TARGET_ID

  useEffect(() => {
    // If the stored value points at an object that no longer exists, persist the fallback
    // to Origin instead of only falling back for display, so the stale id doesn't linger in
    // the saved dashboard options. Only run once `objects` is actually available, otherwise
    // an initial render with objects still undefined could wrongly clear a valid value.
    if (!Array.isArray(objectsOption)) {
      return
    }
    if (value !== ORIGIN_TARGET_ID && !objectsOption.some((obj: ModelObject) => obj.id === value)) {
      onChange(ORIGIN_TARGET_ID)
    }
  }, [value, objectsOption, onChange])

  return (
    <Combobox
      options={options}
      value={currentValue}
      isClearable={false}
      onChange={(option) => onChange(option?.value ?? ORIGIN_TARGET_ID)}
    />
  )
}
