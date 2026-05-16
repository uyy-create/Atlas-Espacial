import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { getPlanetById } from '../data/planets'
import {
  useSolarStore,
  type CameraMode,
  type ViewId,
} from '../store/useSolarStore'

const SOLAR_DEFAULT_POSITION = new THREE.Vector3(0, 32, 78)
const SOLAR_DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)
const GALAXY_DEFAULT_POSITION = new THREE.Vector3(0, 62, 178)
const GALAXY_DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)
/** Casi en el ecuador (+Z), Y bajo: el disco (plano xz, y=0) se lee como banda horizontal. */
const BLACK_HOLE_DEFAULT_POSITION = new THREE.Vector3(0, 11, 102)
const BLACK_HOLE_DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)
/** Telephoto framing: flatter projection, closer to axonometric read than wide FOV. */
const BLACK_HOLE_FOV = 22
const DEFAULT_SCENE_FOV = 45

const DEFAULT_FOCUS_DISTANCE = 4.5
/** How high above the orbital plane the camera sits when focused. */
const FOCUS_HEIGHT = 1.6
/**
 * How much we shift the camera's look-at target sideways from the planet,
 * so the planet visually anchors on the LEFT third of the screen.
 */
const FOCUS_LOOKAT_SHIFT_RATIO = 0.45

const FOCUS_DURATION = 1.6
const RETURN_DURATION = 1.4
const WARP_DURATION = 2.2
const WARP_COMMIT_AT = 0.5

const easeInOut = gsap.parseEase('power3.inOut')
const easeInOutQuint = (t: number) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

const getViewDefaultPosition = (view: ViewId): THREE.Vector3 => {
  if (view === 'galaxy') return GALAXY_DEFAULT_POSITION
  if (view === 'blackHole') return BLACK_HOLE_DEFAULT_POSITION
  return SOLAR_DEFAULT_POSITION
}

const getViewDefaultTarget = (view: ViewId): THREE.Vector3 => {
  if (view === 'galaxy') return GALAXY_DEFAULT_TARGET
  if (view === 'blackHole') return BLACK_HOLE_DEFAULT_TARGET
  return SOLAR_DEFAULT_TARGET
}

const computeFocusDistance = (radius: number, override?: number): number => {
  if (override !== undefined) return override
  return Math.max(DEFAULT_FOCUS_DISTANCE, radius * 4.2)
}

