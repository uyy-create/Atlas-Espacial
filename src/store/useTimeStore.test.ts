import { beforeEach, describe, expect, it } from 'vitest'
import {
  EPHEMERIS_MAX_JD,
  dateToJulianDay,
} from '../simulation/ephemeris'
import { DEFAULT_SPEED_ID, getSpeedById, useTimeStore } from './useTimeStore'

const START = dateToJulianDay(new Date('2030-01-01T12:00:00Z'))

const state = () => useTimeStore.getState()

beforeEach(() => {
  useTimeStore.setState({
    paused: false,
    speedId: 'day',
    clock: { julianDay: START, deltaDays: 0 },
    dateVersion: 0,
  })
})

describe('useTimeStore', () => {
  it('advances by the speed preset', () => {
    state().advance(0.05)
    expect(state().clock.julianDay).toBeCloseTo(START + 0.05)
    expect(state().clock.deltaDays).toBeCloseTo(0.05)
  })

  it('stands still while paused', () => {
    state().setPaused(true)
    state().advance(0.05)
    expect(state().clock.julianDay).toBe(START)
    expect(state().clock.deltaDays).toBe(0)
  })

  it('does not leap after a long frame (background tab)', () => {
    state().advance(30)
    expect(state().clock.deltaDays).toBeCloseTo(0.1)
  })

  it('does not pause itself in the middle of the range', () => {
    state().setSpeed('halfyear')
    for (let i = 0; i < 100; i++) state().advance(1 / 60)
    expect(state().paused).toBe(false)
  })

  it('stops and pauses at the end of the ephemeris range', () => {
    state().setDate(new Date('2050-12-20T12:00:00Z'))
    state().setSpeed('halfyear')
    for (let i = 0; i < 10; i++) state().advance(0.1)
    expect(state().clock.julianDay).toBe(EPHEMERIS_MAX_JD)
    expect(state().paused).toBe(true)
    // Resuming there goes nowhere.
    state().setPaused(false)
    state().advance(0.1)
    expect(state().clock.julianDay).toBe(EPHEMERIS_MAX_JD)
    expect(state().paused).toBe(true)
  })

  it('clamps explicit jumps and announces them', () => {
    state().setDate(new Date('2200-01-01T00:00:00Z'))
    expect(state().clock.julianDay).toBe(EPHEMERIS_MAX_JD)
    expect(state().dateVersion).toBe(1)
  })

  it('falls back to the default speed for unknown ids', () => {
    state().setSpeed('warp9')
    expect(state().speedId).toBe(DEFAULT_SPEED_ID)
    expect(getSpeedById('warp9').id).toBe(DEFAULT_SPEED_ID)
  })
})
