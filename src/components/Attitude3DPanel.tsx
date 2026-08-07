import React, { useEffect, useRef, useState } from 'react'
import { LoadingState, PanelProps } from '@grafana/data'
import { Attitude3DOptions, DataField, ModelObject, ORIGIN_TARGET_ID } from 'types'
import { css, cx } from '@emotion/css'
import { IconButton, useStyles2, /*useTheme2*/ } from '@grafana/ui'
import { getTemplateSrv } from '@grafana/runtime'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { collectQuatSamples, sampleQuaternionAt, slerpPair, QuatSample } from './quaternionInterp'
import { getDataFieldValue, clampBrightness } from './dataFields'
import { disposeObject3D, removeAndDispose } from './threeDispose'

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
    resetCameraButton: css`
      position: absolute;
      top: 4px;
      right: 4px;
      background: rgba(0, 0, 0, 0.35);
      border-radius: 4px;
    `,
  }
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

const ZERO_VEC = new THREE.Vector3(0, 0, 0)

// Clone each mesh's material once, right after a model is created, so brightness can be
// applied per-object without leaking into other meshes/objects that might reference the
// same shared material instance.
const prepareMaterialsForBrightness = (root: THREE.Object3D): void => {
  const cloneWithBase = (material: THREE.Material): THREE.Material => {
    const cloned = material.clone()
    const m = cloned as any
    if (m.color instanceof THREE.Color) {
      cloned.userData.baseColor = m.color.clone()
    }
    if (m.emissive instanceof THREE.Color) {
      cloned.userData.baseEmissive = m.emissive.clone()
    }
    return cloned
  }

  root.traverse(child => {
    if (!(child instanceof THREE.Mesh) || !child.material) { return }
    child.material = Array.isArray(child.material)
      ? child.material.map(cloneWithBase)
      : cloneWithBase(child.material)
  })
}

// Darken an object's materials by multiplying their authored diffuse/emissive color toward
// black. Never touches opacity/transparent/depthWrite, so the object stays fully opaque
// (still correctly occludes other objects) and only appears dimmer under the same lighting.
const applyBrightnessTo = (root: THREE.Object3D, brightness: number): void => {
  const applyToMaterial = (material: THREE.Material) => {
    const m = material as any
    const baseColor: THREE.Color | undefined = material.userData?.baseColor
    if (baseColor && m.color instanceof THREE.Color) {
      m.color.copy(baseColor).multiplyScalar(brightness)
    }
    const baseEmissive: THREE.Color | undefined = material.userData?.baseEmissive
    if (baseEmissive && m.emissive instanceof THREE.Color) {
      m.emissive.copy(baseEmissive).multiplyScalar(brightness)
    }
  }

  root.traverse(child => {
    if (!(child instanceof THREE.Mesh) || !child.material) { return }
    if (Array.isArray(child.material)) {
      child.material.forEach(m => applyToMaterial(m))
    }
    else {
      applyToMaterial(child.material)
    }
  })
}

type ObjectEntry = {
  id: string
  root: THREE.Group
  model: THREE.Object3D | null
  average: THREE.Vector3 | null       // vertex average, in the model's own local space
  sphereCenter: THREE.Vector3 | null  // bounding sphere center, in the model's own local space
  baseRadius: number                  // bounding sphere radius before scale is applied
  scale: number
  brightness: number                  // currently applied brightness (0-1), resolved from data
  uri: string                         // resolved URI currently loaded
  modelCenter: 'origin' | 'sphere' | 'average'
  loadToken: number
  quatBuffer: QuatSample[]
  quatBufferKey: string
  lastBufferTail: number                     // t of the last sample seen on the previous tick, to detect a new arrival
  lastBufferPair: [QuatSample, QuatSample] | null  // the (n-2, n-1) pair backing extrapolation, snapshotted each tick
  catchUpFrom: [QuatSample, QuatSample] | null     // the pair frozen at the start of an active catch-up blend
  catchUpStart: number                       // Date.now() when the active blend began
  catchUpDeadline: number                    // Date.now()-based; a catch-up blend is active while now < this
}

