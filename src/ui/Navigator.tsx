import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  VIEWS,
  getViewById,
  useSolarStore,
  type ViewId,
} from '../store/useSolarStore'

export function Navigator() {
  const view = useSolarStore((s) => s.view)
  const mode = useSolarStore((s) => s.mode)
  const navigateToView = useSolarStore((s) => s.navigateToView)

  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const current = getViewById(view)
  const isWarping = mode === 'warping'

  useEffect(() => {
    if (!open) return

    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [open])

  useEffect(() => {
    if (isWarping) setOpen(false)
  }, [isWarping])

  const handleSelect = (id: ViewId) => {
    setOpen(false)
    if (id === view) return
    navigateToView(id)
  }

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-auto relative inline-block text-left"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={isWarping}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 px-5 py-3 text-left backdrop-blur-md transition hover:border-white/30 hover:bg-black/55 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white/80">
          <CompassIcon spinning={isWarping} />
        </span>
        <span className="flex flex-col">
          <span className="font-display text-[10px] uppercase tracking-[0.4em] text-white/50">
            Navigator
          </span>
          <span className="font-display text-base font-semibold text-white">
            {isWarping ? 'Saltando…' : current.name}
          </span>
        </span>
        <ChevronIcon open={open} />
      </button>

      <AnimatePresence>
        {open && !isWarping && (
          <motion.ul
            key="menu"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute left-0 top-[calc(100%+10px)] w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-black/65 p-2 backdrop-blur-xl shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)]"
          >
            {VIEWS.map((option) => {
              const active = option.id === view
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => handleSelect(option.id)}
                    disabled={active}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      active
                        ? 'cursor-default bg-white/[0.08]'
                        : 'hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="flex flex-col">
                      <span
                        className={`font-display text-sm font-medium ${
                          active ? 'text-white' : 'text-white/90'
                        }`}
                      >
                        {option.name}
                      </span>
                      <span className="text-[11px] tracking-wide text-white/45">
                        {option.subtitle}
                      </span>
                    </span>
                    {active ? (
                      <span className="font-display text-[10px] uppercase tracking-[0.3em] text-cosmos-accent">
                        Aquí
                      </span>
                    ) : (
                      <ArrowIcon />
                    )}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function CompassIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-2.5 5-5 2.5 2.5-5 5-2.5z" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 text-white/60 transition ${
        open ? 'rotate-180' : ''
      }`}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-white/40"
    >
      <path d="m6 4 4 4-4 4" />
    </svg>
  )
}
