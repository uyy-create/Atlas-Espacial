import { AnimatePresence, motion } from 'framer-motion'
import { useSolarStore } from '../store/useSolarStore'
import { useTourStore } from '../store/useTourStore'
import { TOUR_STEPS } from '../tour/tourSteps'

/** Header button that starts the tour; hidden while it runs. */
export function TourButton() {
  const entered = useSolarStore((s) => s.entered)
  const active = useTourStore((s) => s.active)
  const start = useTourStore((s) => s.start)

  return (
    <AnimatePresence>
      {entered && !active && (
        <motion.button
          key="tour-button"
          type="button"
          onClick={start}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left backdrop-blur-md transition hover:border-white/30 hover:bg-black/55"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white/80">
            <PlayIcon />
          </span>
          <span className="flex flex-col">
            <span className="font-display text-[10px] uppercase tracking-[0.4em] text-white/50">
              Recorrido
            </span>
            <span className="font-display text-base font-semibold text-white">
              Tour guiado
            </span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/** Caption card for the current step, with progress and controls. */
export function TourOverlay() {
  const active = useTourStore((s) => s.active)
  const stepIndex = useTourStore((s) => s.stepIndex)
  const settled = useTourStore((s) => s.settled)
  const next = useTourStore((s) => s.next)
  const prev = useTourStore((s) => s.prev)
  const stop = useTourStore((s) => s.stop)

  const step = TOUR_STEPS[stepIndex]
  const isLast = stepIndex === TOUR_STEPS.length - 1

  return (
    <AnimatePresence mode="wait">
      {active && step && (
        <motion.section
          key={step.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto absolute bottom-8 left-8 z-10 w-[min(420px,calc(100vw-4rem))] overflow-hidden rounded-2xl border border-white/10 bg-black/55 backdrop-blur-xl"
          aria-live="polite"
          aria-label="Tour guiado"
        >
          <div className="p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-[10px] uppercase tracking-[0.4em] text-cosmos-accent/80">
                Tour guiado · {String(stepIndex + 1).padStart(2, '0')} /{' '}
                {String(TOUR_STEPS.length).padStart(2, '0')}
              </p>
              <button
                type="button"
                onClick={stop}
                aria-label="Terminar el tour"
                title="Terminar (Esc)"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>
            <h2 className="mt-2 font-display text-xl font-bold text-white">
              {step.title}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">
              {step.text}
            </p>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={prev}
                disabled={stepIndex === 0}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronIcon direction="left" />
                Anterior
              </button>
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-white transition hover:border-white/40 hover:bg-white/10"
              >
                {isLast ? 'Terminar' : 'Siguiente'}
                <ChevronIcon direction="right" />
              </button>
            </div>
          </div>

          {/* Time left on this step; only counts once the camera has settled. */}
          <div className="h-0.5 w-full bg-white/10">
            <motion.div
              key={`${step.id}-${settled ? 'run' : 'wait'}`}
              className="h-full bg-cosmos-accent/80"
              initial={{ width: '0%' }}
              animate={{ width: settled ? '100%' : '0%' }}
              transition={
                settled
                  ? { duration: step.duration, ease: 'linear' }
                  : { duration: 0 }
              }
            />
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}

function PlayIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <path d="M4 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L4.9 2.3a.6.6 0 0 0-.9.5z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === 'left' ? (
        <path d="M10 12 6 8l4-4" />
      ) : (
        <path d="m6 4 4 4-4 4" />
      )}
    </svg>
  )
}
