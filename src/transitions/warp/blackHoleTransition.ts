import type { CameraMode, ViewId } from '../../store/useSolarStore'
import { smoothstep, warpIntensityCurve } from './warpScaleCurves'

/** Salida del BH: fase de ráfagas antes del fundido a negro. */
const EXIT_STREAK_PHASE_END = 0.48
const EXIT_FADE_IN_START = 0.4
const EXIT_FADE_IN_END = 0.54
const EXIT_FADE_OUT_START = 0.58
const EXIT_FADE_OUT_END = 0.78

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3)

export function isWarpingToBlackHole(
  mode: CameraMode,
  warpTargetView: ViewId | null,
): boolean {
  return mode === 'warping' && warpTargetView === 'blackHole'
}

export function isWarpingFromBlackHole(
  mode: CameraMode,
  view: ViewId,
  warpTargetView: ViewId | null,
): boolean {
  return (
    mode === 'warping' &&
    view === 'blackHole' &&
    warpTargetView !== null &&
    warpTargetView !== 'blackHole'
  )
}

/** Shadertoy camera whenever the BH layer is the focus (avoids pop at warp end). */
export function shouldUseShadertoyCamera(
  mode: CameraMode,
  view: ViewId,
  warpTargetView: ViewId | null,
): boolean {
  if (view === 'blackHole' && mode === 'overview') return true
  if (isWarpingToBlackHole(mode, warpTargetView)) return true
  if (isWarpingFromBlackHole(mode, view, warpTargetView)) return true
  return false
}

/**
 * 0..1 visual scale for the BH (1 = final size).
 * Grows during warp-in; shrinks during warp-out.
 */
export function computeBlackHolePresentScale(
  mode: CameraMode,
  view: ViewId,
  warpTargetView: ViewId | null,
  warpProgress: number,
): number {
  const t = clamp01(warpProgress)

  if (isWarpingToBlackHole(mode, warpTargetView)) {
    const travelEnd = 0.38
    if (t < travelEnd) {
      return smoothstep(0, travelEnd, t) * 0.22 + 0.06
    }
    const grow = (t - travelEnd) / (1 - travelEnd)
    return 0.28 + easeOutCubic(grow) * 0.72
  }

  if (isWarpingFromBlackHole(mode, view, warpTargetView)) {
    return 1 - smoothstep(EXIT_FADE_IN_START, 0.72, t) * 0.94
  }

  if (view === 'blackHole' && mode === 'overview') return 1

  return 1
}

/**
 * Full-screen black overlay 0..1 during view changes involving the BH.
 */
export function computeBlackHoleWarpFade(
  mode: CameraMode,
  view: ViewId,
  warpTargetView: ViewId | null,
  warpProgress: number,
): number {
  if (mode !== 'warping') return 0
  const t = clamp01(warpProgress)

  if (isWarpingFromBlackHole(mode, view, warpTargetView)) {
    const fadeIn = smoothstep(EXIT_FADE_IN_START, EXIT_FADE_IN_END, t)
    const fadeOut = 1 - smoothstep(EXIT_FADE_OUT_START, EXIT_FADE_OUT_END, t)
    return Math.min(fadeIn, fadeOut)
  }

  if (isWarpingToBlackHole(mode, warpTargetView)) {
    return (1 - smoothstep(0.06, 0.22, t)) * 0.65
  }

  return 0
}

/**
 * Intensidad de ráfagas de warp. Al salir del BH, el pico cae en la primera mitad
 * (antes del fundido a negro).
 */
export function computeWarpStreakIntensity(
  mode: CameraMode,
  view: ViewId,
  warpTargetView: ViewId | null,
  warpProgress: number,
): number {
  if (mode !== 'warping') return 0
  const t = clamp01(warpProgress)

  if (isWarpingFromBlackHole(mode, view, warpTargetView)) {
    const streakT = Math.min(t / EXIT_STREAK_PHASE_END, 1)
    return warpIntensityCurve(streakT)
  }

  return warpIntensityCurve(t)
}
