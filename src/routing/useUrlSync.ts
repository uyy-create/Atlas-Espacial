import { useEffect } from 'react'
import { julianDayToDate } from '../simulation/ephemeris'
import { useSolarStore } from '../store/useSolarStore'
import { useTimeStore } from '../store/useTimeStore'
import { writeUrlState } from './urlState'

/**
 * Mirrors view, focused planet and (while paused) the simulated date into
 * the URL once the visitor has entered.
 */
export function useUrlSync() {
  useEffect(() => {
    const sync = () => {
      const solar = useSolarStore.getState()
      if (!solar.entered) return
      const time = useTimeStore.getState()
      const planetId =
        solar.mode === 'focusing' || solar.mode === 'focused'
          ? solar.focusedId
          : null
      writeUrlState({
        view: solar.view,
        planetId,
        date: time.paused ? julianDayToDate(time.clock.julianDay) : null,
      })
    }

    const unsubscribeSolar = useSolarStore.subscribe((state, prev) => {
      if (
        state.entered !== prev.entered ||
        state.view !== prev.view ||
        state.mode !== prev.mode ||
        state.focusedId !== prev.focusedId
      ) {
        sync()
      }
    })
    const unsubscribeTime = useTimeStore.subscribe((state, prev) => {
      if (
        state.paused !== prev.paused ||
        state.dateVersion !== prev.dateVersion
      ) {
        sync()
      }
    })
    return () => {
      unsubscribeSolar()
      unsubscribeTime()
    }
  }, [])
}
