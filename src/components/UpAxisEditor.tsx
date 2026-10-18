import React from 'react'
import { css } from '@emotion/css'
import { GrafanaTheme2, StandardEditorProps } from '@grafana/data'
import { RadioButtonGroup, useStyles2 } from '@grafana/ui'
import { UpAxis } from '../types'

const upAxisOptions: Array<{ label: string; value: UpAxis }> = [
  { label: '+Y (as-is)', value: 'y' },
  { label: '+Z', value: 'z' },
]

const getStyles = (theme: GrafanaTheme2) => ({
  note: css`
    margin-top: ${theme.spacing(1)};
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.bodySmall.fontSize};
    line-height: 1.5;
  `,
  formula: css`
    margin: ${theme.spacing(0.5, 0)};
    padding: ${theme.spacing(0.5, 1)};
    background: ${theme.colors.background.secondary};
    border-radius: ${theme.shape.radius.default};
    font-family: ${theme.typography.fontFamilyMonospace};
    white-space: pre;
  `,
})

export const UpAxisEditor = ({ value, onChange }: StandardEditorProps<UpAxis | undefined>) => {
  const styles = useStyles2(getStyles)
  const upAxis: UpAxis = value === 'z' ? 'z' : 'y'

  return (
    <div>
      <RadioButtonGroup options={upAxisOptions} value={upAxis} onChange={(v) => onChange(v)} />
      {upAxis === 'y' ? (
        <div className={styles.note}>
          Input coordinates (positions, quaternions, vectors, light and camera directions) are drawn
          without any conversion. Input +Y points up on screen, following the three.js convention.
        </div>
      ) : (
        <div className={styles.note}>
          The whole scene is rotated −90° about X so that input +Z points up on screen. Compared
          with +Y (as-is), this is the same as converting every input as:
          <div className={styles.formula}>
            {'position / vector  (x, y, z)          → (x, z, −y)\n'}
            {'quaternion         (qx, qy, qz, qw)   → (qx, qz, −qy, qw)'}
          </div>
          Use this mode for dashboards that applied this conversion with transformations before this
          option existed; with the option, give the input-frame values (e.g. J2000) directly, otherwise
          the conversion is applied twice.
        </div>
      )}
    </div>
  )
}
