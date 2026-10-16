import React, { useState } from 'react'
import { cx } from '@emotion/css'
import { StandardEditorProps } from '@grafana/data'
import { Button, ColorPickerInput, Field, IconButton, Input, Stack, useStyles2 } from '@grafana/ui'
import { createVectorObject, VectorObject } from '../types'
import { DataFieldEditor } from './DataFieldEditor'
import { createId, getListEditorStyles } from './listEditor'

export const VectorsEditor = ({ value, onChange, context }: StandardEditorProps<VectorObject[]>) => {
  const styles = useStyles2(getListEditorStyles)
  const vectors = Array.isArray(value) ? value : []
  const [selectedIndex, setSelectedIndex] = useState<number>(vectors.length > 0 ? 0 : -1)

  const updateVector = (index: number, patch: Partial<VectorObject>) => {
    const next = [...vectors]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const addVector = () => {
    const newVector = createVectorObject(createId(), `Vector ${vectors.length + 1}`)
    const next = [...vectors, newVector]
    onChange(next)
    setSelectedIndex(next.length - 1)
  }

  const deleteVector = (index: number) => {
    const next = vectors.filter((_, i) => i !== index)
    onChange(next)
    if (next.length === 0) {
      setSelectedIndex(-1)
    } else if (index < selectedIndex) {
      setSelectedIndex(selectedIndex - 1)
    } else if (selectedIndex >= next.length) {
      setSelectedIndex(next.length - 1)
    }
  }

  const moveVector = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= vectors.length) {
      return
    }
    const next = [...vectors]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
    if (selectedIndex === index) {
      setSelectedIndex(target)
    } else if (selectedIndex === target) {
      setSelectedIndex(index)
    }
  }

  const selected = selectedIndex >= 0 ? vectors[selectedIndex] : undefined

  return (
    <div>
      <div className={styles.header}>
        <Button icon="plus" size="sm" variant="secondary" onClick={addVector}>
          Add Vector
        </Button>
        <span className={styles.count}>{vectors.length} vector(s)</span>
      </div>

      <div className={styles.list}>
        {vectors.map((vec, index) => (
          <div
            key={vec.id}
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
            <span className={cx(styles.rowName, !vec.name && styles.unnamed)}>{vec.name || '(unnamed)'}</span>
            <Stack direction="row" gap={0.5}>
              <IconButton
                name={vec.visible ? 'eye' : 'eye-slash'}
                size="sm"
                tooltip={vec.visible ? 'Hide vector' : 'Show vector'}
                onClick={(e) => {
                  e.stopPropagation()
                  updateVector(index, { visible: !vec.visible })
                }}
              />
              <IconButton
                name="arrow-up"
                size="sm"
                tooltip="Move up"
                disabled={index === 0}
                onClick={(e) => {
                  e.stopPropagation()
                  moveVector(index, -1)
                }}
              />
              <IconButton
                name="arrow-down"
                size="sm"
                tooltip="Move down"
                disabled={index === vectors.length - 1}
                onClick={(e) => {
                  e.stopPropagation()
                  moveVector(index, 1)
                }}
              />
              <IconButton
                name="trash-alt"
                size="sm"
                variant="destructive"
                tooltip="Delete vector"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteVector(index)
                }}
              />
            </Stack>
          </div>
        ))}
      </div>

      {!selected ? (
        <div className={styles.placeholder}>Select or add a vector</div>
      ) : (
        <div className={styles.detail}>
          <Field label="Name">
            <Input
              value={selected.name}
              onChange={(e) => updateVector(selectedIndex, { name: e.currentTarget.value })}
            />
          </Field>

          <Field label="Color">
            <ColorPickerInput
              value={selected.color}
              returnColorAs="hex"
              onChange={(color) => updateVector(selectedIndex, { color })}
            />
          </Field>

          <Field label="Thickness" description="Shaft radius in world units. The arrow head is sized from this.">
            <Input
              type="number"
              value={selected.thickness}
              onChange={(e) =>
                updateVector(selectedIndex, { thickness: parseFloat(e.currentTarget.value) || 0.02 })
              }
            />
          </Field>

          <div className={styles.sectionTitle}>Start</div>
          <DataFieldEditor
            label="X"
            value={selected.startX}
            onChange={(startX) => updateVector(selectedIndex, { startX })}
            data={context.data}
          />
          <DataFieldEditor
            label="Y"
            value={selected.startY}
            onChange={(startY) => updateVector(selectedIndex, { startY })}
            data={context.data}
          />
          <DataFieldEditor
            label="Z"
            value={selected.startZ}
            onChange={(startZ) => updateVector(selectedIndex, { startZ })}
            data={context.data}
          />

          <div className={styles.sectionTitle}>End</div>
          <div className={styles.hint}>
            Only the direction from Start to End is used — the drawn length comes from Magnitude below.
          </div>
          <DataFieldEditor
            label="X"
            value={selected.endX}
            onChange={(endX) => updateVector(selectedIndex, { endX })}
            data={context.data}
          />
          <DataFieldEditor
            label="Y"
            value={selected.endY}
            onChange={(endY) => updateVector(selectedIndex, { endY })}
            data={context.data}
          />
          <DataFieldEditor
            label="Z"
            value={selected.endZ}
            onChange={(endZ) => updateVector(selectedIndex, { endZ })}
            data={context.data}
          />

          <div className={styles.sectionTitle}>Size</div>
          <DataFieldEditor
            label="Magnitude"
            value={selected.magnitude}
            onChange={(magnitude) => updateVector(selectedIndex, { magnitude })}
            data={context.data}
            description="Drawn length along the Start→End direction, in world units. 0 or less draws nothing."
          />
          <DataFieldEditor
            label="Truncate"
            value={selected.truncate}
            onChange={(truncate) => updateVector(selectedIndex, { truncate })}
            data={context.data}
            description="Fraction of Magnitude, from 0.0 to 1.0, cut off from the start side. 0 draws the full length; 1.0 or more draws nothing."
          />
        </div>
      )}
    </div>
  )
}
