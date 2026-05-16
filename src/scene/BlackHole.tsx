import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  BLACK_HOLE_DEFAULTS,
  BLACK_HOLE_RAYMARCH_FRAG,
  BLACK_HOLE_RAYMARCH_VERT,
} from './blackHoleRaymarchShader'

/**
 * Black hole via screen-space raymarching:
 * - Event horizon (r < r_s)
 * - Gravitational lensing (ray deflection ∝ 1/r²)
 * - Accretion disk (xz plane, hot gas layers)
 * - Distorted starfield when rays escape
 */
export function BlackHole() {
  const { camera, size } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCameraPosition: { value: new THREE.Vector3() },
      uInverseProjectionMatrix: { value: new THREE.Matrix4() },
      uInverseViewMatrix: { value: new THREE.Matrix4() },
      uBhSize: { value: BLACK_HOLE_DEFAULTS.size },
      uDiskSpeed: { value: BLACK_HOLE_DEFAULTS.diskSpeed },
      uAa: { value: BLACK_HOLE_DEFAULTS.aa },
    }),
    [],
  )

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: BLACK_HOLE_RAYMARCH_VERT,
        fragmentShader: BLACK_HOLE_RAYMARCH_FRAG,
        depthWrite: false,
        depthTest: false,
        toneMapped: true,
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

    const persp = camera as THREE.PerspectiveCamera
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uResolution.value.set(
      size.width * state.viewport.dpr,
      size.height * state.viewport.dpr,
    )
    mat.uniforms.uCameraPosition.value.copy(persp.position)
    mat.uniforms.uInverseProjectionMatrix.value.copy(
      persp.projectionMatrixInverse,
    )
    mat.uniforms.uInverseViewMatrix.value.copy(persp.matrixWorld)
  })

  return (
    <mesh frustumCulled={false} renderOrder={1000} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
