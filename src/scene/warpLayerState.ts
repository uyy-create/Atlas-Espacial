import type { CameraMode, ViewId } from '../store/useSolarStore'
import {
  warpGalaxyScaleToGalaxy,
  warpGalaxyScaleToSolar,
  warpSolarSystemScaleToGalaxy,
  warpSolarSystemScaleToSolar,
} from './warpScaleCurves'

export interface WarpLayerMounts {
  mountSolar: boolean
  mountBlackHole: boolean
  mountGalaxy: boolean
}

export interface WarpLayerScales {
  solarScale: number
  blackHoleScale: number
  galaxyScale: number
}

/** Which scene layers should exist in the React tree (lazy load / unload). */
export function computeWarpLayerMounts(
  view: ViewId,
  mode: CameraMode,
  warpTargetView: ViewId | null,
): WarpLayerMounts {
  const warping = mode === 'warping'

  let mountSolar = view === 'solar'
  let mountBlackHole = view === 'blackHole'
  let mountGalaxy = view === 'galaxy'

  if (warping && warpTargetView === 'galaxy') {
    mountGalaxy = true
    if (view === 'solar') {
      mountSolar = true
      mountBlackHole = false
    } else if (view === 'blackHole') {
      mountSolar = false
      mountBlackHole = true
    }
  } else if (warping && warpTargetView === 'solar') {
    mountSolar = true
    mountGalaxy = true
    mountBlackHole = false
  } else if (warping && warpTargetView === 'blackHole') {
    mountBlackHole = true
    mountGalaxy = true
    mountSolar = false
  } else if (!warping) {
    if (view === 'solar') {
      mountGalaxy = false
      mountBlackHole = false
    } else if (view === 'blackHole') {
      mountGalaxy = false
      mountSolar = false
    } else {
      mountSolar = false
      mountBlackHole = false
    }
  }

  return { mountSolar, mountBlackHole, mountGalaxy }
}

/** Imperative warp scales for mounted layers (updated every frame during warp). */
export function computeWarpLayerScales(
  view: ViewId,
  mode: CameraMode,
  warpTargetView: ViewId | null,
  warpProgress: number,
): WarpLayerScales {
  let solarScale = 1
  let blackHoleScale = 1
  let galaxyScale = 1
  const warping = mode === 'warping'

  if (warping && warpTargetView === 'galaxy') {
    if (view === 'solar') {
      solarScale = warpSolarSystemScaleToGalaxy(warpProgress)
    } else if (view === 'blackHole') {
      blackHoleScale = warpSolarSystemScaleToGalaxy(warpProgress)
    }
    galaxyScale = warpGalaxyScaleToGalaxy(warpProgress)
  } else if (warping && warpTargetView === 'solar') {
    solarScale = warpSolarSystemScaleToSolar(warpProgress)
    galaxyScale = warpGalaxyScaleToSolar(warpProgress)
  } else if (warping && warpTargetView === 'blackHole') {
    blackHoleScale = warpSolarSystemScaleToSolar(warpProgress)
    galaxyScale = warpGalaxyScaleToSolar(warpProgress)
  }

  return { solarScale, blackHoleScale, galaxyScale }
}
