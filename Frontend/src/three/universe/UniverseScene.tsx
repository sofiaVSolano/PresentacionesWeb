import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, Sparkles, Stars } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
  type Group,
  type LineBasicMaterial,
  type Mesh,
  type MeshStandardMaterial,
  type PerspectiveCamera,
} from 'three'
import { setCursorLabel } from '@/components/CustomCursor/cursorEvents'
import { createPlanetTexture } from './planetTexture'
import type { UniverseSceneProps } from './types'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
/** Duración (s) del vuelo de cámara hacia un planeta y de vuelta al sistema */
const FLIGHT_TO_PLANET = 1.9
const FLIGHT_HOME = 1.5

/** PRNG determinista para fases e inclinaciones: el mismo sistema en cada visita */
const seeded = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

interface Orbit {
  radius: number
  incline: number
  speed: number
  phase: number
}

function buildOrbits(count: number, compact: boolean): Orbit[] {
  const first = compact ? 1.9 : 2.4
  const gap = compact ? 0.55 : 0.72
  return Array.from({ length: count }, (_, i) => ({
    radius: first + i * gap,
    incline: (seeded(i, 1) - 0.5) * 0.32,
    speed: 0.32 / Math.pow(1 + i * 0.45, 0.9),
    phase: seeded(i, 2) * Math.PI * 2,
  }))
}

function orbitPoint(o: Orbit, angle: number, target: Vector3) {
  const x = Math.cos(angle) * o.radius
  const s = Math.sin(angle) * o.radius
  return target.set(x, s * Math.sin(o.incline), s * Math.cos(o.incline))
}

function orbitGeometry(o: Orbit) {
  const pts: number[] = []
  const p = new Vector3()
  for (let k = 0; k <= 128; k++) {
    orbitPoint(o, (k / 128) * Math.PI * 2, p)
    pts.push(p.x, p.y, p.z)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(pts, 3))
  return geometry
}

