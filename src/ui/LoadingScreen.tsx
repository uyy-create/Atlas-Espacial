import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useProgress } from '@react-three/drei'
import { useSolarStore } from '../store/useSolarStore'

/**
 * Minimum time the intro stays up. `useProgress` starts at 0 / inactive
 * before the first texture request fires, so without this floor the screen
 * could declare itself ready before anything has loaded; it also stops the
 * intro from flashing by on a warm cache.
 */
const MIN_VISIBLE_MS = 900

export function LoadingScreen() {
  const entered = useSolarStore((s) => s.entered)
  const enter = useSolarStore((s) => s.enter)
  const active = useProgress((s) => s.active)
  const progress = useProgress((s) => s.progress)
  const errors = useProgress((s) => s.errors)

  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setMinTimeElapsed(true), MIN_VISIBLE_MS)
    return () => window.clearTimeout(id)
  }, [])

  const ready = minTimeElapsed && !active
  const shownProgress = ready ? 100 : Math.round(progress)

  useEffect(() => {
    if (!ready || entered) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        enter()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [ready, entered, enter])

  return (
    <AnimatePresence>
      {!entered && (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-cosmos-deep px-6 text-center"
          role="dialog"
          aria-label="Cargando el atlas"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(155,176,255,0.10),transparent_60%)]"
          />

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-[11px] uppercase tracking-[0.5em] text-cosmos-accent/80"
          >
            Bienvenido a
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25 }}
            className="mt-4 font-display text-5xl font-bold tracking-tight text-white md:text-7xl"
          >
            Atlas Espacial
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            className="mt-4 text-sm text-white/55"
          >
            Sistema Solar · Vía Láctea · Agujero negro
          </motion.p>

          <div className="mt-14 w-full max-w-[280px]">
            <div className="h-px w-full overflow-hidden bg-white/10">
              <motion.div
                className="h-full bg-cosmos-accent"
                initial={{ width: '0%' }}
                animate={{ width: `${shownProgress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between font-display text-[10px] uppercase tracking-[0.35em] text-white/40">
              <span>{ready ? 'Listo' : 'Cargando texturas'}</span>
              <span className="tabular-nums">{shownProgress}%</span>
            </div>
            {errors.length > 0 && (
              <p className="mt-3 text-[11px] text-red-300/80">
                No se pudieron cargar {errors.length} recurso(s); la escena se
                mostrará igualmente.
              </p>
            )}
          </div>

          <div className="mt-10 h-14">
            <AnimatePresence>
              {ready && (
                <motion.button
                  key="enter"
                  type="button"
                  onClick={enter}
                  autoFocus
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="group inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/[0.04] px-8 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cosmos-accent/70"
                >
                  Entrar
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 4 4 4-4 4" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
