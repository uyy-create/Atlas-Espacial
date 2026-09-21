import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SolarScene } from './experience'
import { WarpFadeOverlay } from './transitions/warp/WarpFadeOverlay'
import { PlanetInfoPanel } from './ui/PlanetInfoPanel'
import { Navigator } from './ui/Navigator'
import { LoadingScreen } from './ui/LoadingScreen'
import { TimeControls } from './ui/TimeControls'
import { TourButton, TourOverlay } from './ui/TourOverlay'
import { TourController } from './tour/TourController'
import { useSolarStore } from './store/useSolarStore'
import { useTourStore } from './store/useTourStore'
import { useUrlSync } from './routing/useUrlSync'

function App() {
  const entered = useSolarStore((s) => s.entered)
  const mode = useSolarStore((s) => s.mode)
  const view = useSolarStore((s) => s.view)
  const unfocus = useSolarStore((s) => s.unfocus)
  const focusNeighbor = useSolarStore((s) => s.focusNeighbor)
  const navigateToView = useSolarStore((s) => s.navigateToView)
  const tourActive = useTourStore((s) => s.active)

  useUrlSync()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // While the tour runs, the keys drive the tour instead of the scene.
      const tour = useTourStore.getState()
      if (tour.active) {
        if (e.key === 'Escape') tour.stop()
        else if (e.key === 'ArrowRight') tour.next()
        else if (e.key === 'ArrowLeft') tour.prev()
        else return
        e.preventDefault()
        return
      }
      if (e.key === 'Escape') {
        const v = useSolarStore.getState().view
        if (v === 'galaxy') {
          navigateToView('solar')
          return
        }
        if (v === 'blackHole') {
          navigateToView('galaxy')
          return
        }
        unfocus()
        return
      }
      if (useSolarStore.getState().view !== 'solar') return
      const focusedId = useSolarStore.getState().focusedId
      if (!focusedId) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        focusNeighbor(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        focusNeighbor(-1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [unfocus, focusNeighbor, navigateToView])

  const hint = !entered || tourActive
    ? null
    : view === 'solar' && mode === 'overview'
      ? 'Pulsa sobre un planeta para explorarlo'
      : view === 'galaxy' && mode !== 'warping'
        ? 'Pulsa un punto brillante: Sistema Solar o Agujero negro'
        : view === 'blackHole' && mode === 'overview'
          ? 'Escape: volver a la galaxia'
          : null

  return (
    <div className="relative h-full w-full overflow-hidden bg-cosmos-deep">
      <SolarScene />
      <WarpFadeOverlay />

      <header className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-start justify-between px-8 py-6">
        <Navigator />
        <TourButton />
      </header>

      <AnimatePresence>
        {hint && (
          <motion.div
            key={hint}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-center"
          >
            <p className="font-display text-[11px] uppercase tracking-[0.4em] text-white/55">
              {hint}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <PlanetInfoPanel />
      <TimeControls />
      <TourOverlay />
      <TourController />
      <LoadingScreen />
    </div>
  )
}

export default App
