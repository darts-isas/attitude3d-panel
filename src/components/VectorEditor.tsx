import React from 'react'
import { StandardEditorProps } from '@grafana/data'
import { Input, Text } from '@grafana/ui'

interface VectorEditorOptions {
  labels: string[];
}

type VectorEditorProps = StandardEditorProps<string[], VectorEditorOptions>

type VectorItem = {
  value: string;
  label: string;
}

export const VectorEditor = ({ value, onChange, item }: VectorEditorProps) => {
  const values: VectorItem[] = value.map((v, idx) => {
    return {
      value: v,
      label: item.settings?.labels?.[idx] || ''
    }
  })
  return (
    <>
      { values.map((v, idx) => {
        return (
          <div key={`vector-edit-item-${idx}`} style={{display:'flex', justifyContent:'center', alignItems:'center'}}>
            <div style={{width: '1.5em'}}><Text>{v.label}</Text></div>
            <Input
              key={idx}
              // type="number"
              value={v.value}
              onChange={ev => {
                const newValues = [...values]
                newValues[idx].value = ev.currentTarget.value
                onChange(newValues.map(v => v.value))
              }}
              placeholder={v.label}
            />
          </div>
        )
      })}
    </>
  )
}
