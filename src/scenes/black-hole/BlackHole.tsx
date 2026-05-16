import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSolarStore } from '../../store/useSolarStore'
import {
  BLACK_HOLE_DEFAULTS,
  BLACK_HOLE_RAYMARCH_FRAG,
  BLACK_HOLE_RAYMARCH_VERT,
  createBlackHoleUniforms,
} from './blackHoleRaymarchShader'
import {
  computeBlackHolePresentScale,
  shouldUseShadertoyCamera,
} from '../../transitions/warp/blackHoleTransition'

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
        transparent: true,
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

    const { view, mode, warpTargetView, warpProgress } = useSolarStore.getState()
    const useShadertoy = shouldUseShadertoyCamera(mode, view, warpTargetView)
    const presentScale = computeBlackHolePresentScale(
      mode,
      view,
      warpTargetView,
      warpProgress,
    )

    mat.uniforms.uUseShadertoyCamera.value = useShadertoy ? 1 : 0
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uResolution.value.set(
      size.width * state.viewport.dpr,
      size.height * state.viewport.dpr,
    )

    const baseCam = BLACK_HOLE_DEFAULTS.camDistance
    mat.uniforms.uCamDistance.value = baseCam / Math.max(presentScale, 0.06)
    mat.opacity = THREE.MathUtils.clamp(presentScale * 1.15, 0, 1)

    if (!useShadertoy) {
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

export { BLACK_HOLE_DEFAULTS }
