import React, { useState } from 'react'
import { css, cx } from '@emotion/css'
import { GrafanaTheme2, StandardEditorProps } from '@grafana/data'
import {
  Button,
  Combobox,
  Field,
  IconButton,
  Input,
  RadioButtonGroup,
  Stack,
  Switch,
  useStyles2,
} from '@grafana/ui'
import { createDataField, createModelObject, DataField, ModelObject } from '../types'
import { DataFieldEditor } from './DataFieldEditor'
import { getTimeFieldOptions } from './dataFields'

const createId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

const centerOptions: Array<{ label: string; value: ModelObject['modelCenter'] }> = [
  { label: 'Origin', value: 'origin' },
  { label: 'Sphere', value: 'sphere' },
  { label: 'Average', value: 'average' },
]

const getStyles = (theme: GrafanaTheme2) => ({
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${theme.spacing(1)};
  `,
  count: css`
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.bodySmall.fontSize};
  `,
  list: css`
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    margin-bottom: ${theme.spacing(2)};
    max-height: 220px;
    overflow-y: auto;
  `,
  row: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${theme.spacing(0.5)} ${theme.spacing(1)};
    border-bottom: 1px solid ${theme.colors.border.weak};
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.primary.main};
      outline-offset: -2px;
    }
  `,
  rowSelected: css`
    background: ${theme.colors.background.secondary};
  `,
  rowName: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  unnamed: css`
    color: ${theme.colors.text.secondary};
    font-style: italic;
  `,
  detail: css`
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    padding: ${theme.spacing(2)};
  `,
  placeholder: css`
    color: ${theme.colors.text.secondary};
    font-style: italic;
    text-align: center;
    padding: ${theme.spacing(2)};
  `,
  sectionTitle: css`
    font-weight: ${theme.typography.fontWeightMedium};
    margin: ${theme.spacing(2)} 0 ${theme.spacing(1)};

    &:first-of-type {
      margin-top: 0;
    }
  `,
  hint: css`
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.bodySmall.fontSize};
    margin-top: ${theme.spacing(0.5)};
  `,
})

