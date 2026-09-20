import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  SUN_CORONA_FRAG,
  SUN_CORONA_VERT,
  SUN_SURFACE_FRAG,
  SUN_SURFACE_VERT,
} from './sunShaders'

const SUN_RADIUS = 3.6
/** Surface output is not tone-mapped, so >1 feeds the bloom pass. */
const SUN_BRIGHTNESS = 1.35
const LIGHT_BASE_INTENSITY = 2.4

const skipRaycast = () => null

export function Sun() {
  const coreRef = useRef<THREE.Mesh>(null)
  const surfaceMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const coronaMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const glowMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const surfaceUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBrightness: { value: SUN_BRIGHTNESS },
      uColorDeep: { value: new THREE.Color('#c4400a') },
      uColorMid: { value: new THREE.Color('#ff9a2e') },
      uColorHot: { value: new THREE.Color('#fff3c4') },
    }),
    [],
  )

  // Tight, flickering corona hugging the disc.
  const coronaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 1.1 },
      uPower: { value: 2.6 },
      uFlare: { value: 0.55 },
      uColorInner: { value: new THREE.Color('#ffd27a') },
      uColorOuter: { value: new THREE.Color('#ff5a1a') },
    }),
    [],
  )

  // Wide, faint glow that fades into the background.
  const glowUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0.28 },
      uPower: { value: 4.5 },
      uFlare: { value: 0.25 },
      uColorInner: { value: new THREE.Color('#ffb060') },
      uColorOuter: { value: new THREE.Color('#ff6a2a') },
    }),
    [],
  )

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.03
    if (surfaceMaterialRef.current) {
      surfaceMaterialRef.current.uniforms.uTime.value = t
    }
    if (coronaMaterialRef.current) {
      coronaMaterialRef.current.uniforms.uTime.value = t
    }
    if (glowMaterialRef.current) {
      glowMaterialRef.current.uniforms.uTime.value = t
    }
    if (lightRef.current) {
      // Barely-there flicker so the lighting on the planets feels alive.
      lightRef.current.intensity =
        LIGHT_BASE_INTENSITY + Math.sin(t * 1.7) * 0.05 + Math.sin(t * 4.3) * 0.03
    }
  })

  return (
    <group>
      <pointLight
        ref={lightRef}
        position={[0, 0, 0]}
        intensity={LIGHT_BASE_INTENSITY}
        distance={500}
        decay={1.4}
        color="#ffe7b3"
      />
      <ambientLight intensity={0.35} color="#9fb8ff" />
      <hemisphereLight
        args={['#cfd9ff', '#1a1f33', 0.45]}
        position={[0, 1, 0]}
      />

      <mesh ref={coreRef} raycast={skipRaycast}>
        <sphereGeometry args={[SUN_RADIUS, 96, 96]} />
        <shaderMaterial
          ref={surfaceMaterialRef}
          uniforms={surfaceUniforms}
          vertexShader={SUN_SURFACE_VERT}
          fragmentShader={SUN_SURFACE_FRAG}
          toneMapped={false}
        />
      </mesh>

      <mesh scale={1.45} raycast={skipRaycast}>
        <sphereGeometry args={[SUN_RADIUS, 64, 64]} />
        <shaderMaterial
          ref={coronaMaterialRef}
          uniforms={coronaUniforms}
          vertexShader={SUN_CORONA_VERT}
          fragmentShader={SUN_CORONA_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>

      <mesh scale={2.6} raycast={skipRaycast}>
        <sphereGeometry args={[SUN_RADIUS, 48, 48]} />
        <shaderMaterial
          ref={glowMaterialRef}
          uniforms={glowUniforms}
          vertexShader={SUN_CORONA_VERT}
          fragmentShader={SUN_CORONA_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