function System({
  planets,
  hovered,
  selected,
  compact,
  sidePanel,
  reducedMotion,
  assembleRef,
  onHover,
  onSelect,
}: Omit<UniverseSceneProps, 'active'>) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const orbits = useMemo(() => buildOrbits(planets.length, compact), [planets.length, compact])
  const orbitGeometries = useMemo(() => orbits.map(orbitGeometry), [orbits])
  const textures = useMemo(
    () => planets.map((p, i) => createPlanetTexture(p.base, p.accent, i + 1)),
    [planets]
  )
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures])

  const planetRefs = useRef<(Group | null)[]>([])
  const bodyRefs = useRef<(Mesh | null)[]>([])
  const orbitRefs = useRef<(LineBasicMaterial | null)[]>([])
  const coreRef = useRef<Group>(null)
  const state = useRef({
    time: 0,
    assemble: 0,
    lookAt: new Vector3(),
    camTarget: new Vector3(),
    lookTarget: new Vector3(),
    tmp: new Vector3(),
    tmp2: new Vector3(),
    // vuelo: cada cambio de selección arranca un trayecto nuevo desde donde esté la cámara
    flight: 1,
    flightFrom: new Vector3(),
    flightLookFrom: new Vector3(),
    flightFor: -2,
  })

  // Encuadre base: el sistema completo. En pantallas verticales la cámara mira más desde arriba:
  // las órbitas se ven casi circulares y llenan la altura en vez de quedar como una franja.
  const outer = orbits[orbits.length - 1]?.radius ?? 6
  const home = useMemo(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const elevation = aspect < 1 ? 1.05 : 0.55
    const halfV = Math.tan((camera.fov * Math.PI) / 360)
    const needW = outer * 2.3
    const needH = outer * 2 * Math.sin(elevation) * 1.2 + 1.5
    const dist = Math.max(needH / 2 / halfV, needW / 2 / halfV / aspect)
    return new Vector3(0, dist * Math.sin(elevation), dist * Math.cos(elevation))
  }, [size, camera.fov, outer])

  const selectedIndex = planets.findIndex((p) => p.id === selected)
  const hoveredIndex = planets.findIndex((p) => p.id === hovered)

  useFrame((frameState, delta) => {
    const cam = frameState.camera
    const s = state.current
    const dt = Math.min(delta, 0.05)
    // con un planeta abierto el tiempo casi se detiene: la cámara puede posarse sobre él
    s.time += dt * (reducedMotion ? 0 : selectedIndex >= 0 ? 0.04 : 1)
    s.assemble = lerp(s.assemble, reducedMotion ? 1 : assembleRef.current, 1 - Math.exp(-dt * 5))
    const eased = 1 - Math.pow(1 - s.assemble, 3)

    planets.forEach((planet, i) => {
      const group = planetRefs.current[i]
      const body = bodyRefs.current[i]
      if (!group || !body) return
      const o = orbits[i]
      orbitPoint(o, o.phase + s.time * o.speed, group.position)
      group.position.multiplyScalar(eased)
      body.rotation.y += dt * (0.25 + (i % 3) * 0.12)

      const focus = i === hoveredIndex || i === selectedIndex
      const target = planet.size * (focus ? 1.35 : 1) * (0.2 + 0.8 * eased)
      group.scale.setScalar(lerp(group.scale.x, target, 0.12))
      const material = body.material as MeshStandardMaterial
      material.emissiveIntensity = lerp(material.emissiveIntensity, focus ? 0.55 : 0.08, 0.1)

      const orbitMaterial = orbitRefs.current[i]
      if (orbitMaterial) {
        const base = selectedIndex >= 0 ? (i === selectedIndex ? 0.5 : 0.05) : focus ? 0.55 : 0.16
        orbitMaterial.opacity = lerp(orbitMaterial.opacity, base * eased, 0.1)
      }
    })

    if (coreRef.current) {
      const pulse = 1 + Math.sin(frameState.clock.elapsedTime * 1.6) * 0.04
      // con un planeta abierto el núcleo se encoge: no debe robarle protagonismo
      const coreTarget = (0.55 + 0.45 * eased) * pulse * (selectedIndex >= 0 ? 0.45 : 1)
      coreRef.current.scale.setScalar(lerp(coreRef.current.scale.x, coreTarget, 0.1))
    }

    // Cámara: vuelve al encuadre general o vuela hasta el planeta elegido
    if (selectedIndex !== s.flightFor) {
      s.flightFor = selectedIndex
      s.flight = 0
      s.flightFrom.copy(cam.position)
      s.flightLookFrom.copy(s.lookAt)
    }
    if (selectedIndex >= 0) {
      const p = planetRefs.current[selectedIndex]?.position
      if (p) {
        const r = planets[selectedIndex].size
        const away = s.tmp.copy(p).setY(0).normalize()
        if (away.lengthSq() < 0.01) away.set(0, 0, 1)
        // cámara fuera de la órbita, algo por encima, mirando al planeta
        s.camTarget
          .copy(p)
          .addScaledVector(away, r * 11)
          .add(s.tmp2.set(0, r * 4.5, 0))
        // sin ficha lateral (móvil/tablet) la ficha tapa la mitad de abajo: el planeta sube
        s.lookTarget.copy(p).setY(p.y - (sidePanel ? 0 : r * 3.2))
        if (sidePanel) {
          // desplaza el encuadre para que el planeta quede a la izquierda de la ficha
          const right = s.tmp2.subVectors(p, s.camTarget).cross(cam.up).normalize()
          s.camTarget.addScaledVector(right, r * 3.2)
        }
      }
    } else {
      s.camTarget.copy(home)
      s.lookTarget.set(0, -outer * 0.05, 0)
    }

    const duration = reducedMotion ? 0 : selectedIndex >= 0 ? FLIGHT_TO_PLANET : FLIGHT_HOME
    s.flight = duration > 0 ? Math.min(1, s.flight + dt / duration) : 1
    const e = easeInOutCubic(s.flight)
    // la mirada llega antes que el cuerpo: primero gira hacia el planeta, luego se acerca
    const look = easeInOutCubic(Math.min(1, s.flight * 1.5))
    cam.position.lerpVectors(s.flightFrom, s.camTarget, e)
    // arco: la cámara se eleva a mitad de trayecto, como una nave que salta entre órbitas
    const hop = s.flightFrom.distanceTo(s.camTarget) * 0.22
    cam.position.y += Math.sin(Math.PI * e) * hop
    s.lookAt.lerpVectors(s.flightLookFrom, s.lookTarget, look)

    // leve deriva con el mouse cuando no hay planeta abierto
    if (selectedIndex < 0 && !reducedMotion) {
      const drift = e
      cam.position.x += frameState.pointer.x * 0.02 * outer * drift
      cam.position.y += frameState.pointer.y * 0.01 * outer * drift
    }
    cam.lookAt(s.lookAt)
  })

  const over = (id: string) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(id)
    setCursorLabel('EXPLORE')
  }
  const out = () => {
    onHover(null)
    setCursorLabel(null)
  }

  return (
    <>
      {/* Núcleo: el origen de todo lo que construyo */}
      <group ref={coreRef}>
        <mesh>
          <sphereGeometry args={[0.95, 48, 32]} />
          <meshStandardMaterial
            color="#4a0710"
            emissive="#9e2637"
            emissiveIntensity={0.85}
            roughness={0.35}
            metalness={0.2}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.25, 32, 16]} />
          <meshBasicMaterial
            color="#d6708a"
            transparent
            opacity={0.1}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.7, 32, 16]} />
          <meshBasicMaterial
            color="#9e2637"
            transparent
            opacity={0.06}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
      <pointLight position={[0, 0, 0]} intensity={60} distance={outer * 3} color="#ffd9d0" />

      {orbitGeometries.map((geometry, i) => (
        <lineLoop key={i} geometry={geometry}>
          <lineBasicMaterial
            ref={(m) => {
              orbitRefs.current[i] = m
            }}
            color="#f3e7dc"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </lineLoop>
      ))}

      {planets.map((planet, i) => (
        <group
          key={planet.id}
          ref={(g) => {
            planetRefs.current[i] = g
          }}
        >
          <mesh
            ref={(m) => {
              bodyRefs.current[i] = m
            }}
            onPointerOver={over(planet.id)}
            onPointerOut={out}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(planet.id === selected ? null : planet.id)
            }}
          >
            <sphereGeometry args={[1, 48, 32]} />
            <meshStandardMaterial
              map={textures[i]}
              emissive={planet.base}
              emissiveIntensity={0.08}
              roughness={0.72}
              metalness={0.05}
            />
          </mesh>

          {/* área de clic más generosa que el planeta: en planetas chicos cuesta atinar */}
          <mesh
            visible={false}
            onPointerOver={over(planet.id)}
            onPointerOut={out}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(planet.id === selected ? null : planet.id)
            }}
          >
            <sphereGeometry args={[1.9, 12, 8]} />
          </mesh>

          {planet.featured && (
            <mesh rotation={[Math.PI / 2.4, 0, 0.3]}>
              <ringGeometry args={[1.45, 2.1, 64]} />
              <meshBasicMaterial
                color={planet.accent}
                transparent
                opacity={0.45}
                side={2}
                depthWrite={false}
              />
            </mesh>
          )}

          {(planet.id === selected || planet.id === hovered || (!compact && selectedIndex < 0)) && (
            <Html
              center
              zIndexRange={[20, 0]}
              style={{ pointerEvents: 'none' }}
              position={[0, -1.9, 0]}
            >
              <span
                className="universe-label"
                data-state={
                  planet.id === selected ? 'selected' : planet.id === hovered ? 'hover' : 'idle'
                }
                style={{ '--planet': planet.base } as CSSProperties}
              >
                {planet.live && <i className="universe-label__live" aria-hidden="true" />}
                {planet.title}
              </span>
            </Html>
          )}
        </group>
      ))}
    </>
  )
}

export default function UniverseScene({ active, ...props }: UniverseSceneProps) {
  useEffect(() => () => setCursorLabel(null), [])

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 38, position: [0, 8, 14], near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => props.selected && props.onSelect(null)}
      style={{ touchAction: 'pan-y' }}
    >
      <ambientLight intensity={0.28} />
      <Stars
        radius={60}
        depth={40}
        count={props.compact ? 1200 : 2600}
        factor={3}
        saturation={0}
        fade
        speed={props.reducedMotion ? 0 : 0.6}
      />
      {!props.reducedMotion && (
        <Sparkles
          count={50}
          scale={[18, 6, 18]}
          size={2}
          speed={0.25}
          color="#d6708a"
          opacity={0.6}
        />
      )}
      <System {...props} />
    </Canvas>
  )
}
