import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import {
  AdditiveBlending,
  AddEquation,
  Color,
  CustomBlending,
  OneFactor,
  SrcAlphaFactor,
  ZeroFactor,
  Vector2,
  Vector3,
  type Group,
  type PerspectiveCamera,
  type ShaderMaterial,
} from 'three'
import { setCursorLabel } from '@/components/CustomCursor/cursorEvents'
import { buildBrain, regionAt } from './brainGeometry'
import {
  brainHullFragmentShader,
  brainHullVertexShader,
  brainLineFragmentShader,
  brainLineVertexShader,
  MAX_REGIONS,
} from './brainShaders'
import type { BrainSceneProps } from './types'

const EFFECT_CODE = { pulse: 0, waves: 1, network: 2 } as const
/** Vista desde arriba y algo de frente: la silueta más reconocible de un cerebro */
const TOP_VIEW = 1.12
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Aleja la cámara lo justo para que el cerebro quepa, sea cual sea la proporción del lienzo */
function CameraFit() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const size = useThree((state) => state.size)

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const halfTan = Math.tan((camera.fov * Math.PI) / 360)
    // el cerebro ocupa ≈ 1,6 × 2,0 en pantalla; margen para el balanceo y la región inflada
    const needHeight = 2.2
    const needWidth = 1.95
    const z = Math.max(needHeight / 2 / halfTan, needWidth / 2 / halfTan / aspect)
    camera.position.set(0, 0, z)
    camera.updateProjectionMatrix()
  }, [camera, size])

  return null
}

