import { create } from 'zustand'
import { dateToJulianDay } from '../simulation/ephemeris'

export interface TimeSpeed {
  id: string
  label: string
  daysPerSecond: number
}

/**
 * Presets top out at six months per second: past that the inner planets
 * are a blur (Mercury would lap the Sun several times a second) and only
 * the outer ones stay readable, which is not worth a preset.
 */
export const TIME_SPEEDS: TimeSpeed[] = [
  { id: 'day', label: '1 día/s', daysPerSecond: 1 },
  { id: 'days3', label: '3 días/s', daysPerSecond: 3 },
  { id: 'week', label: '1 semana/s', daysPerSecond: 7 },
  { id: 'month', label: '1 mes/s', daysPerSecond: 30.44 },
  { id: 'halfyear', label: '6 meses/s', daysPerSecond: 182.6 },
]

export const DEFAULT_SPEED_ID = 'days3'

/**
 * Simulated clock. `clock` is mutated in place every frame by
 * SimulationClock (no store notifications): scene objects read it inside
 * useFrame, and UI that shows the date polls it at a low rate.
 */
export interface SimClock {
  julianDay: number
  /** Simulated days elapsed during the last frame (0 while paused). */
  deltaDays: number
}

interface TimeState {
  paused: boolean
  speedId: string
  clock: SimClock
  /** Bumped on every explicit jump of the clock so subscribers can react. */
  dateVersion: number

  togglePaused: () => void
  setPaused: (paused: boolean) => void
  setSpeed: (id: string) => void
  /** Jump the simulation to the current real date. */
  resetToNow: () => void
  /** Jump the simulation to a given date. */
  setDate: (date: Date) => void
  /** Advance the clock by one rendered frame of `deltaSec` seconds. */
  advance: (deltaSec: number) => void
}

export const getSpeedById = (id: string): TimeSpeed =>
  TIME_SPEEDS.find((s) => s.id === id) ??
  TIME_SPEEDS.find((s) => s.id === DEFAULT_SPEED_ID)!

export const useTimeStore = create<TimeState>((set, get) => ({
  paused: false,
  speedId: DEFAULT_SPEED_ID,
  clock: { julianDay: dateToJulianDay(new Date()), deltaDays: 0 },
  dateVersion: 0,

  togglePaused: () => set((s) => ({ paused: !s.paused })),
  setPaused: (paused) => set({ paused }),
  setSpeed: (id) => set({ speedId: getSpeedById(id).id }),

  resetToNow: () => {
    get().setDate(new Date())
  },

  setDate: (date) => {
    get().clock.julianDay = dateToJulianDay(date)
    set((s) => ({ dateVersion: s.dateVersion + 1 }))
  },

  advance: (deltaSec) => {
    const { paused, speedId, clock } = get()
    // Clamp so a background tab doesn't leap centuries on refocus.
    const dt = Math.min(deltaSec, 0.1)
    const deltaDays = paused ? 0 : dt * getSpeedById(speedId).daysPerSecond
    clock.julianDay += deltaDays
    clock.deltaDays = deltaDays
  },
}))
