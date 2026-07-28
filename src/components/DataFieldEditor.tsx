import React from 'react'
import { css } from '@emotion/css'
import { DataFrame, GrafanaTheme2 } from '@grafana/data'
import { Combobox, Field, Input, RadioButtonGroup, Stack, useStyles2 } from '@grafana/ui'
import { DataField, DataSourceType } from '../types'
import { getNumericFieldOptions, getTimeFieldOptions } from './dataFields'

interface DataFieldEditorProps {
  label: string
  value: DataField | undefined
  onChange: (v: DataField) => void
  data?: DataFrame[]
  fieldKind?: 'number' | 'time'
  placeholder?: string
}

const sourceTypeOptions: Array<{ label: string; value: DataSourceType }> = [
  { label: 'Const', value: 'const' },
  { label: 'Field', value: 'field' },
]

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css`
    margin-bottom: ${theme.spacing(1)};
  `,
})

export const DataFieldEditor = ({
  label,
  value,
  onChange,
  data,
  fieldKind = 'number',
  placeholder,
}: DataFieldEditorProps) => {
  const styles = useStyles2(getStyles)
  const current = value ?? { sourceType: 'const' as DataSourceType, value: '0' }

  const rawOptions = fieldKind === 'time' ? getTimeFieldOptions(data ?? []) : getNumericFieldOptions(data ?? [])
  // Combobox requires a non-optional `value`, whereas SelectableValue's is optional.
  const fieldOptions = rawOptions
    .filter((o) => o.value !== undefined)
    .map((o) => ({ label: o.label, value: o.value as string }))

  return (
    <div className={styles.wrapper}>
      <Field label={label}>
        <Stack direction="column" gap={0.5}>
          <RadioButtonGroup
            options={sourceTypeOptions}
            value={current.sourceType}
            onChange={(sourceType) => onChange({ ...current, sourceType })}
            size="sm"
            fullWidth
          />
          {current.sourceType === 'const' ? (
            <Input
              type="text"
              value={current.value}
              placeholder={placeholder}
              onChange={(e) => onChange({ ...current, value: e.currentTarget.value })}
            />
          ) : (
            <Combobox
              options={fieldOptions}
              value={current.value}
              placeholder={placeholder ?? 'Select field'}
              isClearable
              createCustomValue
              onChange={(option) => onChange({ ...current, value: option?.value ?? '' })}
            />
          )}
        </Stack>
      </Field>
    </div>
  )
}
