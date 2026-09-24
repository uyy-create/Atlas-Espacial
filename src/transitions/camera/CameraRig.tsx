import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { getBodyById } from '../../data/planets'
import {
  useSolarStore,
  type CameraMode,
  type ViewId,
} from '../../store/useSolarStore'
import { FocusOrbit } from './FocusOrbit'

const SOLAR_DEFAULT_POSITION = new THREE.Vector3(0, 32, 78)
const SOLAR_DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)
/** Wide establishing shots held behind the loading screen, per view. */
const INTRO_POSITION = new THREE.Vector3(-18, 58, 150)
const GALAXY_INTRO_POSITION = new THREE.Vector3(-30, 120, 300)
/** Slow drift of the intro shot so the reveal isn't a frozen frame. */
const INTRO_DRIFT_SPEED = 0.05
const INTRO_DRIFT_RADIUS = 6
const GALAXY_DEFAULT_POSITION = new THREE.Vector3(0, 62, 178)
const GALAXY_DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)
/**
 * Warp endpoint only — the settled BH view uses an internal Shadertoy camera
 * in the raymarch shader (no orbit / no Three.js framing).
 */
const BLACK_HOLE_DEFAULT_POSITION = new THREE.Vector3(0, 32, 78)
const BLACK_HOLE_DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)
const BLACK_HOLE_FOV = 45
const DEFAULT_SCENE_FOV = 45

const DEFAULT_FOCUS_DISTANCE = 4.5
const WORLD_UP = new THREE.Vector3(0, 1, 0)
/** How high above the orbital plane the camera sits when focused. */
const FOCUS_HEIGHT = 1.6
/** Moons are tiny: get much closer and lower. */
const MOON_DEFAULT_FOCUS_DISTANCE = 0.9
const MOON_FOCUS_HEIGHT = 0.35
/**
 * How much we shift the camera's look-at target sideways from the planet,
 * so the planet visually anchors on the LEFT third of the screen.
 */
const FOCUS_LOOKAT_SHIFT_RATIO = 0.45

const FOCUS_DURATION = 1.6
const RETURN_DURATION = 1.4
/** Dolly-in from the intro shot, once the visitor presses "Entrar". */
const INTRO_DURATION = 3.2
const WARP_DURATION = 2.2
const WARP_COMMIT_AT = 0.5

const easeInOut = gsap.parseEase('power3.inOut')
const easeInOutQuint = (t: number) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

const getViewIntroPosition = (view: ViewId): THREE.Vector3 =>
  view === 'galaxy' ? GALAXY_INTRO_POSITION : INTRO_POSITION

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

interface FocusFraming {
  distance: number
  height: number
}

