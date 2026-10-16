import { css } from '@emotion/css'
import { GrafanaTheme2 } from '@grafana/data'

// Shared by the master/detail list editors (ObjectsEditor, KeyParamsEditor, VectorsEditor):
// a scrollable list of rows on top, a detail pane for the selected row below.

export const createId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export const getListEditorStyles = (theme: GrafanaTheme2) => ({
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
