import React from 'react'
import { css } from '@emotion/css'
import { GrafanaTheme2 } from '@grafana/data'
import { useStyles2 } from '@grafana/ui'

// Fixed height of the legend, so KeyParamsOverlay can reserve exactly this much space
// when it shares the bottom-right corner. Keep in sync with getStyles below if this changes.
export const AXES_LEGEND_HEIGHT = 24

// Same colors THREE.AxesHelper uses for its X / Y / Z lines.
const AXES = [
  { label: 'X', color: '#ff0000' },
  { label: 'Y', color: '#00ff00' },
  { label: 'Z', color: '#0000ff' },
]

const getStyles = (theme: GrafanaTheme2) => ({
  // pointer-events: none keeps the legend from stealing drag/orbit input from the
  // three.js canvas underneath, same as KeyParamsOverlay.
  legend: css`
    position: absolute;
    bottom: 4px;
    right: 4px;
    height: ${AXES_LEGEND_HEIGHT}px;
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
    padding: 0 ${theme.spacing(1)};
    background: rgba(0, 0, 0, 0.35);
    border-radius: ${theme.shape.radius.default};
    font-family: ${theme.typography.fontFamilyMonospace};
    font-size: 14px;
    font-weight: bold;
    pointer-events: none;
    user-select: none;
  `,
  // Pure blue is hard to read on a dark background; a light outline keeps every label legible.
  label: css`
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
  `,
})

// Color key for the axes helper, drawn in the bottom-right corner while the helper is shown.
export const AxesLegend: React.FC = () => {
  const styles = useStyles2(getStyles)

  return (
    <div className={styles.legend}>
      {AXES.map(({ label, color }) => (
        <span key={label} className={styles.label} style={{ color }}>{label}</span>
      ))}
    </div>
  )
}
