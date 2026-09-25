import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { PlanetDef } from '../../data/planets'
import { useSolarStore } from '../../store/useSolarStore'
import { useTimeStore } from '../../store/useTimeStore'
import {
  heliocentricLongitude,
  uniformAngle,
} from '../../simulation/ephemeris'
import {
  MAX_SPIN_RAD_PER_SEC,
  followTrueAngle,
} from '../../simulation/visualRate'
import { HeadingToSpin, tiltFrameEuler } from '../../simulation/orientation'
import { enhanceTextureQuality } from '../../components/textureQuality'
import { PlanetRings } from './PlanetRings'
import { Moon } from './Moon'
import { Atmosphere } from './Atmosphere'
import { NightLightsLayer } from './NightLightsLayer'

interface PlanetProps {
  def: PlanetDef
}

/** Clouds drift relative to the surface at this fraction of the spin. */
const CLOUD_DRIFT_RATIO = 0.15

function CloudLayer({
  url,
  radius,
  maxAnisotropy,
  spinStepRef,
}: {
  url: string
  radius: number
  maxAnisotropy: number
  /** Angular step the parent surface took this frame. */
  spinStepRef: RefObject<number>
}) {
  const cloudsMap = useTexture(url) as THREE.Texture
  const ref = useRef<THREE.Mesh>(null)

  useEffect(() => {
    enhanceTextureQuality(cloudsMap, maxAnisotropy, 'color')
  }, [cloudsMap, maxAnisotropy])

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += spinStepRef.current * CLOUD_DRIFT_RATIO
    }
  })

  return (
    <mesh ref={ref} scale={1.015}>
      <sphereGeometry args={[radius, 48, 48]} />
      <meshStandardMaterial
        map={cloudsMap}
        alphaMap={cloudsMap}
        transparent
        depthWrite={false}
        opacity={0.55}
        roughness={1}
        metalness={0}
      />
    </mesh>
  )
}

