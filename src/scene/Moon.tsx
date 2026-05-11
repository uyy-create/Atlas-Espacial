import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { MoonDef } from '../data/planets'
import { enhanceTextureQuality } from './textureQuality'

interface MoonProps {
  def: MoonDef
}

const TWO_PI = Math.PI * 2

function TexturedMoonMaterial({
  url,
  maxAnisotropy,
}: {
  url: string
  maxAnisotropy: number
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
    />
  )
}

export function Moon({ def }: MoonProps) {
  const gl = useThree((s) => s.gl)
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy()
  const orbitRef = useRef<THREE.Group>(null)
  const thetaRef = useRef(def.orbitInitialAngle)

  useFrame((_, delta) => {
    thetaRef.current =
      (thetaRef.current + (TWO_PI / def.orbitPeriodSec) * delta) % TWO_PI
    if (orbitRef.current) {
      const x = Math.cos(thetaRef.current) * def.orbitRadius
      const z = Math.sin(thetaRef.current) * def.orbitRadius
      orbitRef.current.position.set(x, 0, z)
    }
  })

  const inclination = ((def.inclinationDeg ?? 0) * Math.PI) / 180

  return (
    <group rotation={[inclination, 0, 0]}>
      <group ref={orbitRef}>
        <mesh>
          <sphereGeometry args={[def.radius, 32, 32]} />
          {def.textureUrl ? (
            <TexturedMoonMaterial
              url={def.textureUrl}
              maxAnisotropy={maxAnisotropy}
            />
          ) : (
            <meshStandardMaterial
              color={def.color}
              roughness={0.92}
              metalness={0.04}
            />
          )}
        </mesh>
      </group>
    </group>
  )
}
