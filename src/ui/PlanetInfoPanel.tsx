import { AnimatePresence, motion } from 'framer-motion'
import {
  PLANETS,
  getNeighborPlanetId,
  getPlanetById,
} from '../data/planets'
import { useSolarStore } from '../store/useSolarStore'
import { BackButton } from './BackButton'

const labelMap: Record<string, string> = {
  diameter: 'Diámetro',
  gravity: 'Gravedad',
  moons: 'Lunas',
  dayLength: 'Día',
  yearLength: 'Año',
  distanceFromSun: 'Distancia al Sol',
}

export function PlanetInfoPanel() {
  const mode = useSolarStore((s) => s.mode)
  const focusedId = useSolarStore((s) => s.focusedId)
  const focusNeighbor = useSolarStore((s) => s.focusNeighbor)

  const isVisible =
    focusedId !== null && (mode === 'focusing' || mode === 'focused')

  const planet = getPlanetById(focusedId)
  const prevId = getNeighborPlanetId(focusedId, -1)
  const nextId = getNeighborPlanetId(focusedId, 1)
  const prevPlanet = getPlanetById(prevId)
  const nextPlanet = getPlanetById(nextId)
  const planetIndex = focusedId
    ? PLANETS.findIndex((p) => p.id === focusedId)
    : -1

  return (
    <AnimatePresence mode="wait">
      {isVisible && planet && (
        <motion.aside
          key={planet.id}
          initial={{ x: 480, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 480, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto absolute right-0 top-0 z-10 flex h-full w-full max-w-[440px] flex-col border-l border-white/10 bg-cosmos-panel p-8 backdrop-blur-xl md:max-w-[480px]"
        >
          <div className="flex items-center justify-between">
            <BackButton />
            <span className="font-display text-[11px] uppercase tracking-[0.35em] text-white/40">
              {String(planetIndex + 1).padStart(2, '0')} / {String(PLANETS.length).padStart(2, '0')}
            </span>
          </div>

          <div className="mt-8 flex-1 overflow-y-auto pr-1">
            <p className="font-display text-xs uppercase tracking-[0.4em] text-cosmos-accent/80">
              Planeta
            </p>
            <h1 className="mt-2 font-display text-6xl font-bold text-white">
              {planet.name}
            </h1>

            <p className="mt-6 text-sm leading-relaxed text-white/70">
              {planet.description}
            </p>

            <div className="mt-10">
              <h2 className="font-display text-xs uppercase tracking-[0.35em] text-white/50">
                Datos clave
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
                {(Object.keys(planet.facts) as Array<keyof typeof planet.facts>).map(
                  (key) => (
                    <div key={key as string}>
                      <dt className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                        {labelMap[key as string] ?? (key as string)}
                      </dt>
                      <dd className="mt-1 font-display text-lg font-medium text-white">
                        {String(planet.facts[key])}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            </div>

            {planet.moons && planet.moons.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-xs uppercase tracking-[0.35em] text-white/50">
                  Lunas destacadas
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {planet.moons.map((moon) => (
                    <li
                      key={moon.id}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80"
                    >
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: moon.color }}
                      />
                      {moon.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <nav className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => focusNeighbor(-1)}
              className="group flex flex-1 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-white/30 hover:bg-white/[0.07]"
            >
              <ChevronIcon direction="left" />
              <span className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Anterior
                </span>
                <span className="font-display text-sm font-medium text-white/90">
                  {prevPlanet?.name ?? '—'}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => focusNeighbor(1)}
              className="group flex flex-1 items-center justify-end gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-right transition hover:border-white/30 hover:bg-white/[0.07]"
            >
              <span className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Siguiente
                </span>
                <span className="font-display text-sm font-medium text-white/90">
                  {nextPlanet?.name ?? '—'}
                </span>
              </span>
              <ChevronIcon direction="right" />
            </button>
          </nav>

          <p className="mt-4 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.3em] text-white/35">
            <KeyHint label="←" />
            <KeyHint label="→" />
            <span>navegar</span>
            <span aria-hidden className="text-white/20">·</span>
            <KeyHint label="Esc" />
            <span>salir</span>
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`h-4 w-4 text-white/60 transition ${
        direction === 'left'
          ? 'group-hover:-translate-x-0.5'
          : 'group-hover:translate-x-0.5'
      }`}
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

function KeyHint({ label }: { label: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-white/15 bg-white/[0.05] px-1 font-mono text-[10px] text-white/70">
      {label}
    </kbd>
  )
}
