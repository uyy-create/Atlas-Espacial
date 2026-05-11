import { create } from 'zustand'
import * as THREE from 'three'
import { getNeighborPlanetId } from '../data/planets'

export type CameraMode =
  | 'overview'
  | 'focusing'
  | 'focused'
  | 'returning'
  | 'warping'

export type ViewId = 'solar' | 'galaxy'

export interface ViewOption {
  id: ViewId
  name: string
  subtitle: string
}

export const VIEWS: ViewOption[] = [
  {
    id: 'solar',
    name: 'Sistema Solar',
    subtitle: 'Tu vecindario estelar',
  },
  {
    id: 'galaxy',
    name: 'Vía Láctea',
    subtitle: 'Vista desde el exterior',
  },
]

export const getViewById = (id: ViewId): ViewOption =>
  VIEWS.find((v) => v.id === id) ?? VIEWS[0]

interface SolarState {
  mode: CameraMode
  focusedId: string | null
  /**
   * Live world position of every planet. Planets register their group ref
   * here so the camera rig can follow a moving target without prop drilling.
   */
  planetPositions: Record<string, THREE.Vector3>
  hoveredId: string | null

  view: ViewId
  warpTargetView: ViewId | null
  /** 0..1 progress of the active warp transition. */
  warpProgress: number

  focus: (id: string) => void
  focusNeighbor: (direction: 1 | -1) => void
  unfocus: () => void
  setMode: (mode: CameraMode) => void
  completeReturn: () => void
  registerPlanetPosition: (id: string, position: THREE.Vector3) => void
  setHovered: (id: string | null) => void

  navigateToView: (id: ViewId) => void
  setWarpProgress: (progress: number) => void
  /** Called by the warp controller mid-flight to commit the view swap. */
  commitWarpView: () => void
  /** Called when the warp finishes settling. */
  completeWarp: () => void
}

export const useSolarStore = create<SolarState>((set, get) => ({
  mode: 'overview',
  focusedId: null,
  planetPositions: {},
  hoveredId: null,

  view: 'solar',
  warpTargetView: null,
  warpProgress: 0,

  focus: (id) => {
    if (get().mode === 'warping') return
    if (get().focusedId === id && get().mode === 'focused') return
    set({ focusedId: id, mode: 'focusing' })
  },

  focusNeighbor: (direction) => {
    if (get().mode === 'warping') return
    const { focusedId } = get()
    const next = getNeighborPlanetId(focusedId, direction)
    if (!next || next === focusedId) return
    set({ focusedId: next, mode: 'focusing' })
  },

  unfocus: () => {
    if (get().mode === 'warping') return
    if (!get().focusedId) return
    set({ mode: 'returning' })
  },

  setMode: (mode) => set({ mode }),

  completeReturn: () => set({ mode: 'overview', focusedId: null }),

  registerPlanetPosition: (id, position) =>
    set((state) => ({
      planetPositions: { ...state.planetPositions, [id]: position },
    })),

  setHovered: (id) => set({ hoveredId: id }),

  navigateToView: (id) => {
    const { view, mode } = get()
    if (mode === 'warping') return
    if (id === view) return
    set({
      warpTargetView: id,
      warpProgress: 0,
      mode: 'warping',
      focusedId: null,
      hoveredId: null,
    })
  },

  setWarpProgress: (progress) =>
    set({ warpProgress: Math.max(0, Math.min(1, progress)) }),

  commitWarpView: () => {
    const { warpTargetView, view } = get()
    if (!warpTargetView || warpTargetView === view) return
    set({ view: warpTargetView })
  },

  completeWarp: () =>
    set({
      mode: 'overview',
      warpTargetView: null,
      warpProgress: 0,
    }),
}))