export function Planet({ def }: PlanetProps) {
  const colorMap = useTexture(def.textureUrl) as THREE.Texture
  const gl = useThree((s) => s.gl)
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy()

  const orbitRef = useRef<THREE.Group>(null)
  const tiltRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const spinStepRef = useRef(0)
  /** Clock jump last applied; -1 snaps the spin on the first frame. */
  const dateVersionRef = useRef(-1)
  const worldPosRef = useRef(new THREE.Vector3())
  const tiltRotation = useMemo(
    () => tiltFrameEuler(def.axialTiltDeg, def.poleLongitudeDeg),
    [def.axialTiltDeg, def.poleLongitudeDeg],
  )
  // Only a real prime meridian (Earth) needs mapping into the tilt frame;
  // for the rest the spin phase is arbitrary anyway.
  const headingToSpin = useMemo(
    () =>
      def.spinAtJ2000Deg === undefined
        ? null
        : new HeadingToSpin(def.axialTiltDeg, def.poleLongitudeDeg),
    [def.spinAtJ2000Deg, def.axialTiltDeg, def.poleLongitudeDeg],
  )

  const [hovered, setHovered] = useState(false)

  const view = useSolarStore((s) => s.view)
  const mode = useSolarStore((s) => s.mode)
  const focusedId = useSolarStore((s) => s.focusedId)
  const focus = useSolarStore((s) => s.focus)
  const registerBodyPosition = useSolarStore((s) => s.registerBodyPosition)
  const setHoveredId = useSolarStore((s) => s.setHovered)

  const canInteract = view === 'solar' && mode !== 'warping'
  // A warp can start under the pointer, and pointer-out is ignored from
  // then on: don't let a stale hover linger through the transition.
  const showHover = hovered && canInteract

  const isFocused = focusedId === def.id
  const isOtherFocused = focusedId !== null && !isFocused

  useEffect(() => {
    registerBodyPosition(def.id, worldPosRef.current)
  }, [def.id, registerBodyPosition])

  useEffect(() => {
    enhanceTextureQuality(colorMap, maxAnisotropy, 'color')
  }, [colorMap, maxAnisotropy])

  // Only touch the cursor while hovered and restore it in the cleanup, so a
  // moon (child) taking over the hover isn't overridden by this effect.
  useEffect(() => {
    if (!showHover) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [showHover])

  useFrame((_, delta) => {
    const { clock, dateVersion } = useTimeStore.getState()
    const { julianDay, deltaDays } = clock

    // Real heliocentric longitude, counter-clockwise seen from above (+y).
    const lambda = heliocentricLongitude(def.elements, julianDay)
    const x = Math.cos(lambda) * def.orbitRadius
    const z = -Math.sin(lambda) * def.orbitRadius

    if (orbitRef.current) {
      orbitRef.current.position.set(x, 0, z)
      orbitRef.current.getWorldPosition(worldPosRef.current)
    }
    if (spinRef.current) {
      const current = spinRef.current.rotation.y
      const heading = uniformAngle(
        ((def.spinAtJ2000Deg ?? 0) * Math.PI) / 180,
        def.rotationPeriodDays,
        julianDay,
      )
      const trueSpin = headingToSpin ? headingToSpin.angle(heading) : heading
      let spin: number
      if (dateVersionRef.current !== dateVersion) {
        // Date jump (or first frame): be where the date says, at once.
        dateVersionRef.current = dateVersion
        spin = trueSpin
        spinStepRef.current = 0
      } else {
        spin = followTrueAngle(
          current,
          trueSpin,
          def.rotationPeriodDays,
          deltaDays,
          delta,
          MAX_SPIN_RAD_PER_SEC,
        )
        spinStepRef.current = spin - current
      }
      spinRef.current.rotation.y = spin
      // Hover grows the whole spin group so clouds and atmosphere scale
      // with the surface instead of being swallowed by it.
      const target = showHover && !isOtherFocused ? 1.12 : 1
      const scale = spinRef.current.scale.x
      const next = scale + (target - scale) * Math.min(1, delta * 8)
      spinRef.current.scale.setScalar(next)
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!canInteract) return
    // A drag that happens to end over a planet is not a click.
    if (e.delta > 4) return
    e.stopPropagation()
    focus(def.id)
  }

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!canInteract) return
    e.stopPropagation()
    setHovered(true)
    setHoveredId(def.id)
  }

  const handlePointerOut = () => {
    if (!canInteract) return
    setHovered(false)
    setHoveredId(null)
  }

  const skipRaycast = () => null

  return (
    <group ref={orbitRef}>
      <group ref={tiltRef} rotation={tiltRotation}>
        <group ref={spinRef}>
          <mesh
            raycast={canInteract ? undefined : skipRaycast}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            <sphereGeometry args={[def.radius, 64, 64]} />
            <meshStandardMaterial
              map={colorMap}
              roughness={0.92}
              metalness={0.05}
              emissive={def.color}
              emissiveIntensity={
                isFocused
                  ? 0
                  : showHover && !isOtherFocused
                    ? 0.07
                    : 0.04
              }
            />
          </mesh>

          {def.nightUrl && (
            <NightLightsLayer url={def.nightUrl} radius={def.radius} />
          )}

          {def.cloudsUrl && (
            <CloudLayer
              url={def.cloudsUrl}
              radius={def.radius}
              maxAnisotropy={maxAnisotropy}
              spinStepRef={spinStepRef}
            />
          )}

          {def.atmosphere && (
            <Atmosphere radius={def.radius} def={def.atmosphere} />
          )}
        </group>

        {def.rings && <PlanetRings rings={def.rings} />}

        {def.moons
          ?.filter((moon) => !moon.orbitsEcliptic)
          .map((moon) => <Moon key={moon.id} def={moon} />)}
      </group>

      {def.moons
        ?.filter((moon) => moon.orbitsEcliptic)
        .map((moon) => <Moon key={moon.id} def={moon} />)}

      {(showHover || isFocused) && (
        <Html
          position={[0, def.radius + 0.6, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-[11px] tracking-[0.2em] uppercase text-white/90 font-display whitespace-nowrap">
            {def.name}
          </div>
        </Html>
      )}
    </group>
  )
}
