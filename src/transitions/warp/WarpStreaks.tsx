import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSolarStore, type ViewId } from '../../store/useSolarStore'
import {
  BLACK_HOLE_SYSTEM_GALAXY_MARKER,
  SOLAR_SYSTEM_GALAXY_MARKER,
} from '../../scenes/galaxy/galaxyMarkers'
import { createRandom } from '../../utils/random'
import { computeWarpStreakIntensity } from './blackHoleTransition'

function warpStreakAnchor(
  warpTargetView: ViewId | null,
  view: ViewId,
): THREE.Vector3 {
  if (warpTargetView === 'galaxy') {
    return view === 'blackHole'
      ? BLACK_HOLE_SYSTEM_GALAXY_MARKER
      : SOLAR_SYSTEM_GALAXY_MARKER
  }
  if (warpTargetView === 'solar') return SOLAR_SYSTEM_GALAXY_MARKER
  if (warpTargetView === 'blackHole') return BLACK_HOLE_SYSTEM_GALAXY_MARKER
  return SOLAR_SYSTEM_GALAXY_MARKER
}

const COUNT = 900
const TUBE_RADIUS = 38
const DEPTH = 220
const STREAK_SEED = 0x57415250

/** Streak head positions, scattered in a tube in front of the camera. */
function createStreakCenters(): Float32Array {
  const rand = createRandom(STREAK_SEED)
  const centers = new Float32Array(COUNT * 3)
  for (let i = 0; i < COUNT; i++) {
    const r = 1 + Math.pow(rand(), 0.6) * TUBE_RADIUS
    const theta = rand() * Math.PI * 2
    centers[i * 3 + 0] = Math.cos(theta) * r
    centers[i * 3 + 1] = Math.sin(theta) * r
    centers[i * 3 + 2] = -rand() * DEPTH - 4
  }
  return centers
}

/** Line segment endpoints (2 vertices per streak) for the initial upload. */
function centersToPositions(centers: Float32Array): Float32Array {
  const positions = new Float32Array(COUNT * 6)
  for (let i = 0; i < COUNT; i++) {
    const x = centers[i * 3 + 0]
    const y = centers[i * 3 + 1]
    const z = centers[i * 3 + 2]
    positions[i * 6 + 0] = x
    positions[i * 6 + 1] = y
    positions[i * 6 + 2] = z
    positions[i * 6 + 3] = x
    positions[i * 6 + 4] = y
    positions[i * 6 + 5] = z - 0.5
  }
  return positions
}

export function WarpStreaks() {
  const groupRef = useRef<THREE.Group>(null)
  const lineRef = useRef<THREE.LineSegments>(null)
  const materialRef = useRef<THREE.LineBasicMaterial>(null)
  const { camera } = useThree()
  const tmpMarkerCam = useRef(new THREE.Vector3())
  const tmpRight = useRef(new THREE.Vector3())
  const tmpUp = useRef(new THREE.Vector3())

  const positions = useMemo(
    () => centersToPositions(createStreakCenters()),
    [],
  )
  // Advanced every frame during a warp, so it lives in a ref, not in a memo.
  // Same seed as `positions`, so both start in sync.
  const centersRef = useRef<Float32Array | null>(null)

  useFrame((_, delta) => {
    const { mode, view, warpTargetView, warpProgress } =
      useSolarStore.getState()
    const isWarping = mode === 'warping'
    const intensity = computeWarpStreakIntensity(
      mode,
      view,
      warpTargetView,
      warpProgress,
    )

    if (groupRef.current) {
      groupRef.current.visible = isWarping
      if (isWarping) {
        groupRef.current.position.copy(camera.position)
        groupRef.current.quaternion.copy(camera.quaternion)

        tmpMarkerCam.current
          .copy(warpStreakAnchor(warpTargetView, view))
          .applyMatrix4(camera.matrixWorldInverse)
        const parallax = warpTargetView === 'galaxy' ? 0.26 : 0.34
        tmpRight.current.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
        tmpUp.current.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
        groupRef.current.position.addScaledVector(
          tmpRight.current,
          tmpMarkerCam.current.x * parallax,
        )
        groupRef.current.position.addScaledVector(
          tmpUp.current,
          tmpMarkerCam.current.y * parallax,
        )
      }
    }

    if (materialRef.current) {
      const targetOpacity = isWarping ? 0.08 + intensity * 0.55 : 0
      materialRef.current.opacity = targetOpacity
    }

    if (!isWarping || !lineRef.current) return

    const speed = 20 + intensity * 320
    const streakLen = 0.4 + intensity * 22

    const geo = lineRef.current.geometry
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const data = posAttr.array as Float32Array
    if (centersRef.current === null) centersRef.current = createStreakCenters()
    const centers = centersRef.current

    for (let i = 0; i < COUNT; i++) {
      let zc = centers[i * 3 + 2] + speed * delta
      let x = centers[i * 3 + 0]
      let y = centers[i * 3 + 1]

      if (zc > 4) {
        const r = 1 + Math.pow(Math.random(), 0.6) * TUBE_RADIUS
        const theta = Math.random() * Math.PI * 2
        x = Math.cos(theta) * r
        y = Math.sin(theta) * r
        zc = -DEPTH - Math.random() * 60
        centers[i * 3 + 0] = x
        centers[i * 3 + 1] = y
      }

      centers[i * 3 + 2] = zc

      data[i * 6 + 0] = x
      data[i * 6 + 1] = y
      data[i * 6 + 2] = zc
      data[i * 6 + 3] = x
      data[i * 6 + 4] = y
      data[i * 6 + 5] = zc - streakLen
    }
    posAttr.needsUpdate = true
  })

  return (
    <group ref={groupRef} visible={false}>
      <lineSegments ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          ref={materialRef}
          color="#eef2ff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  )
}
