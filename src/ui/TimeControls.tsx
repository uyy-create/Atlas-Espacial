import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  EPHEMERIS_MAX_JD,
  EPHEMERIS_MIN_JD,
  julianDayToDate,
} from '../simulation/ephemeris'
import { useSolarStore } from '../store/useSolarStore'
import { TIME_SPEEDS, useTimeStore } from '../store/useTimeStore'
import { useTourStore } from '../store/useTourStore'

const DATE_POLL_MS = 250
const toInputValue = (d: Date) => d.toISOString().slice(0, 10)

/** Validity range of the mean orbital elements. */
const MIN_DATE = toInputValue(julianDayToDate(EPHEMERIS_MIN_JD))
const MAX_DATE = toInputValue(julianDayToDate(EPHEMERIS_MAX_JD))

const isTypingTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON'
}

export function TimeControls() {
  const inSolarView = useSolarStore(
    (s) => s.entered && s.view === 'solar' && s.mode !== 'warping',
  )
  // The tour card takes this corner while it runs.
  const tourActive = useTourStore((s) => s.active)
  const visible = inSolarView && !tourActive
  const paused = useTimeStore((s) => s.paused)
  const speedId = useTimeStore((s) => s.speedId)
  const togglePaused = useTimeStore((s) => s.togglePaused)
  const setPaused = useTimeStore((s) => s.setPaused)
  const setSpeed = useTimeStore((s) => s.setSpeed)
  const setDate = useTimeStore((s) => s.setDate)
  const resetToNow = useTimeStore((s) => s.resetToNow)

  const dateInputRef = useRef<HTMLInputElement>(null)
  // While the picker is open we stop mirroring the running clock into the
  // input, otherwise the field changes under the visitor's hands.
  const [editing, setEditing] = useState(false)

  // The clock is mutated per frame outside React; sample it a few times a
  // second for the field rather than re-rendering on every frame.
  const [dateValue, setDateValue] = useState(() =>
    toInputValue(julianDayToDate(useTimeStore.getState().clock.julianDay)),
  )
  useEffect(() => {
    if (editing) return
    const read = () =>
      setDateValue(
        toInputValue(julianDayToDate(useTimeStore.getState().clock.julianDay)),
      )
    read()
    const id = window.setInterval(read, DATE_POLL_MS)
    return () => window.clearInterval(id)
  }, [editing])

  useEffect(() => {
    if (!visible) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' || isTypingTarget(e.target)) return
      e.preventDefault()
      togglePaused()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible, togglePaused])

  const handleDateChange = (value: string) => {
    setDateValue(value)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
    const date = new Date(`${value}T12:00:00Z`)
    if (Number.isNaN(date.getTime())) return
    // Jumping to a date is a request to look at it: hold there.
    setDate(date)
    setPaused(true)
  }

  const openPicker = () => {
    const input = dateInputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
        return
      } catch {
        // Not allowed (no user gesture, unsupported): fall back to focus.
      }
    }
    input.focus()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="time"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="pointer-events-auto absolute bottom-8 left-8 z-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-2 pr-4 backdrop-blur-md"
          role="group"
          aria-label="Control del tiempo"
        >
          <button
            type="button"
            onClick={togglePaused}
            aria-label={paused ? 'Reanudar' : 'Pausar'}
            aria-pressed={paused}
            title={`${paused ? 'Reanudar' : 'Pausar'} (Espacio)`}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white/85 transition hover:border-white/35 hover:bg-white/10"
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </button>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 rounded-md border border-transparent px-1 transition hover:border-white/15">
                <span className="sr-only">Fecha simulada</span>
                <button
                  type="button"
                  onClick={openPicker}
                  aria-label="Elegir fecha"
                  title="Elegir fecha"
                  className="text-white/50 transition hover:text-white"
                >
                  <CalendarIcon />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={dateValue}
                  min={MIN_DATE}
                  max={MAX_DATE}
                  onChange={(e) => handleDateChange(e.target.value)}
                  onFocus={() => setEditing(true)}
                  onBlur={() => setEditing(false)}
                  className="w-[7.5rem] bg-transparent font-display text-sm font-semibold tabular-nums text-white outline-none [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-cosmos-accent/60 [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </label>
              {paused && dateValue === MAX_DATE && (
                <span className="text-[10px] uppercase tracking-[0.2em] text-cosmos-glow/80">
                  Fin de las efemérides
                </span>
              )}
              <button
                type="button"
                onClick={resetToNow}
                className="rounded-full border border-white/10 px-2.5 py-0.5 font-display text-[10px] uppercase tracking-[0.25em] text-white/60 transition hover:border-white/30 hover:text-white"
              >
                Hoy
              </button>
            </div>
            <div
              className="flex items-center gap-1"
              role="radiogroup"
              aria-label="Velocidad"
            >
              {TIME_SPEEDS.map((speed) => {
                const active = speed.id === speedId
                return (
                  <button
                    key={speed.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSpeed(speed.id)}
                    className={`rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] transition ${
                      active
                        ? 'bg-white/[0.12] text-white'
                        : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80'
                    }`}
                  >
                    {speed.label}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PauseIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <rect x="3" y="2.5" width="3.5" height="11" rx="0.8" />
      <rect x="9.5" y="2.5" width="3.5" height="11" rx="0.8" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <path d="M4 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L4.9 2.3a.6.6 0 0 0-.9.5z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
    </svg>
  )
}
