import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { PlanetDef } from '../../data/planets'
import { useSolarStore } from '../../store/useSolarStore'
import { enhanceTextureQuality } from '../../components/textureQuality'
import { PlanetRings } from './PlanetRings'
import { Moon } from './Moon'

interface PlanetProps {
  def: PlanetDef
}

const TWO_PI = Math.PI * 2

function CloudLayer({
  url,
  radius,
  maxAnisotropy,
}: {
  url: string
  radius: number
  maxAnisotropy: number
}) {
  const cloudsMap = useTexture(url) as THREE.Texture
  const ref = useRef<THREE.Mesh>(null)

  useEffect(() => {
    enhanceTextureQuality(cloudsMap, maxAnisotropy, 'color')
  }, [cloudsMap, maxAnisotropy])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04
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
  const meshRef = useRef<THREE.Mesh>(null)
  const thetaRef = useRef(def.orbitInitialAngle)
  const worldPosRef = useRef(new THREE.Vector3())

  const [hovered, setHovered] = useState(false)

  const view = useSolarStore((s) => s.view)
  const mode = useSolarStore((s) => s.mode)
  const focusedId = useSolarStore((s) => s.focusedId)
  const focus = useSolarStore((s) => s.focus)
  const registerPlanetPosition = useSolarStore((s) => s.registerPlanetPosition)
  const setHoveredId = useSolarStore((s) => s.setHovered)

  const canInteract = view === 'solar' && mode !== 'warping'

  const isFocused = focusedId === def.id
  const isOtherFocused = focusedId !== null && !isFocused

  useEffect(() => {
    registerPlanetPosition(def.id, worldPosRef.current)
  }, [def.id, registerPlanetPosition])

  useEffect(() => {
    enhanceTextureQuality(colorMap, maxAnisotropy, 'color')
  }, [colorMap, maxAnisotropy])

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hovered])

  useFrame((_, delta) => {
    thetaRef.current =
      (thetaRef.current + (TWO_PI / def.orbitPeriodSec) * delta) % TWO_PI
    const x = Math.cos(thetaRef.current) * def.orbitRadius
    const z = Math.sin(thetaRef.current) * def.orbitRadius

    if (orbitRef.current) {
      orbitRef.current.position.set(x, 0, z)
      orbitRef.current.getWorldPosition(worldPosRef.current)
    }
    if (spinRef.current) {
      spinRef.current.rotation.y +=
        (TWO_PI / def.rotationPeriodSec) * delta
    }
    if (meshRef.current) {
      const target = hovered && !isOtherFocused ? 1.12 : 1
      const current = meshRef.current.scale.x
      const next = current + (target - current) * Math.min(1, delta * 8)
      meshRef.current.scale.setScalar(next)
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!canInteract) return
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
      <group
        ref={tiltRef}
        rotation={[0, 0, (def.axialTiltDeg * Math.PI) / 180]}
      >
        <group ref={spinRef}>
          <mesh
            ref={meshRef}
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
                  : hovered && !isOtherFocused
                    ? 0.07
                    : 0.04
              }
            />
          </mesh>

          {def.cloudsUrl && (
            <CloudLayer
              url={def.cloudsUrl}
              radius={def.radius}
              maxAnisotropy={maxAnisotropy}
            />
          )}
        </group>

        {def.rings && <PlanetRings rings={def.rings} />}

        {def.moons?.map((moon) => (
          <Moon key={moon.id} def={moon} />
        ))}
      </group>

      {(hovered || isFocused) && (
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