function Brain({
  leftCount,
  rightCount,
  activeRegion,
  highlighted,
  panelOpen,
  effect,
  compact,
  reducedMotion,
  introRef,
  anchorRef,
  onHoverRegion,
  onSelectRegion,
}: Omit<BrainSceneProps, 'active'>) {
  const data = useMemo(
    () => buildBrain({ detail: compact ? 0.7 : 1, left: leftCount, right: rightCount, view: TOP_VIEW }),
    [compact, leftCount, rightCount]
  )
  const groupRef = useRef<Group>(null)
  const lineMaterialRef = useRef<ShaderMaterial>(null)
  const hullMaterialRef = useRef<ShaderMaterial>(null)
  const motion = useRef({ intro: 0, sway: 0 })
  const lastHover = useRef<number | null>(null)
  const projected = useMemo(() => new Vector3(), [])
  const local = useMemo(() => new Vector3(), [])

  const lineUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMask: { value: new Array<number>(MAX_REGIONS).fill(0) },
      uHasActive: { value: 0 },
      uActiveCenter: { value: new Vector3() },
      uEffect: { value: 0 },
      uIntro: { value: 0 },
      uWidth: { value: compact ? 2 : 2.3 },
      uResolution: { value: new Vector2(1, 1) },
      uColorLeft: { value: new Color('#c23a4b') },
      uColorRight: { value: new Color('#e38aa2') },
      uColorCore: { value: new Color('#fff1e6') },
    }),
    [compact]
  )
  const hullUniforms = useMemo(
    () => ({
      uIntro: { value: 0 },
      uTime: { value: 0 },
      uAnchors: {
        value: Array.from({ length: MAX_REGIONS }, (_, k) => (data.anchors[k] ?? new Vector3()).clone()),
      },
      // la misma máscara que las líneas: se pinta lo que se ilumina
      uMask: lineUniforms.uMask,
      uLeft: { value: leftCount },
      uCount: { value: data.anchors.length },
      uColorLeft: lineUniforms.uColorLeft,
      uColorRight: lineUniforms.uColorRight,
      uColorCore: lineUniforms.uColorCore,
    }),
    [data, leftCount, lineUniforms]
  )

  useFrame((state, delta) => {
    const lines = lineMaterialRef.current
    const hull = hullMaterialRef.current
    const group = groupRef.current
    if (!lines || !hull || !group) return
    const m = motion.current
    const t = reducedMotion ? 0 : state.clock.elapsedTime
    const u = lines.uniforms

    m.intro = reducedMotion ? 1 : lerp(m.intro, introRef.current, 1 - Math.exp(-delta * 5))
    u.uTime.value = t
    u.uIntro.value = m.intro
    hull.uniforms.uIntro.value = m.intro
    hull.uniforms.uTime.value = t
    u.uResolution.value.set(state.size.width, state.size.height)

    const mask = u.uMask.value as number[]
    mask.fill(0)
    highlighted.forEach((r) => {
      if (r >= 0 && r < MAX_REGIONS) mask[r] = 1
    })
    u.uHasActive.value = highlighted.length > 0 ? 1 : 0
    u.uEffect.value = EFFECT_CODE[effect]
    const center = activeRegion ?? highlighted[0]
    if (center !== undefined) u.uActiveCenter.value.copy(data.anchors[center])

    // Balanceo suave + inclinación con el mouse; con una idea activa, se queda quieto de frente
    const settled = highlighted.length > 0
    m.sway = lerp(m.sway, settled || reducedMotion ? 0 : Math.sin(t * 0.25) * 0.35, 0.03)
    const px = reducedMotion ? 0 : state.pointer.x
    const py = reducedMotion ? 0 : state.pointer.y
    group.rotation.y = lerp(group.rotation.y, m.sway + px * (settled ? 0.08 : 0.22), 0.06)
    group.rotation.x = lerp(group.rotation.x, TOP_VIEW - py * 0.12, 0.06)

    const scale = panelOpen ? 0.8 : 1
    group.scale.setScalar(lerp(group.scale.x, scale, 0.08))
    group.position.y = lerp(group.position.y, panelOpen ? 0.32 : 0, 0.08)

    // Proyectar el ancla de la región activa a píxeles para el cable de luz del DOM
    if (activeRegion !== null) {
      projected.copy(data.anchors[activeRegion]).applyMatrix4(group.matrixWorld).project(state.camera)
      anchorRef.current = {
        x: ((projected.x + 1) / 2) * state.size.width,
        y: ((1 - projected.y) / 2) * state.size.height,
        visible: true,
      }
    } else {
      anchorRef.current = { ...anchorRef.current, visible: false }
    }
  })

  // El hover se resuelve sobre el casco (las líneas son demasiado finas para apuntarles)
  const regionFrom = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    const group = groupRef.current
    const face = event.faceIndex ?? 0
    if (face >= data.hull.cerebellumFrom || !group) return null
    group.worldToLocal(local.copy(event.point))
    const region = regionAt(local, data.anchors, leftCount)
    return region >= 0 ? region : null
  }

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const region = regionFrom(event)
    if (region === lastHover.current) return
    lastHover.current = region
    onHoverRegion(region)
    setCursorLabel(region === null ? null : 'EXPLORE')
  }

  const handleOut = () => {
    lastHover.current = null
    onHoverRegion(null)
    setCursorLabel(null)
  }

  const { lines } = data

  return (
    <group ref={groupRef} rotation={[TOP_VIEW, 0, 0]}>
      <mesh
        renderOrder={0}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
        onClick={(event) => {
          event.stopPropagation()
          const region = regionFrom(event)
          if (region !== null) onSelectRegion(region)
        }}
      >
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.hull.positions, 3]} />
          <bufferAttribute attach="attributes-aPart" args={[data.hull.parts, 1]} />
          <bufferAttribute attach="index" args={[data.hull.index, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={hullMaterialRef}
          vertexShader={brainHullVertexShader}
          fragmentShader={brainHullFragmentShader}
          uniforms={hullUniforms}
          transparent
          depthWrite
          // suma luz sin tocar el alfa del lienzo: si no, oscurecería la página que hay detrás
          blending={CustomBlending}
          blendEquation={AddEquation}
          blendSrc={SrcAlphaFactor}
          blendDst={OneFactor}
          blendSrcAlpha={ZeroFactor}
          blendDstAlpha={OneFactor}
        />
      </mesh>

      <mesh renderOrder={1} raycast={() => null} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[lines.positions, 3]} />
          <bufferAttribute attach="attributes-aEnd" args={[lines.ends, 3]} />
          <bufferAttribute attach="attributes-aNormal" args={[lines.normals, 3]} />
          <bufferAttribute attach="attributes-aEdge" args={[lines.edges, 1]} />
          <bufferAttribute attach="attributes-aRegion" args={[lines.regions, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[lines.seeds, 1]} />
          <bufferAttribute attach="attributes-aSide" args={[lines.sides, 1]} />
          <bufferAttribute attach="attributes-aKind" args={[lines.kinds, 1]} />
          <bufferAttribute attach="index" args={[lines.index, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={lineMaterialRef}
          vertexShader={brainLineVertexShader}
          fragmentShader={brainLineFragmentShader}
          uniforms={lineUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

export default function BrainScene({ active, ...props }: BrainSceneProps) {
  useEffect(() => () => setCursorLabel(null), [])

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 32, position: [0, 0, 5] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
    >
      <CameraFit />
      <Brain {...props} />
    </Canvas>
  )
}
