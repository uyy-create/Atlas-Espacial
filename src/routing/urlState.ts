import { getBodyById } from '../data/planets'
import { VIEWS, type ViewId } from '../store/useSolarStore'

/**
 * Shareable URL state. Read once at boot and written (replaceState, no
 * history entries) whenever it changes:
 *
 *   ?view=galaxy
 *   ?view=solar&planet=mars          (a moon id works too: planet=titan)
 *   ?planet=jupiter&date=2030-06-15   (starts paused on that date)
 *
 * `date` is only present while the simulation is paused, so a copied link
 * always reproduces what is on screen.
 */
export interface UrlState {
  view: ViewId
  planetId: string | null
  date: Date | null
}

const VIEW_PARAM = 'view'
const PLANET_PARAM = 'planet'
const DATE_PARAM = 'date'

const isViewId = (value: string | null): value is ViewId =>
  value !== null && VIEWS.some((v) => v.id === value)

const parseDate = (value: string | null): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function readUrlState(search: string): UrlState {
  const params = new URLSearchParams(search)
  const body = getBodyById(params.get(PLANET_PARAM))
  const planetId = body ? (body.kind === 'moon' ? body.moon.id : body.planet.id) : null
  const viewParam = params.get(VIEW_PARAM)
  // A planet implies the solar view, whatever `view` says.
  const view: ViewId = planetId
    ? 'solar'
    : isViewId(viewParam)
      ? viewParam
      : 'solar'
  return { view, planetId, date: parseDate(params.get(DATE_PARAM)) }
}

const formatDate = (date: Date) => date.toISOString().slice(0, 10)

export function writeUrlState(state: UrlState) {
  const url = new URL(window.location.href)
  const params = url.searchParams
  if (state.view === 'solar') params.delete(VIEW_PARAM)
  else params.set(VIEW_PARAM, state.view)
  if (state.planetId && state.view === 'solar') {
    params.set(PLANET_PARAM, state.planetId)
  } else {
    params.delete(PLANET_PARAM)
  }
  if (state.date && state.view === 'solar') {
    params.set(DATE_PARAM, formatDate(state.date))
  } else {
    params.delete(DATE_PARAM)
  }
  const query = params.size ? `?${params}` : ''
  const next = `${url.pathname}${query}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next !== current) window.history.replaceState(null, '', next)
}
