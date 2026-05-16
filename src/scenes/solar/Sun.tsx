import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { enhanceTextureQuality } from '../../components/textureQuality'

const SUN_RADIUS = 3.6

export function Sun() {
  const sunMap = useTexture('/textures/sunmap.jpg') as THREE.Texture
  const gl = useThree((s) => s.gl)
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy()

  const coreRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    enhanceTextureQuality(sunMap, maxAnisotropy, 'color')
  }, [sunMap, maxAnisotropy])

  useFrame((_, delta) => {
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.05
    if (haloRef.current) {
      const t = performance.now() * 0.0008
      const pulse = 1 + Math.sin(t) * 0.018
      haloRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group>
      <pointLight
        position={[0, 0, 0]}
        intensity={2.4}
        distance={500}
        decay={1.4}
        color="#ffe7b3"
      />
      <ambientLight intensity={0.35} color="#9fb8ff" />
      <hemisphereLight
        args={['#cfd9ff', '#1a1f33', 0.45]}
        position={[0, 1, 0]}
      />

      <mesh ref={coreRef}>
        <sphereGeometry args={[SUN_RADIUS, 64, 64]} />
        <meshBasicMaterial
          map={sunMap}
          color="#ffe8b8"
          toneMapped={false}
        />
      </mesh>

      <mesh ref={haloRef} scale={1.14}>
        <sphereGeometry args={[SUN_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#ff9d4a"
          transparent
          opacity={0.1}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={1.4}>
        <sphereGeometry args={[SUN_RADIUS, 32, 32]} />
        <meshBasicMaterial
          color="#ff7a2a"
          transparent
          opacity={0.035}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
