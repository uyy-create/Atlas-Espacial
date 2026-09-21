import { create } from 'zustand'
import { TOUR_STEPS } from '../tour/tourSteps'

interface TourState {
  active: boolean
  stepIndex: number
  /**
   * True once the current step's target has been reached (camera settled,
   * view stable). The auto-advance timer only runs from then on.
   */
  settled: boolean

  start: () => void
  stop: () => void
  next: () => void
  prev: () => void
  setSettled: (settled: boolean) => void
}

export const useTourStore = create<TourState>((set, get) => ({
  active: false,
  stepIndex: 0,
  settled: false,

  start: () => set({ active: true, stepIndex: 0, settled: false }),
  stop: () => set({ active: false, settled: false }),

  next: () => {
    const { active, stepIndex } = get()
    if (!active) return
    if (stepIndex >= TOUR_STEPS.length - 1) {
      set({ active: false, settled: false })
      return
    }
    set({ stepIndex: stepIndex + 1, settled: false })
  },

  prev: () => {
    const { active, stepIndex } = get()
    if (!active || stepIndex === 0) return
    set({ stepIndex: stepIndex - 1, settled: false })
  },

  setSettled: (settled) => {
    if (get().settled !== settled) set({ settled })
  },
}))

// Dev-only handle, like __solarStore.
if (import.meta.env.DEV) {
  ;(window as unknown as { __tourStore?: typeof useTourStore }).__tourStore =
    useTourStore
}
