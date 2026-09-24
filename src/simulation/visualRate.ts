const TWO_PI = Math.PI * 2

/**
 * Angular step (radians) for a body with a real `periodDays`, given the
 * simulated days elapsed this frame. The rate is capped at
 * `maxRadPerSec` of wall time: at high time speeds a moon or a planet's
 * spin would otherwise alias into a strobe, and past the cap it reads as
 * "fast" either way. Negative periods spin/orbit retrograde.
 */
export function visualAngularStep(
  periodDays: number,
  deltaDays: number,
  deltaSec: number,
  maxRadPerSec: number,
): number {
  if (periodDays === 0 || deltaDays === 0) return 0
  const wanted = (TWO_PI * deltaDays) / Math.abs(periodDays)
  const capped = Math.min(wanted, maxRadPerSec * deltaSec)
  return periodDays < 0 ? -capped : capped
}

/** Rate (1/s) at which a body slides back onto its true angle. */
const SETTLE_RATE = 4

const wrapPi = (a: number) => {
  const t = (a + Math.PI) % TWO_PI
  return (t < 0 ? t + TWO_PI : t) - Math.PI
}

/**
 * Next visual angle for a body whose real angle on the current date is
 * `trueAngle`. While its real motion fits under `maxRadPerSec` it tracks
 * the truth, easing in so that pausing or slowing down after a capped
 * stretch slides it back into place instead of snapping; past the cap it
 * turns decoratively (see visualAngularStep).
 */
export function followTrueAngle(
  current: number,
  trueAngle: number,
  periodDays: number,
  deltaDays: number,
  deltaSec: number,
  maxRadPerSec: number,
): number {
  const step = visualAngularStep(periodDays, deltaDays, deltaSec, maxRadPerSec)
  const wanted =
    periodDays === 0 ? 0 : (TWO_PI * deltaDays) / Math.abs(periodDays)
  if (wanted > maxRadPerSec * deltaSec) return current + step
  const settle = 1 - Math.exp(-SETTLE_RATE * deltaSec)
  return current + step + wrapPi(trueAngle - (current + step)) * settle
}

/**
 * One revolution every 10 s at most. Spin is decorative past this point:
 * even at 1 day/s every planet but Mercury and Venus would exceed it.
 */
export const MAX_SPIN_RAD_PER_SEC = TWO_PI / 10
/** One orbit every 6 s at most. */
export const MAX_MOON_RAD_PER_SEC = TWO_PI / 6
