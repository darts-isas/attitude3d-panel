import { PanelPlugin } from '@grafana/data'
import { Attitude3DOptions, ORIGIN_TARGET_ID } from './types'
import { Attitude3DPanel } from './components/Attitude3DPanel'
import { ObjectsEditor } from './components/ObjectsEditor'
import { TargetObjectEditor } from './components/TargetObjectEditor'
import { migrateOptions } from './migrations'

export const plugin = new PanelPlugin<Attitude3DOptions>(Attitude3DPanel)
  .setMigrationHandler((panel) => migrateOptions(panel.options))
  .setPanelOptions((builder) => {
    return builder
      // Camera
      .addCustomEditor({
        category: ['Camera'],
        id: 'cameraTargetId',
        path: 'cameraTargetId',
        name: 'Target',
        description: 'Object the camera looks at. The camera distance scales with its size.',
        editor: TargetObjectEditor,
        defaultValue: ORIGIN_TARGET_ID,
      })
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
        description: 'Camera distance from the target, in multiples of its radius',
        defaultValue: 2.0,
      })
      .addBooleanSwitch({
        category: ['Camera'],
        path: 'mouseControl',
        name: 'Mouse Control',
        description: 'Use mouse control to rotate the view',
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
        defaultValue: '#ffffff',
      })
      .addNumberInput({
        category: ['Directional Light'],
        path: 'directionalLightIntensity',
        name: 'Intensity',
        defaultValue: 10.0,
      })
      // Ambient Light
      .addColorPicker({
        category: ['Ambient Light'],
        path: 'ambientLightColor',
        name: 'Color',
        defaultValue: '#ffffff',
      })
      .addNumberInput({
        category: ['Ambient Light'],
        path: 'ambientLightIntensity',
        name: 'Intensity',
        defaultValue: 1.0,
      })
      // Scene
      .addBooleanSwitch({
        category: ['Scene'],
        path: 'showHelper',
        name: 'Helper',
        description: 'Show the axes helper',
        defaultValue: false,
      })
      .addColorPicker({
        category: ['Scene'],
        path: 'backgroundColor',
        name: 'Background Color',
        description: 'Background color for the panel',
        defaultValue: '#000000',
      })
      // Objects — last, since the per-object detail editor is the tallest section
      .addCustomEditor({
        category: ['Objects'],
        id: 'objects',
        path: 'objects',
        name: '',
        description: 'Add and configure the 3D models in the scene',
        editor: ObjectsEditor,
        defaultValue: [],
      })
  })
