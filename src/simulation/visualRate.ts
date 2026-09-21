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

/**
 * One revolution every 10 s at most. Spin is decorative past this point:
 * even at 1 day/s every planet but Mercury and Venus would exceed it.
 */
export const MAX_SPIN_RAD_PER_SEC = TWO_PI / 10
/** One orbit every 6 s at most. */
export const MAX_MOON_RAD_PER_SEC = TWO_PI / 6
