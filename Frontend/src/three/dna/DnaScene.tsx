import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, Sparkles } from '@react-three/drei'
import type {
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
} from 'three'
import { setCursorLabel } from '@/components/CustomCursor/cursorEvents'
import { buildHelix } from './helix'
import type { DnaSceneProps } from './types'

const TAU = Math.PI * 2
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Aleja la cámara lo justo para que la hélice entera quepa en el lienzo */
function CameraFit({ length, horizontal }: { length: number; horizontal: boolean }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const size = useThree((state) => state.size)

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const vFov = (camera.fov * Math.PI) / 180
    // margen amplio: la perspectiva y la inclinación con el mouse acercan los extremos a la cámara
    const needed = horizontal ? Math.max(5.6, (length * 1.5) / aspect) : length * 1.32
    camera.position.set(0, 0, needed / 2 / Math.tan(vFov / 2))
    camera.updateProjectionMatrix()
  }, [camera, size, length, horizontal])

  return null
}

function Helix({
  items,
  hovered,
  selected,
  category,
  horizontal,
  reducedMotion,
  assembleRef,
  scrollRef,
  onHover,
  onSelect,
}: Omit<DnaSceneProps, 'active'>) {
  const helix = useMemo(() => buildHelix(items.length), [items.length])
  const shiftRef = useRef<Group>(null)
  const tiltRef = useRef<Group>(null)
  const spinRef = useRef<Group>(null)
  const beadRefs = useRef<(Mesh | null)[]>([])
  const rungRefs = useRef<(Mesh | null)[]>([])
  const backboneRefs = useRef<(Mesh | null)[]>([])
  const motion = useRef({ assemble: 0, spin: 0, lastScroll: -1 })

  const hoveredIndex = items.findIndex((item) => item.id === hovered)
  const selectedIndex = items.findIndex((item) => item.id === selected)

  useFrame((state, delta) => {
    const m = motion.current
    const dt = Math.min(delta, 0.05)

    // Ensamblaje suavizado: de nube dispersa (la red de MI MENTE) a hélice
    m.assemble = lerp(m.assemble, reducedMotion ? 1 : assembleRef.current, 1 - Math.exp(-dt * 6))
    const eased = 1 - Math.pow(1 - m.assemble, 3)

    // Giro: automático + el que añade el scroll; si hay selección, gira hasta ponerla de frente
    const scroll = scrollRef.current
    if (m.lastScroll < 0) m.lastScroll = scroll
    if (selectedIndex >= 0) {
      const target = helix.beads[selectedIndex].angle - Math.PI / 2
      const nearest = target + Math.round((m.spin - target) / TAU) * TAU
      m.spin = lerp(m.spin, nearest, 1 - Math.exp(-dt * 4))
    } else if (!reducedMotion) {
      m.spin += dt * 0.22 + (scroll - m.lastScroll) * TAU
    }
    m.lastScroll = scroll
    if (spinRef.current) spinRef.current.rotation.y = m.spin

    // Inclinación siguiendo el mouse
    const tilt = tiltRef.current
    if (tilt) {
      const px = reducedMotion ? 0 : state.pointer.x
      const py = reducedMotion ? 0 : state.pointer.y
      tilt.rotation.x = lerp(tilt.rotation.x, -py * 0.22, 0.06)
      tilt.rotation.y = lerp(tilt.rotation.y, px * 0.2, 0.06)
    }

    // En desktop la hélice se corre para dejar sitio a la ficha
    const shift = shiftRef.current
    if (shift) {
      const targetX = horizontal && selectedIndex >= 0 ? -2.6 : 0
      shift.position.x = lerp(shift.position.x, targetX, 0.06)
    }

    helix.beads.forEach((bead, i) => {
      const mesh = beadRefs.current[i]
      if (!mesh) return
      mesh.position.lerpVectors(bead.scatter, bead.position, eased)
      const focused = i === hoveredIndex || i === selectedIndex
      const dimmed = category !== null && items[i].category !== category
      const targetScale = (focused ? 1.55 : 1) * (0.35 + 0.65 * eased)
      mesh.scale.setScalar(lerp(mesh.scale.x, targetScale, 0.15))
      const material = mesh.material as MeshPhysicalMaterial
      material.opacity = lerp(material.opacity, dimmed ? 0.1 : 1, 0.12)
      material.depthWrite = !dimmed
      material.emissiveIntensity = lerp(material.emissiveIntensity, focused ? 1.1 : dimmed ? 0 : 0.28, 0.12)
    })

    const rungOpacity = smoothstep(0.8, 1, m.assemble) * 0.32
    rungRefs.current.forEach((mesh) => {
      if (mesh) (mesh.material as MeshBasicMaterial).opacity = rungOpacity
    })
    const boneOpacity = smoothstep(0.55, 1, m.assemble) * 0.55
    backboneRefs.current.forEach((mesh) => {
      if (mesh) (mesh.material as MeshStandardMaterial).opacity = boneOpacity
    })
  })

  const handleOver = (id: string) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onHover(id)
    setCursorLabel('INFO')
  }
  const handleOut = () => {
    onHover(null)
    setCursorLabel(null)
  }

  return (
    <group ref={shiftRef}>
      <group ref={tiltRef}>
        <group rotation={[0, 0, horizontal ? Math.PI / 2 : 0]}>
          <group ref={spinRef}>
            {helix.backbones.map((curve, strand) => (
              <mesh
                key={strand}
                ref={(el) => {
                  backboneRefs.current[strand] = el
                }}
              >
                <tubeGeometry args={[curve, 240, 0.04, 8, false]} />
                <meshStandardMaterial
                  color="#9e2637"
                  emissive="#7a1020"
                  emissiveIntensity={0.7}
                  metalness={0.5}
                  roughness={0.35}
                  transparent
                  opacity={0}
                  depthWrite={false}
                />
              </mesh>
            ))}

            {helix.rungs.map((rung, r) => (
              <mesh
                key={r}
                ref={(el) => {
                  rungRefs.current[r] = el
                }}
                position={rung.position}
                quaternion={rung.quaternion}
              >
                <cylinderGeometry args={[0.016, 0.016, rung.length, 6]} />
                <meshBasicMaterial color="#f3e7dc" transparent opacity={0} depthWrite={false} />
              </mesh>
            ))}

            {items.map((item, i) => (
              <mesh
                key={item.id}
                ref={(el) => {
                  beadRefs.current[i] = el
                }}
                position={helix.beads[i].scatter}
                onPointerOver={handleOver(item.id)}
                onPointerOut={handleOut}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(item.id)
                }}
              >
                <sphereGeometry args={[0.2, 32, 24]} />
                <meshPhysicalMaterial
                  color={item.color}
                  emissive={item.color}
                  emissiveIntensity={0.28}
                  metalness={0.35}
                  roughness={0.28}
                  clearcoat={1}
                  clearcoatRoughness={0.2}
                  transparent
                />
                {(item.id === hovered || item.id === selected) && (
                  <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
                    <span
                      className="dna-label"
                      style={{ '--dna-color': item.color } as CSSProperties}
                    >
                      {item.name}
                    </span>
                  </Html>
                )}
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  )
}

export default function DnaScene({ active, ...props }: DnaSceneProps) {
  const length = useMemo(() => buildHelix(props.items.length).length, [props.items.length])

  useEffect(() => () => setCursorLabel(null), [])

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 35, position: [0, 0, 14] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
    >
      <ambientLight intensity={0.45} />
      <pointLight position={[5, 4, 7]} intensity={2.2} color="#f3e7dc" decay={0} />
      <pointLight position={[-6, -3, 5]} intensity={1.6} color="#9e2637" decay={0} />
      <CameraFit length={length} horizontal={props.horizontal} />
      <Helix {...props} />
      {!props.reducedMotion && (
        <Sparkles count={60} scale={[16, 8, 6]} size={2.4} speed={0.35} color="#d6708a" opacity={0.7} />
      )}
    </Canvas>
  )
}
