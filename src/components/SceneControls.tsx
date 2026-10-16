import React from 'react'
import { css } from '@emotion/css'
import { GrafanaTheme2 } from '@grafana/data'
import { Icon, IconButton, useStyles2 } from '@grafana/ui'

// Fixed size of the whole stack, so KeyParamsOverlay can reserve exactly this much space
// when it shares the top-right corner. Keep in sync with getStyles below if this changes.
export const SCENE_CONTROLS_WIDTH = 44
export const SCENE_CONTROLS_HEIGHT = 88

interface Props {
  onResetCamera: () => void
  showGeometry: boolean
  onToggleGeometry: () => void
  hasGeometry: boolean
  showVectors: boolean
  onToggleVectors: () => void
  hasVectors: boolean
}

const getStyles = (theme: GrafanaTheme2) => ({
  // pointer-events: none on the container (only the buttons opt back in) keeps this from
  // stealing drag/orbit input from the three.js canvas underneath, same as KeyParamsOverlay.
  container: css`
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.35);
    border-radius: ${theme.shape.radius.default};
    pointer-events: none;
  `,
  row: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing(0.5)};
    padding: ${theme.spacing(0.5)};
    pointer-events: auto;
  `,
  // Decorative — labels the row's subject (camera / models / vectors); the action icon
  // button next to it carries the real tooltip/aria-label.
  targetIcon: css`
    color: ${theme.colors.text.secondary};
  `,
})

// The overlay's scene-control stack: one row per subject (camera, models, vectors), each
// row a decorative "what this affects" icon followed by the actual action button. Toggle
// state is ephemeral (not persisted to panel options) — it only affects this session's view.
export const SceneControls: React.FC<Props> = ({
  onResetCamera,
  showGeometry, onToggleGeometry, hasGeometry,
  showVectors, onToggleVectors, hasVectors,
}) => {
  const styles = useStyles2(getStyles)

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <Icon name="camera" size="sm" className={styles.targetIcon} aria-hidden />
        <IconButton
          name="sync"
          size="sm"
          tooltip="Reset camera to default position"
          aria-label="Reset camera to default position"
          onClick={onResetCamera}
        />
      </div>
      <div className={styles.row}>
        <Icon name="cube" size="sm" className={styles.targetIcon} aria-hidden />
        <IconButton
          name={showGeometry ? 'eye' : 'eye-slash'}
          size="sm"
          disabled={!hasGeometry}
          tooltip={showGeometry ? 'Hide all models' : 'Show all models'}
          aria-label={showGeometry ? 'Hide all models' : 'Show all models'}
          onClick={onToggleGeometry}
        />
      </div>
      <div className={styles.row}>
        <Icon name="arrow" size="sm" className={styles.targetIcon} aria-hidden />
        <IconButton
          name={showVectors ? 'eye' : 'eye-slash'}
          size="sm"
          disabled={!hasVectors}
          tooltip={showVectors ? 'Hide all vectors' : 'Show all vectors'}
          aria-label={showVectors ? 'Hide all vectors' : 'Show all vectors'}
          onClick={onToggleVectors}
        />
      </div>
    </div>
  )
}