export function CameraRig() {
  const { camera, clock } = useThree()

  const lookAtRef = useRef(new THREE.Vector3().copy(SOLAR_DEFAULT_TARGET))

  const tmpOutward = useRef(new THREE.Vector3())
  const tmpRight = useRef(new THREE.Vector3())
  const desiredPos = useRef(new THREE.Vector3())
  const desiredLookAt = useRef(new THREE.Vector3())

  const transitionStartTime = useRef(0)
  const transitionStartPos = useRef(new THREE.Vector3())
  const transitionStartLookAt = useRef(new THREE.Vector3())
  const previousMode = useRef<CameraMode>('overview')
  const previousFocusedId = useRef<string | null>(null)

  const warpStartTime = useRef(0)
  const warpStartPos = useRef(new THREE.Vector3())
  const warpStartLook = useRef(new THREE.Vector3())
  const warpEndPos = useRef(new THREE.Vector3())
  const warpEndLook = useRef(new THREE.Vector3())
  const warpCommitted = useRef(false)

  useEffect(() => {
    camera.position.copy(SOLAR_DEFAULT_POSITION)
    camera.lookAt(SOLAR_DEFAULT_TARGET)
  }, [camera])

  useFrame((_, delta) => {
    const {
      mode,
      view,
      focusedId,
      planetPositions,
      warpTargetView,
      setMode,
      completeReturn,
      setWarpProgress,
      commitWarpView,
      completeWarp,
    } = useSolarStore.getState()

    const persp = camera as THREE.PerspectiveCamera
    const wantBlackHoleFov =
      view === 'blackHole' ||
      (mode === 'warping' && warpTargetView === 'blackHole')
    const targetFov = wantBlackHoleFov ? BLACK_HOLE_FOV : DEFAULT_SCENE_FOV
    const fovK = 1 - Math.exp(-5.2 * delta)
    persp.fov = THREE.MathUtils.lerp(persp.fov, targetFov, fovK)
    persp.updateProjectionMatrix()

    const modeChanged = mode !== previousMode.current
    const focusedChanged = focusedId !== previousFocusedId.current

    if (modeChanged && mode === 'warping' && warpTargetView) {
      warpStartTime.current = clock.elapsedTime
      warpStartPos.current.copy(camera.position)
      warpStartLook.current.copy(lookAtRef.current)
      warpEndPos.current.copy(getViewDefaultPosition(warpTargetView))
      warpEndLook.current.copy(getViewDefaultTarget(warpTargetView))
      warpCommitted.current = false
    } else if (modeChanged || (focusedChanged && mode === 'focusing')) {
      transitionStartTime.current = clock.elapsedTime
      transitionStartPos.current.copy(camera.position)
      transitionStartLookAt.current.copy(lookAtRef.current)
    }
    previousMode.current = mode
    previousFocusedId.current = focusedId

    if (mode === 'warping') {
      const elapsed = clock.elapsedTime - warpStartTime.current
      const t = clamp01(elapsed / WARP_DURATION)
      setWarpProgress(t)

      const eased = easeInOutQuint(t)
      camera.position.lerpVectors(
        warpStartPos.current,
        warpEndPos.current,
        eased,
      )
      lookAtRef.current.lerpVectors(
        warpStartLook.current,
        warpEndLook.current,
        eased,
      )
      camera.lookAt(lookAtRef.current)

      if (!warpCommitted.current && t >= WARP_COMMIT_AT) {
        commitWarpView()
        warpCommitted.current = true
      }

      if (t >= 1) {
        completeWarp()
      }
      return
    }

    const elapsed = clock.elapsedTime - transitionStartTime.current

    if ((mode === 'focusing' || mode === 'focused') && focusedId) {
      if (view !== 'solar') return
      const planetPos = planetPositions[focusedId]
      const def = getPlanetById(focusedId)
      if (!planetPos || !def) return

      const focusDistance = computeFocusDistance(def.radius, def.focusDistance)
      const lookAtShift = focusDistance * FOCUS_LOOKAT_SHIFT_RATIO

      tmpOutward.current.set(planetPos.x, 0, planetPos.z)
      if (tmpOutward.current.lengthSq() < 1e-6) {
        tmpOutward.current.set(0, 0, 1)
      } else {
        tmpOutward.current.normalize()
      }
      tmpRight.current.set(
        tmpOutward.current.z,
        0,
        -tmpOutward.current.x,
      )

      desiredPos.current
        .copy(planetPos)
        .addScaledVector(tmpOutward.current, focusDistance)
      desiredPos.current.y += FOCUS_HEIGHT + def.radius * 0.5

      desiredLookAt.current
        .copy(planetPos)
        .addScaledVector(tmpRight.current, lookAtShift)

      if (mode === 'focusing') {
        const t = easeInOut(clamp01(elapsed / FOCUS_DURATION))
        camera.position.lerpVectors(
          transitionStartPos.current,
          desiredPos.current,
          t,
        )
        lookAtRef.current.lerpVectors(
          transitionStartLookAt.current,
          desiredLookAt.current,
          t,
        )
        camera.lookAt(lookAtRef.current)

        if (elapsed >= FOCUS_DURATION) setMode('focused')
      } else {
        const settleSpeed = 5
        const k = 1 - Math.exp(-settleSpeed * (1 / 60))
        camera.position.lerp(desiredPos.current, k)
        lookAtRef.current.lerp(desiredLookAt.current, k)
        camera.lookAt(lookAtRef.current)
      }
    } else if (mode === 'returning') {
      const t = easeInOut(clamp01(elapsed / RETURN_DURATION))
      const targetPos = getViewDefaultPosition(view)
      const targetLook = getViewDefaultTarget(view)
      camera.position.lerpVectors(transitionStartPos.current, targetPos, t)
      lookAtRef.current.lerpVectors(
        transitionStartLookAt.current,
        targetLook,
        t,
      )
      camera.lookAt(lookAtRef.current)

      if (elapsed >= RETURN_DURATION) {
        completeReturn()
      }
    } else if (mode === 'overview') {
      const targetPos = getViewDefaultPosition(view)
      const targetLook = getViewDefaultTarget(view)
      const k = 1 - Math.exp(-3.5 * (1 / 60))
      camera.position.lerp(targetPos, k)
      lookAtRef.current.lerp(targetLook, k)
      camera.lookAt(lookAtRef.current)
    }
  })

  return null
}
