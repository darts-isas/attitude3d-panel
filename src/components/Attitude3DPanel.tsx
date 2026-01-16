import React, { useEffect, useRef, useState } from 'react'
import { DataFrame, PanelProps } from '@grafana/data'
import { Attitude3DOptions } from 'types'
import { css, cx } from '@emotion/css'
import { useStyles2, /*useTheme2*/ } from '@grafana/ui'
import { getTemplateSrv, PanelDataErrorView } from '@grafana/runtime'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'

interface Props extends PanelProps<Attitude3DOptions> {}

const getStyles = () => {
  return {
    wrapper: css`
      font-family: Open Sans;
      position: relative;
    `,
    svg: css`
      position: absolute;
      top: 0;
      left: 0;
    `,
    textBox: css`
      position: absolute;
      bottom: 0;
      left: 0;
      padding: 10px;
    `,
  }
}

const getFieldValue = (frames: DataFrame[], fieldName: string) => {
  for (const frame of frames) {
    for (const field of frame.fields) {
      if (field.name === fieldName) {
        return field.values[field.values.length - 1]
      }
    }
  }
  return 0
}

const ColorTable: {[key: string]: string} = {
  'dark-red'          : 'rgb(196, 22, 42)',
  'semi-dark-red'     : 'rgb(224, 47, 68)',
  'red'               : 'rgb(242, 73, 92)',
  'light-red'         : 'rgb(255, 115, 131)',
  'super-light-red'   : 'rgb(255, 166, 176)',
  'dark-orange'       : 'rgb(250, 100, 0)',
  'semi-dark-orange'  : 'rgb(255, 120, 10)',
  'orange'            : 'rgb(255, 152, 48)',
  'light-orange'      : 'rgb(255, 179, 87)',
  'super-light-orange': 'rgb(255, 203, 125)',
  'dark-yellow'       : 'rgb(224, 180, 0)',
  'semi-dark-yellow'  : 'rgb(242, 204, 12)',
  'yellow'            : 'rgb(250, 222, 42)',
  'light-yellow'      : 'rgb(255, 238, 82)',
  'super-light-yellow': 'rgb(255, 248, 153)',
  'dark-green'        : 'rgb(55, 135, 45)',
  'semi-dark-green'   : 'rgb(86, 166, 75)',
  'green'             : 'rgb(115, 191, 105)',
  'light-green'       : 'rgb(150, 217, 141)',
  'super-light-green' : 'rgb(200, 242, 194)',
  'dark-blue'         : 'rgb(31, 96, 196)',
  'semi-dark-blue'    : 'rgb(50, 116, 217)',
  'blue'              : 'rgb(87, 148, 242)',
  'light-blue'        : 'rgb(138, 184, 255)',
  'super-light-blue'  : 'rgb(192, 216, 255)',
  'dark-purple'       : 'rgb(143, 59, 184)',
  'semi-dark-purple'  : 'rgb(163, 82, 204)',
  'purple'            : 'rgb(184, 119, 217)',
  'light-purple'      : 'rgb(202, 149, 229)',
  'super-light-purple': 'rgb(222, 182, 242)',
}

