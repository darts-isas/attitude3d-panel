import { PanelPlugin } from '@grafana/data'
import { Attitude3DOptions } from './types'
import { Attitude3DPanel } from './components/Attitude3DPanel'

export const plugin = new PanelPlugin<Attitude3DOptions>(Attitude3DPanel).setPanelOptions((builder) => {
  return builder
    // Model
    .addTextInput({
      category: ['Model'],
      path: 'modelURI',
      name: 'Data',
      description: 'glb, gltf or obj file for the model',
      defaultValue: '',
    })
    .addRadio({
      category: ['Model'],
      path: 'modelRotationType',
      name: 'Quaternion Input',
      settings: {
        options: [
          { value: 'input', label: 'Constant' },
          { value: 'field', label: 'Field' },
        ],
      },
      defaultValue: 'input',
    })
    .addFieldNamePicker({
      category: ['Model'],
      path: 'modelRotationX',
      name: 'Quaternion X',
      showIf: (options) => options?.modelRotationType === 'field',
    })
    .addFieldNamePicker({
      category: ['Model'],
      path: 'modelRotationY',
      name: 'Quaternion Y',
      showIf: (options) => options?.modelRotationType === 'field',
    })
    .addFieldNamePicker({
      category: ['Model'],
      path: 'modelRotationZ',
      name: 'Quaternion Z',
      showIf: (options) => options?.modelRotationType === 'field',
    })
    .addFieldNamePicker({
      category: ['Model'],
      path: 'modelRotationW',
      name: 'Quaternion W',
      showIf: (options) => options?.modelRotationType === 'field',
    })
    .addNumberInput({
      category: ['Model'],
      path: 'modelRotationX',
      name: 'Quaternion X',
      defaultValue: 0.0,
      showIf: (options) => options?.modelRotationType === 'input',
    })
    .addNumberInput({
      category: ['Model'],
      path: 'modelRotationY',
      name: 'Quaternion Y',
      defaultValue: 0.0,
      showIf: (options) => options?.modelRotationType === 'input',
    })
    .addNumberInput({
      category: ['Model'],
      path: 'modelRotationZ',
      name: 'Quaternion Z',
      defaultValue: 0.0,
      showIf: (options) => options?.modelRotationType === 'input',
    })
    .addNumberInput({
      category: ['Model'],
      path: 'modelRotationW',
      name: 'Quaternion W',
      defaultValue: 1.0,
      showIf: (options) => options?.modelRotationType === 'input',
    })
    .addRadio({
      category: ['Model'],
      path: 'modelCenter',
      name: 'Center',
      description: 'Center of the model',
      settings: {
        options: [
          { value: 'origin', label: 'Origin' },
          { value: 'sphere', label: 'Sphere' },
          { value: 'average', label: 'Average' },
        ],
      },
      defaultValue: 'sphere',
    })
    .addBooleanSwitch({
      category: ['Model'],
      path: 'showHelper',
      name: 'Helper',
      description: 'Show the helpers',
      defaultValue: false,
    })
    // Camera
    .addRadio({
      category: ['Camera'],
      path: 'cameraDirectionType',
      name: 'Direction Input',
      settings: {
        options: [
          { value: 'input', label: 'Constant' },
          { value: 'field', label: 'Field' },
        ],
      },
      defaultValue: 'input',
    })
    .addFieldNamePicker({
      category: ['Camera'],
      path: 'cameraDirectionX',
      name: 'Direction X',
      showIf: (options) => options?.cameraDirectionType === 'field',
    })
    .addFieldNamePicker({
      category: ['Camera'],
      path: 'cameraDirectionY',
      name: 'Direction Y',
      showIf: (options) => options?.cameraDirectionType === 'field',
    })
    .addFieldNamePicker({
      category: ['Camera'],
      path: 'cameraDirectionZ',
      name: 'Direction Z',
      showIf: (options) => options?.cameraDirectionType === 'field',
    })
    .addNumberInput({
      category: ['Camera'],
      path: 'cameraDirectionX',
      name: 'Direction X',
      defaultValue: 0.0,
      showIf: (options) => options?.cameraDirectionType === 'input',
    })
    .addNumberInput({
      category: ['Camera'],
      path: 'cameraDirectionY',
      name: 'Direction Y',
      defaultValue: 0.0,
      showIf: (options) => options?.cameraDirectionType === 'input',
    })
    .addNumberInput({
      category: ['Camera'],
      path: 'cameraDirectionZ',
      name: 'Direction Z',
      defaultValue: 1.0,
      showIf: (options) => options?.cameraDirectionType === 'input',
    })
    .addNumberInput({
      category: ['Camera'],
      path: 'cameraDistance',
      name: 'Distance',
      description: 'Camera distance from the model',
      defaultValue: 2.0,
    })
    .addBooleanSwitch({
      category: ['Camera'],
      path: 'mouseControl',
      name: 'Mouse Control',
      description: 'Use mouse control to rotate the model',
      defaultValue: false,
    })
    // Directional Light
    .addRadio({
      category: ['Directional Light'],
      path: 'directionalLightDirectionType',
      name: 'Direction Input',
      settings: {
        options: [
          { value: 'input', label: 'Constant' },
          { value: 'field', label: 'Field' },
        ],
      },
      defaultValue: 'input',
    })
    .addFieldNamePicker({
      category: ['Directional Light'],
      path: 'directionalLightDirectionX',
      name: 'Direction X',
      showIf: (options) => options?.directionalLightDirectionType === 'field',
    })
    .addFieldNamePicker({
      category: ['Directional Light'],
      path: 'directionalLightDirectionY',
      name: 'Direction Y',
      showIf: (options) => options?.directionalLightDirectionType === 'field',
    })
    .addFieldNamePicker({
      category: ['Directional Light'],
      path: 'directionalLightDirectionZ',
      name: 'Direction Z',
      showIf: (options) => options?.directionalLightDirectionType === 'field',
    })
    .addNumberInput({
      category: ['Directional Light'],
      path: 'directionalLightDirectionX',
      name: 'Direction X',
      defaultValue: 0.0,
      showIf: (options) => options?.directionalLightDirectionType === 'input',
    })
    .addNumberInput({
      category: ['Directional Light'],
      path: 'directionalLightDirectionY',
      name: 'Direction Y',
      defaultValue: 0.0,
      showIf: (options) => options?.directionalLightDirectionType === 'input',
    })
    .addNumberInput({
      category: ['Directional Light'],
      path: 'directionalLightDirectionZ',
      name: 'Direction Z',
      defaultValue: 1.0,
      showIf: (options) => options?.directionalLightDirectionType === 'input',
    })
    .addColorPicker({
      category: ['Directional Light'],
      path: 'directionalLightColor',
      name: 'Color',
      // description: 'Directional Light Color',
      defaultValue: '#ffffff',
    })
    .addNumberInput({
      category: ['Directional Light'],
      path: 'directionalLightIntensity',
      name: 'Intensity',
      // description: '',
      defaultValue: 10.0,
    }) 
    .addColorPicker({
      category: ['Ambient Light'],
      path: 'ambientLightColor',
      name: 'Ambient Light Color',
      // description: 'Ambient Light Color',
      defaultValue: '#ffffff',
    })
    .addNumberInput({
      category: ['Ambient Light'],
      path: 'ambientLightIntensity',
      name: 'Ambient Light Intensity',
      // description: '',
      defaultValue: 1.0,
    }) 
    .addColorPicker({
      category: ['Background'],
      path: 'backgroundColor',
      name: 'Background Color',
      description: 'Background color for the panel',
      defaultValue: '#000000',
    })
})