export const ObjectsEditor = ({ value, onChange, context }: StandardEditorProps<ModelObject[]>) => {
  const styles = useStyles2(getStyles)
  const objects = Array.isArray(value) ? value : []
  const [selectedIndex, setSelectedIndex] = useState<number>(objects.length > 0 ? 0 : -1)

  const updateObject = (index: number, patch: Partial<ModelObject>) => {
    const next = [...objects]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const addObject = () => {
    const newObject = createModelObject(createId(), `Model ${objects.length + 1}`)
    const next = [...objects, newObject]
    onChange(next)
    setSelectedIndex(next.length - 1)
  }

  const deleteObject = (index: number) => {
    const next = objects.filter((_, i) => i !== index)
    onChange(next)
    if (next.length === 0) {
      setSelectedIndex(-1)
    } else if (index < selectedIndex) {
      setSelectedIndex(selectedIndex - 1)
    } else if (selectedIndex >= next.length) {
      setSelectedIndex(next.length - 1)
    }
  }

  const moveObject = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= objects.length) {
      return
    }
    const next = [...objects]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
    if (selectedIndex === index) {
      setSelectedIndex(target)
    } else if (selectedIndex === target) {
      setSelectedIndex(index)
    }
  }

  const timeFieldOptions = (getTimeFieldOptions(context.data ?? []))
    .filter((o) => o.value !== undefined)
    .map((o) => ({ label: o.label, value: o.value as string }))

  const selected = selectedIndex >= 0 ? objects[selectedIndex] : undefined

  return (
    <div>
      <div className={styles.header}>
        <Button icon="plus" size="sm" variant="secondary" onClick={addObject}>
          Add Model
        </Button>
        <span className={styles.count}>{objects.length} object(s)</span>
      </div>

      <div className={styles.list}>
        {objects.map((obj, index) => (
          <div
            key={obj.id}
            className={cx(styles.row, index === selectedIndex && styles.rowSelected)}
            role="button"
            tabIndex={0}
            aria-pressed={index === selectedIndex}
            onClick={() => setSelectedIndex(index)}
            onKeyDown={(e) => {
              // Ignore keydown events bubbling up from the icon buttons inside the row
              // so they don't trigger row selection on top of their own action.
              if (e.target !== e.currentTarget) {
                return
              }
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setSelectedIndex(index)
              }
            }}
          >
            <span className={cx(styles.rowName, !obj.name && styles.unnamed)}>{obj.name || '(unnamed)'}</span>
            <Stack direction="row" gap={0.5}>
              <IconButton
                name={obj.visible ? 'eye' : 'eye-slash'}
                size="sm"
                tooltip={obj.visible ? 'Hide object' : 'Show object'}
                onClick={(e) => {
                  e.stopPropagation()
                  updateObject(index, { visible: !obj.visible })
                }}
              />
              <IconButton
                name="arrow-up"
                size="sm"
                tooltip="Move up"
                disabled={index === 0}
                onClick={(e) => {
                  e.stopPropagation()
                  moveObject(index, -1)
                }}
              />
              <IconButton
                name="arrow-down"
                size="sm"
                tooltip="Move down"
                disabled={index === objects.length - 1}
                onClick={(e) => {
                  e.stopPropagation()
                  moveObject(index, 1)
                }}
              />
              <IconButton
                name="trash-alt"
                size="sm"
                variant="destructive"
                tooltip="Delete object"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteObject(index)
                }}
              />
            </Stack>
          </div>
        ))}
      </div>

      {!selected ? (
        <div className={styles.placeholder}>Select or add an object</div>
      ) : (
        <div className={styles.detail}>
          <Field label="Name">
            <Input
              value={selected.name}
              onChange={(e) => updateObject(selectedIndex, { name: e.currentTarget.value })}
            />
          </Field>

          <Field label="Model URL">
            <Input
              value={selected.modelURI}
              placeholder="glb, gltf or obj file for the model"
              onChange={(e) => updateObject(selectedIndex, { modelURI: e.currentTarget.value })}
            />
          </Field>

          <Field label="Center">
            <RadioButtonGroup
              options={centerOptions}
              value={selected.modelCenter}
              onChange={(modelCenter) => updateObject(selectedIndex, { modelCenter })}
            />
          </Field>

          <Field label="Scale">
            <Input
              type="number"
              value={selected.scale}
              onChange={(e) => updateObject(selectedIndex, { scale: parseFloat(e.currentTarget.value) || 1 })}
            />
          </Field>

          <DataFieldEditor
            label="Opacity"
            value={selected.opacity ?? createDataField('1')}
            onChange={(opacity: DataField) => updateObject(selectedIndex, { opacity })}
            data={context.data}
            fieldKind="number"
            placeholder="0-1 (1 = opaque)"
          />

          <div className={styles.sectionTitle}>Position</div>
          <DataFieldEditor
            label="X"
            value={selected.posX}
            onChange={(posX: DataField) => updateObject(selectedIndex, { posX })}
            data={context.data}
          />
          <DataFieldEditor
            label="Y"
            value={selected.posY}
            onChange={(posY: DataField) => updateObject(selectedIndex, { posY })}
            data={context.data}
          />
          <DataFieldEditor
            label="Z"
            value={selected.posZ}
            onChange={(posZ: DataField) => updateObject(selectedIndex, { posZ })}
            data={context.data}
          />

          <div className={styles.sectionTitle}>Quaternion</div>
          <DataFieldEditor
            label="X"
            value={selected.quatX}
            onChange={(quatX: DataField) => updateObject(selectedIndex, { quatX })}
            data={context.data}
          />
          <DataFieldEditor
            label="Y"
            value={selected.quatY}
            onChange={(quatY: DataField) => updateObject(selectedIndex, { quatY })}
            data={context.data}
          />
          <DataFieldEditor
            label="Z"
            value={selected.quatZ}
            onChange={(quatZ: DataField) => updateObject(selectedIndex, { quatZ })}
            data={context.data}
          />
          <DataFieldEditor
            label="W"
            value={selected.quatW}
            onChange={(quatW: DataField) => updateObject(selectedIndex, { quatW })}
            data={context.data}
          />

          <div className={styles.sectionTitle}>Attitude Interpolation</div>
          <Field
            label="Enable"
            description="Keep timestamped quaternions across refreshes and slerp (typically extrapolate) toward the end of the display time range ($__to)."
          >
            <Switch
              value={selected.interpEnabled}
              onChange={(e) => updateObject(selectedIndex, { interpEnabled: e.currentTarget.checked })}
            />
          </Field>

          {selected.interpEnabled && (
            <>
              <Field label="Time Field" description="Leave empty to auto-detect the time field.">
                <Combobox
                  options={timeFieldOptions}
                  value={selected.interpTimeField}
                  placeholder="Auto-detect"
                  isClearable
                  createCustomValue
                  onChange={(option) => updateObject(selectedIndex, { interpTimeField: option?.value ?? '' })}
                />
              </Field>

              <Field label="Retained Samples">
                <Input
                  type="number"
                  min={2}
                  value={selected.interpBufferSize}
                  onChange={(e) =>
                    updateObject(selectedIndex, {
                      interpBufferSize: Math.max(2, parseInt(e.currentTarget.value, 10) || 2),
                    })
                  }
                />
              </Field>

              <Field
                label="Catch-up Blend [ms]"
                description="When a new sample shifts the extrapolation basis, blend into the corrected orientation over this many ms instead of snapping. 0 disables blending."
              >
                <Input
                  type="number"
                  min={0}
                  value={selected.interpCatchUpMs}
                  onChange={(e) =>
                    updateObject(selectedIndex, {
                      interpCatchUpMs: Math.max(0, parseInt(e.currentTarget.value, 10) || 0),
                    })
                  }
                />
              </Field>
            </>
          )}
        </div>
      )}
    </div>
  )
}
