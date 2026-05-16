import * as THREE from 'three'

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Bell curve for warp streaks / post FX (peaks mid-warp on a 0..1 timeline). */
export function warpIntensityCurve(progress: number): number {
  if (progress <= 0) return 0
  if (progress >= 1) return 0
  return Math.pow(Math.sin(progress * Math.PI), 1.35)
}

/** Galaxy scale when arriving from solar: starts large, settles to 1. */
const GALAXY_ARRIVE_BIG = 2.45

/** Galaxy scale when leaving to solar: grows past this before fade. */
const GALAXY_DEPART_BIG = 3.15

/** Solar → galaxy: solar shrinks fast; galaxy fades in large then shrinks to normal. */
export function warpSolarSystemScaleToGalaxy(t: number): number {
  return THREE.MathUtils.lerp(1, 0.02, smoothstep(0, 0.36, t))
}

export function warpGalaxyScaleToGalaxy(t: number): number {
  const settle = smoothstep(0.4, 0.96, t)
  return THREE.MathUtils.lerp(GALAXY_ARRIVE_BIG, 1, settle)
}

export function warpGalaxyOpacityToGalaxy(t: number): number {
  return smoothstep(0.32, 0.5, t)
}

/** Galaxy → solar: galaxy blows up from pivot then fades; solar grows in. */
export function warpGalaxyScaleToSolar(t: number): number {
  return THREE.MathUtils.lerp(1, GALAXY_DEPART_BIG, smoothstep(0, 0.58, t))
}

export function warpGalaxyOpacityToSolar(t: number): number {
  return 1 - smoothstep(0.5, 0.68, t)
}

export function warpSolarSystemScaleToSolar(t: number): number {
  return THREE.MathUtils.lerp(0.035, 1, smoothstep(0.42, 0.94, t))
}
