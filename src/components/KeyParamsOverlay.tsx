import React from 'react'
import { css } from '@emotion/css'
import { DataFrame, GrafanaTheme2 } from '@grafana/data'
import { useStyles2 } from '@grafana/ui'
import { Attitude3DOptions, KeyParam } from '../types'
import { buildKeyParamLines, SEPARATOR_MAP } from './keyParams'
import { toCssColor } from './cssColor'

interface Props {
  keyParams: KeyParam[]
  series: DataFrame[] | undefined
  options: Attitude3DOptions
}

// The vertical/horizontal offset for each edge. top additionally clears the reset-camera
// button, which sits at top:4px/right:4px in Attitude3DPanel.tsx, when paired with right.
const VERTICAL_CSS: Record<Attitude3DOptions['keyParamVerticalPosition'], string> = {
  top: 'top: 4px;',
  bottom: 'bottom: 4px;',
}
const HORIZONTAL_CSS: Record<Attitude3DOptions['keyParamHorizontalPosition'], string> = {
  left: 'left: 4px;',
  right: 'right: 4px;',
}

interface StyleArgs {
  verticalPosition: Attitude3DOptions['keyParamVerticalPosition']
  horizontalPosition: Attitude3DOptions['keyParamHorizontalPosition']
  fontSize: number
  textColor: string
  background: boolean
  backgroundColor: string
  backgroundOpacity: number
  shape: Attitude3DOptions['keyParamShape']
  border: boolean
  borderColor: string
}

const getStyles = (theme: GrafanaTheme2, args: StyleArgs) => {
  const radius = args.shape === 'rounded' ? theme.shape.radius.default : '0'
  const clearsResetButton = args.verticalPosition === 'top' && args.horizontalPosition === 'right'

  return {
    // pointer-events: none keeps the overlay from stealing drag/orbit input from the
    // three.js canvas underneath — see OrbitControls in Attitude3DPanel.tsx.
    overlay: css`
      position: absolute;
      ${VERTICAL_CSS[args.verticalPosition]}
      ${HORIZONTAL_CSS[args.horizontalPosition]}
      padding: ${theme.spacing(0.5)} ${theme.spacing(1)};
      ${clearsResetButton ? 'padding-right: 28px;' : ''}
      font-family: ${theme.typography.fontFamilyMonospace};
      font-size: ${args.fontSize}px;
      line-height: 1.4;
      color: ${args.textColor};
      white-space: pre;
      pointer-events: none;
      user-select: none;
      max-width: 100%;
      overflow: hidden;
      border-radius: ${radius};
      ${args.background ? `background: ${toCssColor(args.backgroundColor, args.backgroundOpacity)};` : ''}
      ${args.border ? `border: 1px solid ${toCssColor(args.borderColor, 1)};` : ''}
    `,
  }
}

// Text overlay drawn on top of the 3D scene, showing a fixed-format list of key parameter
// values. Size depends only on the item count, names, and the Value Width setting — never
// on the values themselves — so the box never resizes as data changes.
export const KeyParamsOverlay: React.FC<Props> = ({ keyParams, series, options }) => {
  const items = Array.isArray(keyParams) ? keyParams : []

  const verticalPosition = options.keyParamVerticalPosition ?? 'top'
  const horizontalPosition = options.keyParamHorizontalPosition ?? 'left'
  const fontSize = options.keyParamFontSize ?? 14
  const separatorKey = options.keyParamSeparator ?? 'colon'
  const valueWidth = options.keyParamValueWidth ?? 8
  const textColor = options.keyParamTextColor ?? '#ffffff'
  const background = options.keyParamBackground ?? true
  const backgroundColor = options.keyParamBackgroundColor ?? '#808080'
  const backgroundOpacity = options.keyParamBackgroundOpacity ?? 0.25
  const shape = options.keyParamShape ?? 'rounded'
  const border = options.keyParamBorder ?? true
  const borderColor = options.keyParamBorderColor ?? '#ffffff'

  const styles = useStyles2(getStyles, {
    verticalPosition,
    horizontalPosition,
    fontSize,
    textColor,
    background,
    backgroundColor,
    backgroundOpacity,
    shape,
    border,
    borderColor,
  })

  const lines = buildKeyParamLines(items, series, {
    separator: SEPARATOR_MAP[separatorKey] ?? SEPARATOR_MAP.colon,
    valueWidth,
  })

  if (lines.length === 0) {
    return null
  }

  return <div className={styles.overlay}>{lines.join('\n')}</div>
}
