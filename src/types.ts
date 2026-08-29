/** How a numeric input is sourced: a literal constant, or a query field. */
export type DataSourceType = 'const' | 'field';

/**
 * A single numeric input. `value` is either the literal text of a constant
 * (parsed with parseFloat) or a field spec ('Series.Field' or a bare 'Field').
 */
export interface DataField {
  sourceType: DataSourceType;
  value: string;
}

/** One 3D model placed in the scene. */
export interface ModelObject {
  id: string;
  name: string;
  visible: boolean;

  modelURI: string;
  modelCenter: 'origin' | 'sphere' | 'average';
  scale: number;

  /** Brightness multiplier in 0-1, fixed or field-bound. Values outside 0-1 are clamped;
   * existing dashboards without this field are treated as unchanged (1). Darkens the
   * model's color toward black; does not affect opacity/transparency. */
  brightness: DataField;

  posX: DataField;
  posY: DataField;
  posZ: DataField;

  quatX: DataField;
  quatY: DataField;
  quatZ: DataField;
  quatW: DataField;

  // Quaternion interpolation / extrapolation, per object.
  interpEnabled: boolean;
  interpTimeField: string;
  interpBufferSize: number;
  interpCatchUpMs: number;
}

/** One key parameter shown in the text overlay, drawn on top of the 3D scene. */
export interface KeyParam {
  id: string;
  name: string;
  visible: boolean;

  /** Field spec, same rules as DataField's field mode: 'Series.Field' or a bare 'Field'. */
  field: string;

  /** A single printf-style specifier (%.2f, %s, %d, %+.1e, ...) plus any literal text.
   * Only the first specifier is substituted with the value; the rest is literal. */
  format: string;
}

export interface Attitude3DOptions {
  objects: ModelObject[];

  // Camera
  cameraTargetId: string; // 'origin' or a ModelObject id
  cameraDirectionType: 'field' | 'input';
  cameraDirectionX: string;
  cameraDirectionY: string;
  cameraDirectionZ: string;
  cameraDistance: string;
  mouseControl: boolean;

  // Directional Light
  directionalLightColor: string;
  directionalLightIntensity: string;
  directionalLightDirectionType: 'field' | 'input';
  directionalLightDirectionX: string;
  directionalLightDirectionY: string;
  directionalLightDirectionZ: string;

  // Ambient Light
  ambientLightColor: string;
  ambientLightIntensity: string;

  // Scene
  showHelper: boolean;
  backgroundColor: string;

  // Key Parameters
  keyParams: KeyParam[];
  keyParamFontSize: number;
  // Split into two 2-way radios (rather than one 4-way one) so the options editor doesn't
  // overflow its narrow panel width.
  keyParamVerticalPosition: 'top' | 'bottom';
  keyParamHorizontalPosition: 'left' | 'right';
  keyParamSeparator: 'colon' | 'equal' | 'space';
  keyParamValueWidth: number;
  keyParamTextColor: string;
  keyParamBackground: boolean;
  keyParamBackgroundColor: string;
  keyParamBackgroundOpacity: number;
  keyParamShape: 'rect' | 'rounded';
  keyParamBorder: boolean;
  keyParamBorderColor: string;
}

/** Camera target sentinel meaning the world origin rather than an object. */
export const ORIGIN_TARGET_ID = 'origin';

export const createDataField = (value: string, sourceType: DataSourceType = 'const'): DataField => ({
  sourceType,
  value,
});

export const createModelObject = (id: string, name: string): ModelObject => ({
  id,
  name,
  visible: true,
  modelURI: '',
  modelCenter: 'sphere',
  scale: 1,
  brightness: createDataField('1'),
  posX: createDataField('0'),
  posY: createDataField('0'),
  posZ: createDataField('0'),
  quatX: createDataField('0'),
  quatY: createDataField('0'),
  quatZ: createDataField('0'),
  quatW: createDataField('1'),
  interpEnabled: false,
  interpTimeField: '',
  interpBufferSize: 2,
  interpCatchUpMs: 300,
});

export const createKeyParam = (id: string, name: string): KeyParam => ({
  id,
  name,
  visible: true,
  field: '',
  format: '%.2f',
});
