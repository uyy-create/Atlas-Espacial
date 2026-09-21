import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { MoonDef } from '../../data/planets'
import { enhanceTextureQuality } from '../../components/textureQuality'
import { useSolarStore } from '../../store/useSolarStore'
import { useTimeStore } from '../../store/useTimeStore'
import {
  MAX_MOON_RAD_PER_SEC,
  visualAngularStep,
} from '../../simulation/visualRate'

interface MoonProps {
  def: MoonDef
}

function TexturedMoonMaterial({
  url,
  maxAnisotropy,
  emissiveIntensity,
}: {
  url: string
  maxAnisotropy: number
  emissiveIntensity: number
}) {
  const map = useTexture(url) as THREE.Texture

  useEffect(() => {
    enhanceTextureQuality(map, maxAnisotropy, 'color')
  }, [map, maxAnisotropy])

  return (
    <meshStandardMaterial
      map={map}
      roughness={0.95}
      metalness={0.02}
      emissive="#ffffff"
      emissiveIntensity={emissiveIntensity}
    />
  )
}

const skipRaycast = () => null

export function Moon({ def }: MoonProps) {
  const gl = useThree((s) => s.gl)
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy()
  const orbitRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const thetaRef = useRef(def.orbitInitialAngle)
  const worldPosRef = useRef(new THREE.Vector3())

  const [hovered, setHovered] = useState(false)

  const view = useSolarStore((s) => s.view)
  const mode = useSolarStore((s) => s.mode)
  const isFocused = useSolarStore((s) => s.focusedId === def.id)
  const focus = useSolarStore((s) => s.focus)
  const registerBodyPosition = useSolarStore((s) => s.registerBodyPosition)
  const setHoveredId = useSolarStore((s) => s.setHovered)

  const canInteract = view === 'solar' && mode !== 'warping'

  useEffect(() => {
    registerBodyPosition(def.id, worldPosRef.current)
  }, [def.id, registerBodyPosition])

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hovered])

  useFrame((_, delta) => {
    const { deltaDays } = useTimeStore.getState().clock
    thetaRef.current += visualAngularStep(
      def.orbitPeriodDays,
      deltaDays,
      delta,
      MAX_MOON_RAD_PER_SEC,
    )
    if (orbitRef.current) {
      // Prograde = counter-clockwise seen from above, like the planets.
      const x = Math.cos(thetaRef.current) * def.orbitRadius
      const z = -Math.sin(thetaRef.current) * def.orbitRadius
      orbitRef.current.position.set(x, 0, z)
      orbitRef.current.getWorldPosition(worldPosRef.current)
    }
    if (meshRef.current) {
      const target = hovered ? 1.25 : 1
      const current = meshRef.current.scale.x
      const next = current + (target - current) * Math.min(1, delta * 8)
      meshRef.current.scale.setScalar(next)
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!canInteract) return
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

  const inclination = ((def.inclinationDeg ?? 0) * Math.PI) / 180
  // Small bodies are hard to see on the night side: lift them a little.
  const emissiveIntensity = hovered ? 0.16 : isFocused ? 0.05 : 0.09

  return (
    <group rotation={[inclination, 0, 0]}>
      <group ref={orbitRef}>
        <mesh
          ref={meshRef}
          raycast={canInteract ? undefined : skipRaycast}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <sphereGeometry args={[def.radius, 32, 32]} />
          {def.textureUrl ? (
            <TexturedMoonMaterial
              url={def.textureUrl}
              maxAnisotropy={maxAnisotropy}
              emissiveIntensity={emissiveIntensity}
            />
          ) : (
            <meshStandardMaterial
              color={def.color}
              roughness={0.92}
              metalness={0.04}
              emissive={def.color}
              emissiveIntensity={emissiveIntensity}
            />
          )}
        </mesh>

        {(hovered || isFocused) && (
          <Html
            position={[0, def.radius + 0.12, 0]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className="whitespace-nowrap rounded-md border border-white/10 bg-black/60 px-2 py-1 font-display text-[11px] uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
              {def.name}
            </div>
          </Html>
        )}
      </group>
    </group>
  )
}