const effRadius = (e: ObjectEntry) => Math.max(e.baseRadius * e.scale, 1e-7)

// Interpolation needs the four rotation slots to all be data fields; a mix with a const slot
// has no time series to sample against. When it isn't active the static quaternion path
// drives the object instead, so this predicate has to gate both sides or the object would be
// left at identity.
const isInterpActive = (o: ModelObject): boolean =>
  o.interpEnabled === true &&
  o.quatX?.sourceType === 'field' && o.quatY?.sourceType === 'field' &&
  o.quatZ?.sourceType === 'field' && o.quatW?.sourceType === 'field'

// Radius of a sphere centered at the origin that contains every object's root position
// plus its own effective radius. Used for the AxesHelper size and as the camera's
// fallback framing radius when the target is the origin (or a deleted object).
const encompassingRadius = (entries: Map<string, ObjectEntry>): number => {
  let max = 0
  entries.forEach(entry => {
    const r = entry.root.position.length() + effRadius(entry)
    if (r > max) { max = r }
  })
  return entries.size === 0 ? 1 : max
}

export const Attitude3DPanel: React.FC<Props> = ({ options, data, width, height }) => {
  // const theme = useTheme2();
  const styles = useStyles2(getStyles);

  const frame = useRef<HTMLDivElement | null>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const scene = useRef<THREE.Scene | null>(null)
  const size = useRef<{ width: number, height: number }>({ width, height })
  const camera = useRef<THREE.PerspectiveCamera | null>(null)
  const renderer = useRef<THREE.WebGLRenderer | null>(null)
  const controls = useRef<OrbitControls | null>(null)
  const rafId = useRef<number>(0)

  const directionalLight = useRef<THREE.DirectionalLight | null>(null)
  const ambientLight = useRef<THREE.AmbientLight | null>(null)

  const axesHelper = useRef<THREE.AxesHelper | null>(null)

  const [sceneVersion, setSceneVersion] = useState(0)

  // Object registry, keyed by ModelObject.id.
  const objectsRef = useRef<Map<string, ObjectEntry>>(new Map())

  // Per-object interpolation config and the camera-target id, refreshed every render so
  // the rAF loop (a closure created once in initRenderer) always sees the latest values.
  const objectCfgRef = useRef<Map<string, { interpEnabled: boolean; interpCatchUpMs: number }>>(new Map())
  const cameraTargetIdRef = useRef<string>(ORIGIN_TARGET_ID)

  const lastData = useRef<unknown>(null)
  const dataArrivedAt = useRef<number>(Date.now())
  const extrapState = useRef<{
    timeRangeToMs: number
    followNow: boolean
  } | null>(null)

  const lastTargetPos = useRef(new THREE.Vector3())

  // Stamp the arrival time during render, not in an effect: extrapState below is assigned
  // during render too, so an effect-set stamp would pair a fresh timeRangeToMs with the
  // previous arrival time and overshoot the target by one refresh interval.
  if (lastData.current !== data) {
    lastData.current = data
    dataArrivedAt.current = Date.now()
  }

  // Template
  const tmplSrv = getTemplateSrv()

  const evalDataField = (df: DataField | undefined, fallback: number): number => {
    if (!df || df.sourceType === 'const') {
      const v = parseFloat(tmplSrv.replace(String(df?.value ?? '')))
      return Number.isFinite(v) ? v : fallback
    }
    return getDataFieldValue(data.series, df, fallback)
  }

  // Params
  const cameraDirectionX = options.cameraDirectionType === 'field' ? getDataFieldValue(data.series, { sourceType: 'field', value: options.cameraDirectionX }, 0) : parseFloat(tmplSrv.replace(options.cameraDirectionX + '')) || 0
  const cameraDirectionY = options.cameraDirectionType === 'field' ? getDataFieldValue(data.series, { sourceType: 'field', value: options.cameraDirectionY }, 0) : parseFloat(tmplSrv.replace(options.cameraDirectionY + '')) || 0
  const cameraDirectionZ = options.cameraDirectionType === 'field' ? getDataFieldValue(data.series, { sourceType: 'field', value: options.cameraDirectionZ }, 0) : parseFloat(tmplSrv.replace(options.cameraDirectionZ + '')) || 0

  const directionalLightDirectionX = options.directionalLightDirectionType === 'field' ? getDataFieldValue(data.series, { sourceType: 'field', value: options.directionalLightDirectionX }, 0) : parseFloat(tmplSrv.replace(options.directionalLightDirectionX + '')) || 0
  const directionalLightDirectionY = options.directionalLightDirectionType === 'field' ? getDataFieldValue(data.series, { sourceType: 'field', value: options.directionalLightDirectionY }, 0) : parseFloat(tmplSrv.replace(options.directionalLightDirectionY + '')) || 0
  const directionalLightDirectionZ = options.directionalLightDirectionType === 'field' ? getDataFieldValue(data.series, { sourceType: 'field', value: options.directionalLightDirectionZ }, 0) : parseFloat(tmplSrv.replace(options.directionalLightDirectionZ + '')) || 0

  cameraTargetIdRef.current = options.cameraTargetId ?? ORIGIN_TARGET_ID

  const objectList = Array.isArray(options.objects) ? options.objects : []
  const resolvedObjects = objectList.map(o => ({ ...o, resolvedURI: tmplSrv.replace(o.modelURI ?? '') }))
  const sceneHash = JSON.stringify(
    resolvedObjects.filter(o => o.visible !== false)
      .map(o => [o.id, o.resolvedURI, o.modelCenter, o.scale])
  )

  const interpHash = JSON.stringify(
    objectList.map(o => [
      o.id, o.interpEnabled, o.interpTimeField, o.interpBufferSize,
      o.quatX?.sourceType, o.quatX?.value,
      o.quatY?.sourceType, o.quatY?.value,
      o.quatZ?.sourceType, o.quatZ?.value,
      o.quatW?.sourceType, o.quatW?.value,
    ])
  )

  // Refresh the per-object interpolation config and the shared extrapolation state every
  // render so the rAF loop (a closure created once in initRenderer) always sees the latest
  // values via refs.
  objectCfgRef.current.clear()
  objectList.forEach(o => {
    objectCfgRef.current.set(o.id, {
      interpEnabled: isInterpActive(o),
      interpCatchUpMs: Number.isFinite(Number(o.interpCatchUpMs)) ? Math.max(0, Number(o.interpCatchUpMs)) : 0,
    })
  })

  // Only a relative 'now...' range keeps advancing in real time. An absolute range may also
  // arrive as an ISO string, so testing for a string alone would wrongly follow the clock.
  const rawTo = data.timeRange?.raw?.to
  const followNow = typeof rawTo === 'string' && rawTo.startsWith('now')
  extrapState.current = {
    timeRangeToMs: data.timeRange ? data.timeRange.to.valueOf() : 0,
    followNow,
  }

  // Applies the interpolated/extrapolated quaternion to every object with interpolation
  // enabled. Reads only refs (no closed-over state), so calling it from the tick loop's
  // stale closure is still correct.
  const applyInterpolatedRotations = () => {
    const st = extrapState.current
    if (!st) { return }

    const now = Date.now()

    const target = st.followNow
      ? st.timeRangeToMs + (now - dataArrivedAt.current)
      : st.timeRangeToMs

    objectsRef.current.forEach((entry, id) => {
      const cfg = objectCfgRef.current.get(id)
      if (!cfg || !cfg.interpEnabled) { return }

      const buffer = entry.quatBuffer
      const n = buffer.length
      if (n === 0) { return }

      const qNew = sampleQuaternionAt(buffer, target)
      if (!qNew) { return }

      const tLast = buffer[n - 1].t
      if (entry.lastBufferTail !== tLast) {
        // A new real sample just shifted the extrapolation basis (the last two buffered
        // points) out from under us. Freeze the pair that was driving extrapolation up to
        // this tick so we can crossfade away from it below, instead of snapping straight
        // onto the corrected orientation.
        if (entry.lastBufferPair && cfg.interpCatchUpMs > 0) {
          entry.catchUpFrom = entry.lastBufferPair
          entry.catchUpStart = now
          entry.catchUpDeadline = now + cfg.interpCatchUpMs
        }
        entry.lastBufferTail = tLast
        entry.lastBufferPair = n >= 2 ? [buffer[n - 2], buffer[n - 1]] : null
      }

      if (entry.catchUpFrom && entry.catchUpDeadline > now) {
        const [a, b] = entry.catchUpFrom
        const qOld = slerpPair(a, b, target)
        const raw = (now - entry.catchUpStart) / (entry.catchUpDeadline - entry.catchUpStart)
        const ratio = raw * raw * (3 - 2 * raw) // smoothstep: eases in/out at both ends
        entry.root.quaternion.copy(qOld).slerp(qNew, ratio)
      }
      else {
        entry.root.quaternion.copy(qNew)
      }
    })
  }

  // Keeps the camera's position/orientation relative to the current camera target as the
  // target moves, by translating the camera by the target's delta rather than recomputing
  // an absolute position (which would fight with mouse control / OrbitControls).
  const followCameraTarget = () => {
    if (!camera.current) { return }

    const entry = objectsRef.current.get(cameraTargetIdRef.current)
    const center = entry ? entry.root.position : ZERO_VEC
    const delta = center.clone().sub(lastTargetPos.current)
    if (delta.lengthSq() === 0) { return }

    camera.current.position.add(delta)
    lastTargetPos.current.copy(center)
    if (controls.current) { controls.current.target.copy(center) }
    else { camera.current.lookAt(center) }
  }

  const applyCenter = (entry: ObjectEntry) => {
    const model = entry.model
    if (!model) { return }

    // Both offsets are measured once at load time in the model's own local space. Recomputing
    // the bounding box here would be wrong twice over: Box3.setFromObject works in world
    // space (so it would pick up root's position/rotation/scale), and the model already
    // carries the previous centering offset, which would be applied a second time.
    switch (entry.modelCenter) {
      case 'sphere': {
        const c = entry.sphereCenter ?? ZERO_VEC
        model.position.set(-c.x, -c.y, -c.z)
        break
      }
      case 'average': {
        const avg = entry.average ?? ZERO_VEC
        model.position.set(-avg.x, -avg.y, -avg.z)
        break
      }
      default:
        model.position.set(0, 0, 0)
        break
    }
  }

  // Measures the model in its own local space. Must be called while obj is still detached
  // from the scene graph, so child.matrixWorld is relative to obj itself.
  const measureModel = (obj: THREE.Object3D): { average: THREE.Vector3, sphereCenter: THREE.Vector3, baseRadius: number } => {
    obj.position.set(0, 0, 0)
    obj.updateMatrixWorld(true)

    const sum = new THREE.Vector3(0, 0, 0)
    let total = 0

    obj.traverse(child => {
      if (!(child instanceof THREE.Mesh)) { return }
      const posAttr = child.geometry.attributes.position
      if (!posAttr) { return }

      const v = new THREE.Vector3()
      for (let i = 0; i < posAttr.count; i++) {
        v.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
        v.applyMatrix4(child.matrixWorld)
        sum.add(v)
        total++
      }
    })

    const average = total > 0 ? sum.divideScalar(total) : new THREE.Vector3(0, 0, 0)

    const sphere = new THREE.Sphere()
    new THREE.Box3().setFromObject(obj).getBoundingSphere(sphere)
    const baseRadius = Number.isFinite(sphere.radius) && sphere.radius > 0 ? sphere.radius : 1e-7

    return { average, sphereCenter: sphere.center.clone(), baseRadius }
  }

  const setupModel = (entry: ObjectEntry, obj: THREE.Object3D) => {
    if (entry.model) {
      removeAndDispose(entry.model)
      entry.model = null
    }

    const { average, sphereCenter, baseRadius } = measureModel(obj)
    entry.average = average
    entry.sphereCenter = sphereCenter
    entry.baseRadius = baseRadius
    entry.model = obj

    applyCenter(entry)
    prepareMaterialsForBrightness(obj)
    applyBrightnessTo(obj, entry.brightness)

    entry.root.add(obj)
  }

  const setupDefaultModel = (entry: ObjectEntry) => {
    if (entry.model) {
      removeAndDispose(entry.model)
      entry.model = null
    }

    const group = new THREE.Group()
    group.add(new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    ))

    const { average, sphereCenter, baseRadius } = measureModel(group)
    entry.average = average
    entry.sphereCenter = sphereCenter
    entry.baseRadius = baseRadius
    entry.model = group

    applyCenter(entry)
    prepareMaterialsForBrightness(group)
    applyBrightnessTo(group, entry.brightness)

    entry.root.add(group)
  }

  const loadModelFor = (entry: ObjectEntry, uri: string) => {
    const token = ++entry.loadToken
    entry.uri = uri

    const accept = (obj: THREE.Object3D) => {
      // Drop the result if this object was deleted, or a newer load overtook this one.
      if (entry.loadToken !== token || objectsRef.current.get(entry.id) !== entry) {
        disposeObject3D(obj)
        return
      }
      setupModel(entry, obj)
      setSceneVersion(v => v + 1)
    }
    const fallback = () => {
      if (entry.loadToken !== token) { return }
      setupDefaultModel(entry)
      setSceneVersion(v => v + 1)
    }

    if (uri && uri.match(/\.(?:glb|gltf)$/)) {
      const loader = new GLTFLoader()
      loader.load(uri, gltf => accept(gltf.scene), (_progress) => {}, (err) => {
        console.error(err)
        fallback()
      })
    }
    else if (uri && uri.match(/\.(?:obj)$/)) {
      const loader = new OBJLoader()
      loader.load(uri, obj => accept(obj), (_progress) => {}, (err) => {
        console.error(err)
        fallback()
      })
    }
    else {
      // default model
      fallback()
    }
  }

  // Initialize Renderer
  const initRenderer = () => {
    if (!canvas.current) { return }

    scene.current = new THREE.Scene()

    camera.current = new THREE.PerspectiveCamera(75, size.current.width / size.current.height, 0.1, 1000)
    camera.current.position.set(0, 0, 2)
    camera.current.lookAt(0, 0, 0)

    renderer.current = new THREE.WebGLRenderer({
      canvas: canvas.current,
      antialias: true,
      alpha: true,
    })
    renderer.current.setSize(size.current.width, size.current.height)
    renderer.current.setPixelRatio(Math.min(window.devicePixelRatio, 2))

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
      rafId.current = requestAnimationFrame(tick)

      if (!scene.current || !camera.current || !renderer.current) { return }

      // Reads only refs, so it stays correct even though tick is a closure created once.
      applyInterpolatedRotations()
      followCameraTarget()

      renderer.current.render(scene.current, camera.current)

      if (!controls.current) { return }
      controls.current.update()
    }
    tick()
  }

	useEffect(() => {
    initRenderer()

    // Captured once: objectsRef.current is the same Map instance for the component's
    // whole lifetime (only ever mutated in place), so this is safe to use in cleanup.
    const objects = objectsRef.current

    return () => {
      cancelAnimationFrame(rafId.current)

      objects.forEach(entry => {
        scene.current?.remove(entry.root)
        disposeObject3D(entry.root)
      })
      objects.clear()

      if (axesHelper.current) {
        axesHelper.current.dispose()
        axesHelper.current = null
      }

      controls.current?.dispose()
      controls.current = null

      renderer.current?.dispose()
      renderer.current = null

      scene.current = null
      camera.current = null
      directionalLight.current = null
      ambientLight.current = null
    }
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

  // Scene sync: create/destroy/reload ObjectEntry instances to match options.objects.
  useEffect(() => {
    if (!scene.current) { return }

    const visibleObjects = objectList.filter(o => o.visible !== false)
    const wantedIds = new Set(visibleObjects.map(o => o.id))
    let changed = false

    // Discard entries no longer wanted.
    objectsRef.current.forEach((entry, id) => {
      if (wantedIds.has(id)) { return }

      entry.loadToken++
      scene.current?.remove(entry.root)
      disposeObject3D(entry.root)
      objectsRef.current.delete(id)
      changed = true
    })

    visibleObjects.forEach(o => {
      const resolvedURI = tmplSrv.replace(o.modelURI ?? '')
      let entry = objectsRef.current.get(o.id)

      if (!entry) {
        const root = new THREE.Group()
        scene.current?.add(root)

        entry = {
          id: o.id,
          root,
          model: null,
          average: null,
          sphereCenter: null,
          baseRadius: 1e-7,
          scale: o.scale,
          brightness: 1, // resolved to the real value by the data effect right after creation
          uri: '',
          modelCenter: o.modelCenter,
          loadToken: 0,
          quatBuffer: [],
          quatBufferKey: '',
          lastBufferTail: -Infinity,
          lastBufferPair: null,
          catchUpFrom: null,
          catchUpStart: 0,
          catchUpDeadline: 0,
        }
        root.scale.setScalar(o.scale)
        objectsRef.current.set(o.id, entry)
        loadModelFor(entry, resolvedURI)
        changed = true
        return
      }

      if (resolvedURI !== entry.uri) {
        if (entry.model) {
          removeAndDispose(entry.model)
          entry.model = null
        }
        loadModelFor(entry, resolvedURI)
        changed = true
      }

      if (o.scale !== entry.scale) {
        entry.scale = o.scale
        entry.root.scale.setScalar(o.scale)
        changed = true
      }

      if (o.modelCenter !== entry.modelCenter) {
        entry.modelCenter = o.modelCenter
        applyCenter(entry)
        changed = true
      }
    })

    if (changed) { setSceneVersion(v => v + 1) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneHash])

  // Position / orientation from data.
  useEffect(() => {
    objectList.forEach(o => {
      const entry = objectsRef.current.get(o.id)
      if (!entry) { return }

      entry.root.position.set(evalDataField(o.posX, 0), evalDataField(o.posY, 0), evalDataField(o.posZ, 0))

      if (!isInterpActive(o)) {
        const q = new THREE.Quaternion(
          evalDataField(o.quatX, 0), evalDataField(o.quatY, 0),
          evalDataField(o.quatZ, 0), evalDataField(o.quatW, 1),
        )
        if (q.lengthSq() > 0) {
          q.normalize()
          entry.root.quaternion.copy(q)
        }
      }

      const brightness = clampBrightness(evalDataField(o.brightness, 1))
      if (brightness !== entry.brightness) {
        entry.brightness = brightness
        if (entry.model) { applyBrightnessTo(entry.model, brightness) }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, options.objects])

  // Quaternion Interpolation - collect samples into each object's buffer.
  useEffect(() => {
    if (data.state === LoadingState.Error) { return }

    objectList.forEach((o: ModelObject) => {
      const entry = objectsRef.current.get(o.id)
      if (!entry) { return }

      if (!isInterpActive(o)) {
        entry.quatBuffer = []
        entry.quatBufferKey = ''
        return
      }

      const bufferSize = Math.max(2, Math.floor(Number(o.interpBufferSize) || 2))

      const key = [
        o.quatX.value, o.quatY.value, o.quatZ.value, o.quatW.value,
        o.interpTimeField,
      ].join('|')
      if (key !== entry.quatBufferKey) {
        entry.quatBuffer = []
        entry.quatBufferKey = key
      }

      const incoming = collectQuatSamples(
        data.series,
        { x: o.quatX.value, y: o.quatY.value, z: o.quatZ.value, w: o.quatW.value },
        o.interpTimeField ?? '',
        bufferSize,
        dataArrivedAt.current,
      )
      if (incoming.length === 0) { return }

      const buffer = entry.quatBuffer
      if (buffer.length !== 0 && incoming[incoming.length - 1].t < buffer[buffer.length - 1].t) {
        // Time range moved/zoomed into the past: discard the stale buffer and adopt incoming as-is.
        entry.quatBuffer = [...incoming]
      }
      else {
        const lastT = buffer.length !== 0 ? buffer[buffer.length - 1].t : -Infinity
        const toAppend = incoming.filter(sample => sample.t > lastT)
        if (toAppend.length !== 0) {
          entry.quatBuffer = [...buffer, ...toAppend]
        }
      }

      if (entry.quatBuffer.length > bufferSize) {
        entry.quatBuffer.splice(0, entry.quatBuffer.length - bufferSize)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, interpHash])

  // Places the camera at its configured default position/orientation relative to the current
  // camera target. Shared by the camera-direction effect and the manual reset button so both
  // stay in sync.
  const resetCamera = () => {
    if (!camera.current) { return }

    const targetEntry = objectsRef.current.get(cameraTargetIdRef.current)
    const center = targetEntry ? targetEntry.root.position : new THREE.Vector3(0, 0, 0)
    const baseRadius = targetEntry ? effRadius(targetEntry) : encompassingRadius(objectsRef.current)

    let distance = baseRadius * parseFloat(options.cameraDistance)
    if (!Number.isFinite(distance) || distance <= 0) {
      distance = baseRadius * 2
    }

    const vec = new THREE.Vector3(
      - cameraDirectionX,
      - cameraDirectionY,
      - cameraDirectionZ,
    )
    if (vec.lengthSq() === 0) { vec.set(0, 0, 1) }
    vec.normalize()
    vec.multiplyScalar(distance)

    camera.current.position.set(center.x + vec.x, center.y + vec.y, center.z + vec.z)
    camera.current.lookAt(center)
    lastTargetPos.current.copy(center)

    camera.current.near = Math.max(distance * 0.01, 1e-4)
    camera.current.far = Math.max(distance * 100, 1000)
    camera.current.updateProjectionMatrix()

    if (controls.current) {
      controls.current.target.copy(center)
      controls.current.maxDistance = baseRadius * 3.0
      controls.current.minDistance = baseRadius * 0.1
      controls.current.update()
    }
  }

  // Camera Direction / Target
  useEffect(() => {
    resetCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraDirectionX, cameraDirectionY, cameraDirectionZ, options.cameraDistance, options.cameraTargetId, sceneVersion])

  // Directional Light
  useEffect(() => {
    if (!directionalLight.current) { return }

    const vec = new THREE.Vector3(
      - directionalLightDirectionX,
      - directionalLightDirectionY,
      - directionalLightDirectionZ,
    )

    directionalLight.current.color.set(parseColor(options.directionalLightColor).color)
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
      ambientLight.current.color.set(parseColor(options.ambientLightColor).color)
    }
    if (options.ambientLightIntensity) {
      ambientLight.current.intensity = parseFloat(options.ambientLightIntensity)
    }
  }, [options.ambientLightColor, options.ambientLightIntensity])

  // Helper
  useEffect(() => {
    if (!scene.current) { return }

    if (axesHelper.current) {
      scene.current.remove(axesHelper.current)
      axesHelper.current.dispose()
      axesHelper.current = null
    }

    if (options.showHelper) {
      axesHelper.current = new THREE.AxesHelper(encompassingRadius(objectsRef.current))
      scene.current.add(axesHelper.current)
    }
  }, [options.showHelper, sceneVersion])

  // Mouse Control
  useEffect(() => {
    if (!camera.current || !renderer.current) { return }

    const targetEntry = objectsRef.current.get(cameraTargetIdRef.current)
    const center = targetEntry ? targetEntry.root.position : new THREE.Vector3(0, 0, 0)
    const baseRadius = targetEntry ? effRadius(targetEntry) : encompassingRadius(objectsRef.current)

    if (options.mouseControl) {
      if (controls.current) { return }
      controls.current = new OrbitControls(camera.current, renderer.current.domElement)
      controls.current.enableZoom = true
      controls.current.enableDamping = true
      controls.current.dampingFactor = 0.1
      controls.current.target.copy(center)
      controls.current.maxDistance = baseRadius * 3.0
      controls.current.minDistance = baseRadius * 0.1
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
      resetCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.mouseControl])

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
      <div className={styles.resetCameraButton}>
        <IconButton
          name="camera"
          tooltip="Reset camera to default position"
          aria-label="Reset camera to default position"
          onClick={resetCamera}
        />
      </div>
    </div>
  );
};
