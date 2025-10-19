export interface ModelRendererOptions {
  // model
  modelURI: string;
  modelCenter: 'origin' | 'sphere' | 'average';
  modelRotationType: 'field' | 'input';
  modelRotationX: string;
  modelRotationY: string;
  modelRotationZ: string;
  modelRotationW: string;

  showHelper: boolean;
  
  // camera
  cameraDirectionType: 'field' | 'input';
  cameraDirectionX: string;
  cameraDirectionY: string;
  cameraDirectionZ: string;
  cameraDistanceType: 'field' | 'input';
  cameraDistance: string;
  
  mouseControl: boolean;
  
  // Directional Light
  directionalLightColor: string;
  directionalLightIntensityType: 'field' | 'input';
  directionalLightIntensity: string;
  directionalLightDirectionType: 'field' | 'input';
  directionalLightDirectionX: string;
  directionalLightDirectionY: string;
  directionalLightDirectionZ: string;

  // Ambient Light
  ambientLightColor: string;
  ambientLightIntensityType: 'field' | 'input';
  ambientLightIntensity: string;

  // Background
  backgroundColor: string;
}
