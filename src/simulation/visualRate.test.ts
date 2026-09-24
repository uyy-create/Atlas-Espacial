import { describe, expect, it } from 'vitest'
import { followTrueAngle, visualAngularStep } from './visualRate'

const TWO_PI = Math.PI * 2
const FRAME = 1 / 60
const CAP = TWO_PI / 6

describe('visualAngularStep', () => {
  it('does not move while paused or for a zero period', () => {
    expect(visualAngularStep(10, 0, FRAME, CAP)).toBe(0)
    expect(visualAngularStep(0, 1, FRAME, CAP)).toBe(0)
  })

  it('follows the real rate under the cap', () => {
    // 27.3-day orbit at 1 day/s.
    expect(visualAngularStep(27.3, FRAME, FRAME, CAP)).toBeCloseTo(
      (TWO_PI * FRAME) / 27.3,
    )
  })

  it('caps fast bodies and keeps retrograde ones retrograde', () => {
    expect(visualAngularStep(0.319, 0.5, FRAME, CAP)).toBeCloseTo(CAP * FRAME)
    expect(visualAngularStep(-0.319, 0.5, FRAME, CAP)).toBeCloseTo(-CAP * FRAME)
  })
})

describe('followTrueAngle', () => {
  const run = (
    start: number,
    trueAngle: (frame: number) => number,
    periodDays: number,
    daysPerSecond: number,
    frames: number,
  ) => {
    let angle = start
    for (let i = 0; i < frames; i++) {
      angle = followTrueAngle(
        angle,
        trueAngle(i),
        periodDays,
        daysPerSecond * FRAME,
        FRAME,
        CAP,
      )
    }
    return angle
  }

  it('slides back onto the true angle while paused', () => {
    expect(run(0, () => 2, 1, 0, 120)).toBeCloseTo(2, 2)
  })

  it('takes the short way round', () => {
    // True angle just past 0, body just before 2π: a small step forward.
    const next = followTrueAngle(TWO_PI - 0.1, 0.1, 1, 0, FRAME, CAP)
    expect(next).toBeGreaterThan(TWO_PI - 0.1)
    expect(next).toBeLessThan(TWO_PI + 0.1)
  })

  it('tracks a slow body as it moves', () => {
    const period = 27.3
    const rate = TWO_PI / period // rad per simulated day, at 1 day/s
    const truth = (i: number) => 1 + rate * (i + 1) * FRAME
    const end = run(0.5, truth, period, 1, 300)
    expect(end).toBeCloseTo(truth(299), 2)
  })

  it('spins decoratively at the cap when the truth is too fast', () => {
    const end = run(0, () => 3, 0.319, 30, 60)
    expect(end).toBeCloseTo(CAP, 5)
  })
})
