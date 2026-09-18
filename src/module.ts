import { PanelPlugin } from '@grafana/data'
import { Attitude3DOptions, ORIGIN_TARGET_ID } from './types'
import { Attitude3DPanel } from './components/Attitude3DPanel'
import { ObjectsEditor } from './components/ObjectsEditor'
import { VectorsEditor } from './components/VectorsEditor'
import { TargetObjectEditor } from './components/TargetObjectEditor'
import { KeyParamsEditor } from './components/KeyParamsEditor'
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
      // Objects
      .addCustomEditor({
        category: ['Objects'],
        id: 'objects',
        path: 'objects',
        name: '',
        description: 'Add and configure the 3D models in the scene',
        editor: ObjectsEditor,
        defaultValue: [],
      })
      // Vectors
      .addCustomEditor({
        category: ['Vectors'],
        id: 'vectors',
        path: 'vectors',
        name: '',
        description: 'Add and configure the arrows drawn in the scene',
        editor: VectorsEditor,
        defaultValue: [],
      })
      // Key Parameters — overlays a fixed-format text list of data values on top of the
      // model. Global style settings first, the per-parameter list editor last.
      .addNumberInput({
        category: ['Key Parameters'],
        path: 'keyParamFontSize',
        name: 'Font Size',
        description: 'Font size of the key parameter overlay, in pixels',
        defaultValue: 14,
      })
      .addRadio({
        category: ['Key Parameters'],
        path: 'keyParamVerticalPosition',
        name: 'Vertical Position',
        settings: {
          options: [
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
          ],
        },
        defaultValue: 'top',
      })
      .addRadio({
        category: ['Key Parameters'],
        path: 'keyParamHorizontalPosition',
        name: 'Horizontal Position',
        settings: {
          options: [
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ],
        },
        defaultValue: 'left',
      })
      .addRadio({
        category: ['Key Parameters'],
        path: 'keyParamSeparator',
        name: 'Separator',
        description: 'Text placed between each parameter\'s name and value',
        settings: {
          options: [
            { value: 'colon', label: ':' },
            { value: 'equal', label: '=' },
            { value: 'space', label: '(space)' },
          ],
        },
        defaultValue: 'colon',
      })
      .addNumberInput({
        category: ['Key Parameters'],
        path: 'keyParamValueWidth',
        name: 'Value Width',
        description: 'Fixed width of the value column, in characters. Keeps the overlay size constant regardless of the value.',
        defaultValue: 8,
      })
      .addColorPicker({
        category: ['Key Parameters'],
        path: 'keyParamTextColor',
        name: 'Text Color',
        defaultValue: '#ffffff',
      })
      .addBooleanSwitch({
        category: ['Key Parameters'],
        path: 'keyParamBackground',
        name: 'Background',
        description: 'Show a background behind the overlay text',
        defaultValue: true,
      })
      .addColorPicker({
        category: ['Key Parameters'],
        path: 'keyParamBackgroundColor',
        name: 'Background Color',
        defaultValue: '#808080',
        showIf: (options) => options?.keyParamBackground,
      })
      .addSliderInput({
        category: ['Key Parameters'],
        path: 'keyParamBackgroundOpacity',
        name: 'Background Opacity',
        settings: { min: 0, max: 1, step: 0.05 },
        defaultValue: 0.25,
        showIf: (options) => options?.keyParamBackground,
      })
      .addRadio({
        category: ['Key Parameters'],
        path: 'keyParamShape',
        name: 'Shape',
        settings: {
          options: [
            { value: 'rect', label: 'Rectangle' },
            { value: 'rounded', label: 'Rounded' },
          ],
        },
        defaultValue: 'rounded',
      })
      .addBooleanSwitch({
        category: ['Key Parameters'],
        path: 'keyParamBorder',
        name: 'Border',
        defaultValue: true,
      })
      .addColorPicker({
        category: ['Key Parameters'],
        path: 'keyParamBorderColor',
        name: 'Border Color',
        defaultValue: '#ffffff',
        showIf: (options) => options?.keyParamBorder,
      })
      .addCustomEditor({
        category: ['Key Parameters'],
        id: 'keyParams',
        path: 'keyParams',
        name: '',
        description: 'Add and configure the key parameters shown over the model',
        editor: KeyParamsEditor,
        defaultValue: [],
      })
  })