const computeFocusFraming = (
  kind: 'planet' | 'moon',
  radius: number,
  override?: number,
): FocusFraming => {
  if (kind === 'moon') {
    return {
      distance: override ?? Math.max(MOON_DEFAULT_FOCUS_DISTANCE, radius * 5),
      height: MOON_FOCUS_HEIGHT + radius * 0.5,
    }
  }
  return {
    distance: override ?? Math.max(DEFAULT_FOCUS_DISTANCE, radius * 4.2),
    height: FOCUS_HEIGHT + radius * 0.5,
  }
}

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  const lookAtRef = useRef(new THREE.Vector3().copy(SOLAR_DEFAULT_TARGET))

  const tmpOutward = useRef(new THREE.Vector3())
  const tmpRight = useRef(new THREE.Vector3())
  const tmpForward = useRef(new THREE.Vector3())
  const desiredPos = useRef(new THREE.Vector3())
  const desiredLookAt = useRef(new THREE.Vector3())

  // Drag-to-orbit input while a planet is focused.
  const orbitRef = useRef<FocusOrbit | null>(null)
  useEffect(() => {
    const orbit = new FocusOrbit(gl.domElement)
    orbitRef.current = orbit
    return () => {
      orbit.dispose()
      orbitRef.current = null
    }
  }, [gl])

  const transitionStartTime = useRef(0)
  const transitionStartPos = useRef(new THREE.Vector3())
  const transitionStartLookAt = useRef(new THREE.Vector3())
  const previousMode = useRef<CameraMode>('overview')
  const previousFocusedId = useRef<string | null>(null)
  const previousEntered = useRef(false)
  const returnDuration = useRef(RETURN_DURATION)
  const focusDuration = useRef(FOCUS_DURATION)

  const warpStartTime = useRef(0)
  const warpStartPos = useRef(new THREE.Vector3())
  const warpStartLook = useRef(new THREE.Vector3())
  const warpEndPos = useRef(new THREE.Vector3())
  const warpEndLook = useRef(new THREE.Vector3())
  const warpCommitted = useRef(false)

  useEffect(() => {
    camera.position.copy(INTRO_POSITION)
    camera.lookAt(SOLAR_DEFAULT_TARGET)
  }, [camera])

  useFrame(({ camera, clock }, delta) => {
    const {
      entered,
      mode,
      view,
      focusedId,
      bodyPositions,
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

    if (!entered) {
      // Hold the establishing shot, drifting slowly, until "Entrar".
      const t = clock.elapsedTime * INTRO_DRIFT_SPEED
      const intro = getViewIntroPosition(view)
      camera.position.set(
        intro.x + Math.sin(t) * INTRO_DRIFT_RADIUS,
        intro.y + Math.sin(t * 0.7) * INTRO_DRIFT_RADIUS * 0.3,
        intro.z + Math.cos(t) * INTRO_DRIFT_RADIUS,
      )
      lookAtRef.current.copy(SOLAR_DEFAULT_TARGET)
      camera.lookAt(lookAtRef.current)
      previousMode.current = mode
      previousFocusedId.current = focusedId
      return
    }

    const modeChanged = mode !== previousMode.current
    const focusedChanged = focusedId !== previousFocusedId.current
    const justEntered = entered !== previousEntered.current
    previousEntered.current = entered

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
      returnDuration.current = justEntered ? INTRO_DURATION : RETURN_DURATION
      focusDuration.current = justEntered ? INTRO_DURATION : FOCUS_DURATION
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

    if (mode !== 'focused') orbitRef.current?.setEnabled(false)

    if ((mode === 'focusing' || mode === 'focused') && focusedId) {
      if (view !== 'solar') return
      const planetPos = bodyPositions[focusedId]
      const body = getBodyById(focusedId)
      if (!planetPos || !body) return
      const def = body.kind === 'moon' ? body.moon : body.planet

      const { distance: focusDistance, height: focusHeight } =
        computeFocusFraming(body.kind, def.radius, def.focusDistance)
      const defaultElevation = Math.atan2(focusHeight, focusDistance)
      const defaultDistance = Math.hypot(focusDistance, focusHeight)

      const orbit = orbitRef.current
      if (orbit) {
        if (focusedChanged) orbit.reset(defaultElevation)
        orbit.setEnabled(mode === 'focused')
        orbit.update(delta)
      }
      const azimuth = orbit?.azimuth ?? 0
      const elevation = orbit?.elevation ?? defaultElevation
      const distance = defaultDistance * (orbit?.zoom ?? 1)

      // Frame of reference co-rotates with the body: azimuth 0 looks at a
      // planet from outside its orbit (Sun behind it), and at a moon from
      // outside its orbit around the planet (planet behind it).
      const parentPos =
        body.kind === 'moon' ? bodyPositions[body.planet.id] : undefined
      if (parentPos) {
        tmpOutward.current.set(
          planetPos.x - parentPos.x,
          0,
          planetPos.z - parentPos.z,
        )
      } else {
        tmpOutward.current.set(planetPos.x, 0, planetPos.z)
      }
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

      const horizontal = distance * Math.cos(elevation)
      desiredPos.current
        .copy(planetPos)
        .addScaledVector(tmpOutward.current, horizontal * Math.cos(azimuth))
        .addScaledVector(tmpRight.current, horizontal * Math.sin(azimuth))
      desiredPos.current.y += distance * Math.sin(elevation)

      // Orbiting a moon toward its planet must not put the camera inside
      // the planet (or its atmosphere shell): push it back out.
      if (parentPos && body.kind === 'moon') {
        const minParentDistance = body.planet.radius * 1.45
        tmpForward.current.copy(desiredPos.current).sub(parentPos)
        const parentDistance = tmpForward.current.length()
        if (parentDistance < minParentDistance) {
          if (parentDistance < 1e-6) tmpForward.current.set(0, 1, 0)
          else tmpForward.current.divideScalar(parentDistance)
          desiredPos.current
            .copy(parentPos)
            .addScaledVector(tmpForward.current, minParentDistance)
        }
      }

      // Shift the look-at to the camera's right so the planet anchors on
      // the left third of the screen whatever the orbit angle. Scales
      // with zoom so it stays put while zooming.
      tmpForward.current.copy(planetPos).sub(desiredPos.current).normalize()
      tmpRight.current.crossVectors(tmpForward.current, WORLD_UP)
      if (tmpRight.current.lengthSq() < 1e-6) {
        tmpRight.current.set(1, 0, 0)
      } else {
        tmpRight.current.normalize()
      }
      const lookAtShift =
        focusDistance * FOCUS_LOOKAT_SHIFT_RATIO * (orbit?.zoom ?? 1)
      desiredLookAt.current
        .copy(planetPos)
        .addScaledVector(tmpRight.current, lookAtShift)

      if (mode === 'focusing') {
        const duration = focusDuration.current
        const t = easeInOut(clamp01(elapsed / duration))
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

        if (elapsed >= duration) setMode('focused')
      } else {
        // The orbit input is already smoothed, so follow the planet exactly.
        camera.position.copy(desiredPos.current)
        lookAtRef.current.copy(desiredLookAt.current)
        camera.lookAt(lookAtRef.current)
      }
    } else if (mode === 'returning') {
      const duration = returnDuration.current
      const t = easeInOut(clamp01(elapsed / duration))
      const targetPos = getViewDefaultPosition(view)
      const targetLook = getViewDefaultTarget(view)
      camera.position.lerpVectors(transitionStartPos.current, targetPos, t)
      lookAtRef.current.lerpVectors(
        transitionStartLookAt.current,
        targetLook,
        t,
      )
      camera.lookAt(lookAtRef.current)

      if (elapsed >= duration) {
        completeReturn()
      }
    } else if (mode === 'overview') {
      const targetPos = getViewDefaultPosition(view)
      const targetLook = getViewDefaultTarget(view)
      const k = 1 - Math.exp(-3.5 * delta)
      camera.position.lerp(targetPos, k)
      lookAtRef.current.lerp(targetLook, k)
      camera.lookAt(lookAtRef.current)
    }
  })

  return null
}
