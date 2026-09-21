import { useEffect } from 'react'
import { useSolarStore, type ViewId } from '../store/useSolarStore'
import { useTourStore } from '../store/useTourStore'
import { TOUR_STEPS, type TourStep } from './tourSteps'

type SolarSnapshot = {
  view: ViewId
  mode: string
  focusedId: string | null
}

const isSatisfied = (step: TourStep, s: SolarSnapshot): boolean => {
  const t = step.target
  if (t.kind === 'view') return s.view === t.view && s.mode === 'overview'
  return s.view === 'solar' && s.focusedId === t.id && s.mode === 'focused'
}

/**
 * Issue the single next action that moves the scene toward the step's
 * target. Called again on every state change until the target is reached,
 * so multi-hop routes (moon → planet → overview → warp) resolve themselves.
 */
const applyStep = (step: TourStep) => {
  const s = useSolarStore.getState()
  // Something is already in flight: wait for it to land.
  if (s.mode === 'warping' || s.mode === 'returning' || s.mode === 'focusing') {
    return
  }
  const t = step.target
  if (t.kind === 'view') {
    if (s.view !== t.view) {
      s.navigateToView(t.view)
    } else if (s.focusedId !== null) {
      s.unfocus()
    }
    return
  }
  if (s.view !== 'solar') {
    s.navigateToView('solar')
  } else if (s.focusedId !== t.id) {
    s.focus(t.id)
  }
}

/**
 * Drives the guided tour: steers the scene to each step's target, starts
 * the auto-advance timer once it settles, and hands control back to the
 * visitor if they navigate away from a settled step.
 */
export function TourController() {
  useEffect(() => {
    let timer: number | null = null
    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
    }

    const evaluate = () => {
      const tour = useTourStore.getState()
      if (!tour.active) {
        clearTimer()
        return
      }
      const step = TOUR_STEPS[tour.stepIndex]
      const solar = useSolarStore.getState()

      if (isSatisfied(step, solar)) {
        if (!tour.settled) {
          tour.setSettled(true)
          clearTimer()
          timer = window.setTimeout(
            () => useTourStore.getState().next(),
            step.duration * 1000,
          )
        }
        return
      }

      // It had settled and no longer is: the visitor took over.
      if (tour.settled) {
        clearTimer()
        tour.stop()
        return
      }

      applyStep(step)
    }

    const unsubscribeTour = useTourStore.subscribe((state, prev) => {
      if (state.active !== prev.active || state.stepIndex !== prev.stepIndex) {
        clearTimer()
        evaluate()
      }
    })
    const unsubscribeSolar = useSolarStore.subscribe((state, prev) => {
      if (
        state.mode !== prev.mode ||
        state.view !== prev.view ||
        state.focusedId !== prev.focusedId
      ) {
        evaluate()
      }
    })

    return () => {
      clearTimer()
      unsubscribeTour()
      unsubscribeSolar()
    }
  }, [])

  return null
}