const parseColor = (color: string): {color: THREE.Color, transparency: boolean} => {
  if (color.match(/^rgba/)) {
    const m = color.match(/^rgba\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\)$/)
    if (m) {
      return {color: new THREE.Color(
        parseInt(m[1], 10) / 255,
        parseInt(m[2], 10) / 255,
        parseInt(m[3], 10) / 255
      ), transparency: false}
    }
  }

  if (color.match(/^rgb/)) {
    return {color: new THREE.Color(color), transparency: false}
  }

  if (color.match(/^\#[0-9a-f]{8}/)) {
    const m = color.match(/^\#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/)
    if (m) {
      return {color: new THREE.Color(
        parseInt(m[1], 16) / 255,
        parseInt(m[2], 16) / 255,
        parseInt(m[3], 16) / 255
      ), transparency: parseInt(m[4], 16) === 0}
    }
  }

  if (color.match(/^\#[0-9a-f]{6}/)) {
    const m = color.match(/^\#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/)
    if (m) {
      return {color: new THREE.Color(
        parseInt(m[1], 16) / 255,
        parseInt(m[2], 16) / 255,
        parseInt(m[3], 16) / 255
      ), transparency: false}
    }
  }

  if (color === 'transparent') {
    return {color: new THREE.Color(1, 1, 1), transparency: true}
  }

  if (ColorTable[color]) {
    return {color: new THREE.Color(ColorTable[color]), transparency: false}
  }
  
  console.error('unknown color format:', color)
  return {color: new THREE.Color(color), transparency: false}
}

export const Attitude3DPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id }) => {
  const initialized = useRef<boolean>(false)

  // const theme = useTheme2();
  const styles = useStyles2(getStyles);

  const frame = useRef<HTMLDivElement | null>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const scene = useRef<THREE.Scene | null>(null)
  const size = useRef<{ width: number, height: number }>({ width, height })
  const camera = useRef<THREE.PerspectiveCamera | null>(null)
  const renderer = useRef<THREE.WebGLRenderer | null>(null)
  const controls = useRef<OrbitControls | null>(null)

  const model = useRef<THREE.Group | null>(null)
  const average = useRef<THREE.Vector3 | null>(null)
  const radius = useRef<number>(0.0000001)

  const pivot = useRef<THREE.Group | null>(null)

  const directionalLight = useRef<THREE.DirectionalLight | null>(null)
  const ambientLight = useRef<THREE.AmbientLight | null>(null)

  const axesHelper = useRef<THREE.AxesHelper | null>(null)

  // Template
  const tmplSrv = getTemplateSrv()

  const [modelURI, setModelURI] = useState(options.modelURI)
  const replacedModelURI = tmplSrv.replace(options.modelURI)
  if (replacedModelURI !== modelURI) {
    setModelURI(replacedModelURI)
  }

  // Params
  const modelRotationX = options.modelRotationType === 'field' ? getFieldValue(data.series, options.modelRotationX) : parseInt(tmplSrv.replace(options.modelRotationX +''), 10) || 0
  const modelRotationY = options.modelRotationType === 'field' ? getFieldValue(data.series, options.modelRotationY) : parseInt(tmplSrv.replace(options.modelRotationY + ''), 10) || 0
  const modelRotationZ = options.modelRotationType === 'field' ? getFieldValue(data.series, options.modelRotationZ) : parseInt(tmplSrv.replace(options.modelRotationZ + ''), 10) || 0
  const modelRotationW = options.modelRotationType === 'field' ? getFieldValue(data.series, options.modelRotationW) : parseInt(tmplSrv.replace(options.modelRotationW + ''), 10) || 0

  const cameraDirectionX = options.cameraDirectionType === 'field' ? getFieldValue(data.series, options.cameraDirectionX) : parseInt(tmplSrv.replace(options.cameraDirectionX + ''), 10) || 0
  const cameraDirectionY = options.cameraDirectionType === 'field' ? getFieldValue(data.series, options.cameraDirectionY) : parseInt(tmplSrv.replace(options.cameraDirectionY + ''), 10) || 0
  const cameraDirectionZ = options.cameraDirectionType === 'field' ? getFieldValue(data.series, options.cameraDirectionZ) : parseInt(tmplSrv.replace(options.cameraDirectionZ + ''), 10) || 0

  const directionalLightDirectionX = options.directionalLightDirectionType === 'field' ? getFieldValue(data.series, options.directionalLightDirectionX) : parseInt(tmplSrv.replace(options.directionalLightDirectionX + ''), 10) || 0
  const directionalLightDirectionY = options.directionalLightDirectionType === 'field' ? getFieldValue(data.series, options.directionalLightDirectionY) : parseInt(tmplSrv.replace(options.directionalLightDirectionY + ''), 10) || 0
  const directionalLightDirectionZ = options.directionalLightDirectionType === 'field' ? getFieldValue(data.series, options.directionalLightDirectionZ) : parseInt(tmplSrv.replace(options.directionalLightDirectionZ + ''), 10) || 0

  // Initialize Renderer
  const initRenderer = () => {
    if (!canvas.current) {
      // setTimeout(initRenderer, 500)
      return
    }

    scene.current = new THREE.Scene()

    camera.current = new THREE.PerspectiveCamera(75, size.current.width / size.current.height, 0.1, 1000)

    const vec = new THREE.Vector3(
      - cameraDirectionX,
      - cameraDirectionY,
      - cameraDirectionZ,
    )
    vec.normalize()
    vec.multiplyScalar(radius.current * parseFloat(options.cameraDistance))
    camera.current.position.set(vec.x, vec.y, vec.z)
    camera.current.lookAt(0, 0, 0)

    renderer.current = new THREE.WebGLRenderer({
      canvas: canvas.current,
      antialias: true,
      alpha: true,
    })
    renderer.current.setSize(size.current.width, size.current.height)
    renderer.current.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    pivot.current = new THREE.Group()
    pivot.current.position.set(0, 0, 0)
    scene.current.add(pivot.current)

    // Initial Light Settings
    directionalLight.current = new THREE.DirectionalLight(parseColor(options.directionalLightColor).color)
    directionalLight.current.position.set(
      - directionalLightDirectionX,
      - directionalLightDirectionY,
      - directionalLightDirectionZ,
    )
    directionalLight.current.intensity = parseFloat(options.directionalLightIntensity)
    scene.current.add(directionalLight.current)

    ambientLight.current = new THREE.AmbientLight(parseColor(options.ambientLightColor).color)
    ambientLight.current.intensity = parseFloat(options.ambientLightIntensity)
    scene.current.add(ambientLight.current)

    const tick = () => {
      requestAnimationFrame(tick)

      if (!scene.current || !camera.current || !renderer.current) { return }
      renderer.current.render(scene.current, camera.current)
      
      if (!controls.current) { return }
      controls.current.update()
    }
    tick()
  }
  
	useEffect(() => {
    if (initialized.current) { return }
    initRenderer()
    initialized.current = true
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Panel Size
  useEffect(() => {
    size.current = { width, height }

    if (!scene.current) { return }
    if (!camera.current) { return }
    if (!renderer.current) { return }
    if (size.current.width <= 0 || size.current.height <= 0) { return }

    camera.current.aspect = size.current.width / size.current.height
    camera.current.updateProjectionMatrix()
    renderer.current.setSize(size.current.width, size.current.height)
    renderer.current.setPixelRatio(window.devicePixelRatio)
    renderer.current.render(scene.current, camera.current)
  }, [width, height])

  // Background Color
  useEffect(() => {
    if (!scene.current) { return }
    const colorDef = parseColor(options.backgroundColor)
    if (colorDef.transparency) {
      scene.current.background = null
    }
    else {
      scene.current.background = colorDef.color
    }
  }, [options.backgroundColor])

  // Model
  useEffect(() => {
    if (!pivot.current) { return }
    
    if (model.current) {
      pivot.current.remove(model.current)
      model.current = null
    }
    
    const setupDefaultModel = () => {
      model.current = new THREE.Group()
      model.current.add(new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        // new THREE.MeshNormalMaterial(),
        new THREE.MeshLambertMaterial({ color: 0xffffff }),
      ))

      model.current.position.set(0, 0, 0)
      
      const sphere = new THREE.Sphere()
      const box = new THREE.Box3().setFromObject(model.current)
      box.getBoundingSphere(sphere)
      radius.current = sphere.radius

      if (!pivot.current) { return }
      pivot.current.add(model.current)

      if (!camera.current) {
        console.error('No camera')
        return
      }
      const vec = new THREE.Vector3(
        - cameraDirectionX,
        - cameraDirectionY,
        - cameraDirectionZ,
      )
      vec.normalize()
      vec.multiplyScalar(radius.current * parseFloat(options.cameraDistance))
      camera.current.position.set(vec.x, vec.y, vec.z)
      camera.current.lookAt(0, 0, 0)

      if (!controls.current) { return }
      controls.current.target.set(0, 0, 0)
      controls.current.maxDistance = radius.current * 3.0
      controls.current.minDistance = radius.current * 0.1
      controls.current.update()
    }

    const setupModel = (m: THREE.Group<THREE.Object3DEventMap>) => {
      model.current = m

      average.current = new THREE.Vector3(0,0,0)
      let count = 0

      model.current.traverse(child => {
        if (child instanceof THREE.Mesh && average.current) {
          count += child.geometry.attributes.position.count
          for (let i = 0; i < count; i++) {
            average.current.x += child.geometry.attributes.position.array[i * 3 + 0] || 0
            average.current.y += child.geometry.attributes.position.array[i * 3 + 1] || 0
            average.current.z += child.geometry.attributes.position.array[i * 3 + 2] || 0
          }
        }
      })

      average.current.x /= count
      average.current.y /= count
      average.current.z /= count

      const sphere = new THREE.Sphere()
      const box = new THREE.Box3().setFromObject(model.current)
      box.getBoundingSphere(sphere)
      radius.current = sphere.radius

      switch (options.modelCenter) {
        case 'sphere':
          const sphere = new THREE.Sphere()
          const box = new THREE.Box3().setFromObject(model.current)
          box.getBoundingSphere(sphere)
          model.current.position.set(-sphere.center.x, -sphere.center.y, -sphere.center.z)
          break
        case 'average':
          model.current.position.set(-average.current.x, -average.current.y, -average.current.z)
          break
        default:
          model.current.position.set(0, 0, 0)
          break
      }
      
      if (!pivot.current) { return }
      pivot.current.add(model.current)

      if (!camera.current) { return }
      const vec = new THREE.Vector3(
        - cameraDirectionX,
        - cameraDirectionY,
        - cameraDirectionZ,
      )
      vec.normalize()
      vec.multiplyScalar(radius.current * parseFloat(options.cameraDistance))
      camera.current.position.set(vec.x, vec.y, vec.z)
      camera.current.lookAt(0, 0, 0)

      if (!controls.current) { return }
      controls.current.target.set(0, 0, 0)
      controls.current.maxDistance = radius.current * 3.0
      controls.current.minDistance = radius.current * 0.1
      controls.current.update()
    }

    if (modelURI) {
      if (modelURI.match(/\.(?:glb|gltf)$/)) {
        const loader = new GLTFLoader()
        loader.load(modelURI, gltf => {
          setupModel(gltf.scene)
        }, (_progress) => {}, (err) => {
          console.error(err)
          setupDefaultModel()
        })
      }
      else if (modelURI.match(/\.(?:obj)$/)) {
        const loader = new OBJLoader()
        loader.load(modelURI, (obj) => {
          setupModel(obj)
        }, (_progress) => {}, (err) => {
          console.error(err)
          setupDefaultModel()
        })
      }
      else {
        // default model
        setupDefaultModel()
      }
    }
    else {
      // default model
      setupDefaultModel()
    }
  }, [modelURI]) // eslint-disable-line react-hooks/exhaustive-deps

  // Model Rotation
  useEffect(() => {
    if (!pivot.current) { return }

    const quaternion = new THREE.Quaternion(
      modelRotationX,
      modelRotationY,
      modelRotationZ,
      modelRotationW,
    )
    pivot.current.rotation.setFromQuaternion(quaternion)
  }, [modelRotationX, modelRotationY, modelRotationZ, modelRotationW])

  // Model Center
  useEffect(() => {
    if (!model.current) { return }
    if (!average.current) { return }

    const sphere = new THREE.Sphere()
    model.current.position.set(0, 0, 0)
    const box = new THREE.Box3().setFromObject(model.current)
    box.getBoundingSphere(sphere)

    switch (options.modelCenter) {
      case 'sphere':
        model.current.position.set(-sphere.center.x, -sphere.center.y, -sphere.center.z)
        break
      case 'average':
        model.current.position.set(-average.current.x, -average.current.y, -average.current.z)
        break
      default:
        model.current.position.set(0, 0, 0)
        break
    }
  }, [options.modelCenter])

  // Camera Direction
  useEffect(() => {
    if (!camera.current) { return }

    const vec = new THREE.Vector3(
      - cameraDirectionX,
      - cameraDirectionY,
      - cameraDirectionZ,
    )
    vec.normalize()
    vec.multiplyScalar(radius.current * parseFloat(options.cameraDistance))
    camera.current.position.set(vec.x, vec.y, vec.z)
    camera.current.lookAt(0, 0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraDirectionX, cameraDirectionY, cameraDirectionZ, options.cameraDistance])

  // Directional Light
  useEffect(() => {
    if (!directionalLight.current) { return }

    const vec = new THREE.Vector3(
      - directionalLightDirectionX,
      - directionalLightDirectionY,
      - directionalLightDirectionZ,
    )

    directionalLight.current.color.set(options.directionalLightColor)
    directionalLight.current.position.set(vec.x, vec.y, vec.z)

    directionalLight.current.intensity = parseFloat(options.directionalLightIntensity)
  }, [
    options.directionalLightColor, options.directionalLightIntensity,
    directionalLightDirectionX, directionalLightDirectionY, directionalLightDirectionZ,
  ])

  // Ambient Light
  useEffect(() => {
    if (!ambientLight.current) { return }
    if (options.ambientLightColor) {
      ambientLight.current.color.set(options.ambientLightColor)
    }
    if (options.ambientLightIntensity) {
      ambientLight.current.intensity = parseFloat(options.ambientLightIntensity)
    }
  }, [options.ambientLightColor, options.ambientLightIntensity])

  // Helper
  useEffect(() => {
    if (!scene.current) { return }
    if (options.showHelper && !axesHelper.current) {
      axesHelper.current = new THREE.AxesHelper(radius.current)
      scene.current.add(axesHelper.current)
    }
    else if (!options.showHelper && axesHelper.current) {
      scene.current.remove(axesHelper.current)
      axesHelper.current = null
    }
  }, [options.showHelper])

  // Mouse Control
  useEffect(() => {
    if (!camera.current || !renderer.current) { return }
    if (options.mouseControl) {
      if (controls.current) { return }
      controls.current = new OrbitControls(camera.current, renderer.current.domElement)
      controls.current.enableZoom = true
      controls.current.enableDamping = true
      controls.current.dampingFactor = 0.1
      controls.current.maxDistance = radius.current * 3.0
      controls.current.minDistance = radius.current * 0.1
      controls.current.mouseButtons = {
        LEFT  : THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT : THREE.MOUSE.PAN,
      }
    }
    else {
      if (!controls.current) { return }
      controls.current.dispose()
      controls.current = null

      const vec = new THREE.Vector3(
        - cameraDirectionX,
        - cameraDirectionY,
        - cameraDirectionZ,
      )
      vec.normalize()
      vec.multiplyScalar(radius.current * parseFloat(options.cameraDistance))
      camera.current.position.set(vec.x, vec.y, vec.z)
      camera.current.lookAt(0, 0, 0)
    }
  }, [options.mouseControl]) // eslint-disable-line react-hooks/exhaustive-deps

  if (data.series.length === 0) {
    return (<PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsStringField />)
  }
  
  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
			ref={frame}
    >
      <canvas ref={canvas} style={{width:'100%', height:'100%'}} />
    </div>
  );
};
