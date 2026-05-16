/**
 * Copia de seguridad de BLACK_HOLE_DEFAULTS (2026-05-16).
 *
 * Para restaurar: copia el objeto de abajo sobre BLACK_HOLE_DEFAULTS
 * en blackHoleRaymarchShader.ts (o importa y asigna en createBlackHoleUniforms).
 */
export const BLACK_HOLE_DEFAULTS_SNAPSHOT = {
  size: 0.3,
  diskSpeed: 3,
  diskLayers: 12,
  diskBrightness: 2.0,
  diskRimBoost: 100.0,
  diskNoiseFreq: 70.0,
  diskColorHot: [1.0, 0.8, 0.0] as const,
  diskColorCool: [0.5, 0.13, 0.02] as const,
  camDistance: 1.22,
  camAngleY: 0.2,
  camPitchTrim: 0.1,
  frameRotDeg: 10.0,
  frameOffsetX: -0.06,
  frameOffsetY: 0.12,
  starBrightness: 72.0,
  starSharpness: 156.0,
  starTwinkleSpeed: 9.35,
  starTwinkleAmount: 0.42,
  starDriftSpeed: 0.155,
  starDriftScale: 0.034,
  bendStrength: 0.625,
  glowStrength: 0.05,
  glowColor: [1.2, 1.1, 1.0] as const,
  glowHorizon: 1.5,
  lensedBgRadius: 90.0,
  lensedBgStrength: 0.12,
  lensedBgKnee: 1.55,
  aa: 2,
  outputGamma: 0.68,
} as const
