import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSolarStore } from '../store/useSolarStore'
import {
  BLACK_HOLE_DEFAULTS,
  BLACK_HOLE_RAYMARCH_FRAG,
  BLACK_HOLE_RAYMARCH_VERT,
  createBlackHoleUniforms,
} from './blackHoleRaymarchShader'

/**
 * Full-screen raymarched black hole (tsBXW3).
 * Ajustes visuales: edita BLACK_HOLE_DEFAULTS en blackHoleRaymarchShader.ts
 */
export function BlackHole() {
  const { camera, size } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(() => createBlackHoleUniforms(), [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: BLACK_HOLE_RAYMARCH_VERT,
        fragmentShader: BLACK_HOLE_RAYMARCH_FRAG,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [uniforms],
  )

  useEffect(() => {
    materialRef.current = material
    return () => material.dispose()
  }, [material])

  useFrame((state) => {
    const mat = materialRef.current
    if (!mat) return

    const { view, mode } = useSolarStore.getState()
    const cinematic =
      view === 'blackHole' && mode === 'overview'

    mat.uniforms.uUseShadertoyCamera.value = cinematic ? 1 : 0
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uResolution.value.set(
      size.width * state.viewport.dpr,
      size.height * state.viewport.dpr,
    )

    if (!cinematic) {
      const persp = camera as THREE.PerspectiveCamera
      mat.uniforms.uCameraPosition.value.copy(persp.position)
      mat.uniforms.uInverseProjectionMatrix.value.copy(
        persp.projectionMatrixInverse,
      )
      mat.uniforms.uInverseViewMatrix.value.copy(persp.matrixWorld)
    }
  })

  return (
    <mesh frustumCulled={false} renderOrder={1000} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

/** Re-export para quien importe desde el componente. */
export { BLACK_HOLE_DEFAULTS }
