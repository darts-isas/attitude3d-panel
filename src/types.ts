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
  interpMaxExtrapMs: number;
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
  interpMaxExtrapMs: 5000,
});
