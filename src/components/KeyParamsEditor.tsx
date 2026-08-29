import React, { useState } from 'react'
import { css, cx } from '@emotion/css'
import { GrafanaTheme2, StandardEditorProps } from '@grafana/data'
import { Button, Combobox, Field, IconButton, Input, Stack, useStyles2 } from '@grafana/ui'
import { createKeyParam, KeyParam } from '../types'
import { getAllFieldOptions } from './dataFields'

const createId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

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
})

export const KeyParamsEditor = ({ value, onChange, context }: StandardEditorProps<KeyParam[]>) => {
  const styles = useStyles2(getStyles)
  const items = Array.isArray(value) ? value : []
  const [selectedIndex, setSelectedIndex] = useState<number>(items.length > 0 ? 0 : -1)

  const updateItem = (index: number, patch: Partial<KeyParam>) => {
    const next = [...items]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const addItem = () => {
    const newItem = createKeyParam(createId(), `Param ${items.length + 1}`)
    const next = [...items, newItem]
    onChange(next)
    setSelectedIndex(next.length - 1)
  }

  const deleteItem = (index: number) => {
    const next = items.filter((_, i) => i !== index)
    onChange(next)
    if (next.length === 0) {
      setSelectedIndex(-1)
    } else if (index < selectedIndex) {
      setSelectedIndex(selectedIndex - 1)
    } else if (selectedIndex >= next.length) {
      setSelectedIndex(next.length - 1)
    }
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) {
      return
    }
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
    if (selectedIndex === index) {
      setSelectedIndex(target)
    } else if (selectedIndex === target) {
      setSelectedIndex(index)
    }
  }

  const fieldOptions = getAllFieldOptions(context.data ?? [])
    .filter((o) => o.value !== undefined)
    .map((o) => ({ label: o.label, value: o.value as string }))

  const selected = selectedIndex >= 0 ? items[selectedIndex] : undefined

  return (
    <div>
      <div className={styles.header}>
        <Button icon="plus" size="sm" variant="secondary" onClick={addItem}>
          Add Key Parameter
        </Button>
        <span className={styles.count}>{items.length} parameter(s)</span>
      </div>

      <div className={styles.list}>
        {items.map((item, index) => (
          <div
            key={item.id}
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
            <span className={cx(styles.rowName, !item.name && styles.unnamed)}>{item.name || '(unnamed)'}</span>
            <Stack direction="row" gap={0.5}>
              <IconButton
                name={item.visible ? 'eye' : 'eye-slash'}
                size="sm"
                tooltip={item.visible ? 'Hide parameter' : 'Show parameter'}
                onClick={(e) => {
                  e.stopPropagation()
                  updateItem(index, { visible: !item.visible })
                }}
              />
              <IconButton
                name="arrow-up"
                size="sm"
                tooltip="Move up"
                disabled={index === 0}
                onClick={(e) => {
                  e.stopPropagation()
                  moveItem(index, -1)
                }}
              />
              <IconButton
                name="arrow-down"
                size="sm"
                tooltip="Move down"
                disabled={index === items.length - 1}
                onClick={(e) => {
                  e.stopPropagation()
                  moveItem(index, 1)
                }}
              />
              <IconButton
                name="trash-alt"
                size="sm"
                variant="destructive"
                tooltip="Delete parameter"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteItem(index)
                }}
              />
            </Stack>
          </div>
        ))}
      </div>

      {!selected ? (
        <div className={styles.placeholder}>Select or add a key parameter</div>
      ) : (
        <div className={styles.detail}>
          <Field label="Name">
            <Input
              value={selected.name}
              onChange={(e) => updateItem(selectedIndex, { name: e.currentTarget.value })}
            />
          </Field>

          <Field
            label="Data Field"
            description="Series.Field or a bare field name. When more than one query returns a field of the same name, use the Series.Field form to disambiguate."
          >
            <Combobox
              options={fieldOptions}
              value={selected.field}
              placeholder="Select field"
              isClearable
              createCustomValue
              onChange={(option) => updateItem(selectedIndex, { field: option?.value ?? '' })}
            />
          </Field>

          <Field
            label="Format"
            description="A single printf-style specifier (%.2f, %s, %d, %+.1e, ...), plus any literal text. Only the first specifier is substituted with the value."
          >
            <Input
              value={selected.format}
              placeholder="%.2f"
              onChange={(e) => updateItem(selectedIndex, { format: e.currentTarget.value })}
            />
          </Field>
        </div>
      )}
    </div>
  )
}
