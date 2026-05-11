import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SolarScene } from './scene/SolarScene'
import { PlanetInfoPanel } from './ui/PlanetInfoPanel'
import { Navigator } from './ui/Navigator'
import { useSolarStore } from './store/useSolarStore'

function App() {
  const mode = useSolarStore((s) => s.mode)
  const view = useSolarStore((s) => s.view)
  const unfocus = useSolarStore((s) => s.unfocus)
  const focusNeighbor = useSolarStore((s) => s.focusNeighbor)
  const navigateToView = useSolarStore((s) => s.navigateToView)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (useSolarStore.getState().view === 'galaxy') {
          navigateToView('solar')
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

  const hint =
    view === 'solar' && mode === 'overview'
      ? 'Pulsa sobre un planeta para explorarlo'
      : view === 'galaxy' && mode !== 'warping'
        ? 'Pulsa “Sistema Solar” para volver a tu vecindario'
        : null

  return (
    <div className="relative h-full w-full overflow-hidden bg-cosmos-deep">
      <SolarScene />

      <header className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-start justify-between px-8 py-6">
        <Navigator />
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
    </div>
  )
}

export default App
