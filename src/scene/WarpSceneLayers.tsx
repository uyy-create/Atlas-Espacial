import { Suspense, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PLANETS } from '../data/planets'
import { useSolarStore, type ViewId } from '../store/useSolarStore'
import {
  BLACK_HOLE_SYSTEM_GALAXY_MARKER,
  SOLAR_SYSTEM_GALAXY_MARKER,
} from './galaxyMarkers'
import { BlackHoleScene } from './BlackHoleScene'
import { GalaxyScene } from './GalaxyScene'
import { Orbit } from './Orbit'
import { Planet } from './Planet'
import { Sun } from './Sun'
import {
  computeWarpLayerMounts,
  computeWarpLayerScales,
} from './warpLayerState'

function SolarBodies() {
  return (
    <>
      <Sun />
      {PLANETS.map((p) => (
        <Orbit key={`o-${p.id}`} radius={p.orbitRadius} planetId={p.id} />
      ))}
      {PLANETS.map((p) => (
        <Planet key={p.id} def={p} />
      ))}
    </>
  )
}

function resolveGalaxyPivot(
  mode: string,
  view: ViewId,
  warpTargetView: ViewId | null,
): THREE.Vector3 {
  if (mode === 'warping' && warpTargetView === 'galaxy') {
    return view === 'blackHole'
      ? BLACK_HOLE_SYSTEM_GALAXY_MARKER
      : SOLAR_SYSTEM_GALAXY_MARKER
  }
  if (mode === 'warping' && warpTargetView === 'solar') {
    return SOLAR_SYSTEM_GALAXY_MARKER
  }
  if (mode === 'warping' && warpTargetView === 'blackHole') {
    return BLACK_HOLE_SYSTEM_GALAXY_MARKER
  }
  if (view === 'blackHole') return BLACK_HOLE_SYSTEM_GALAXY_MARKER
  return SOLAR_SYSTEM_GALAXY_MARKER
}

export function WarpSceneLayers() {
  const view = useSolarStore((s) => s.view)
  const mode = useSolarStore((s) => s.mode)
  const warpTargetView = useSolarStore((s) => s.warpTargetView)
  const { mountSolar, mountBlackHole, mountGalaxy } = computeWarpLayerMounts(
    view,
    mode,
    warpTargetView,
  )

  const solarWrapRef = useRef<THREE.Group>(null)
  const blackHoleWrapRef = useRef<THREE.Group>(null)
  const galaxyScaleRef = useRef<THREE.Group>(null)
  const galaxyPivotOuterRef = useRef<THREE.Group>(null)
  const galaxyInnerNegRef = useRef<THREE.Group>(null)
  const pivotScratch = useRef(new THREE.Vector3())

  useFrame(() => {
    const state = useSolarStore.getState()
    const { mountSolar: showSolar, mountBlackHole: showBlackHole, mountGalaxy: showGalaxy } =
      computeWarpLayerMounts(state.view, state.mode, state.warpTargetView)
    const { solarScale, blackHoleScale, galaxyScale } = computeWarpLayerScales(
      state.view,
      state.mode,
      state.warpTargetView,
      state.warpProgress,
    )

    const pivot = resolveGalaxyPivot(
      state.mode,
      state.view,
      state.warpTargetView,
    )
    pivotScratch.current.copy(pivot)
    if (showGalaxy && galaxyPivotOuterRef.current) {
      galaxyPivotOuterRef.current.position.copy(pivotScratch.current)
    }
    if (showGalaxy && galaxyInnerNegRef.current) {
      galaxyInnerNegRef.current.position.set(
        -pivotScratch.current.x,
        -pivotScratch.current.y,
        -pivotScratch.current.z,
      )
    }

    if (showSolar && solarWrapRef.current) {
      solarWrapRef.current.scale.setScalar(solarScale)
    }
    if (showBlackHole && blackHoleWrapRef.current) {
      blackHoleWrapRef.current.scale.setScalar(blackHoleScale)
    }
    if (showGalaxy && galaxyScaleRef.current) {
      galaxyScaleRef.current.scale.setScalar(galaxyScale)
    }
  })

  return (
    <>
      {mountSolar && (
        <group ref={solarWrapRef}>
          <Suspense fallback={null}>
            <SolarBodies />
          </Suspense>
        </group>
      )}

      {mountBlackHole && (
        <group ref={blackHoleWrapRef}>
          <Suspense fallback={null}>
            <BlackHoleScene />
          </Suspense>
        </group>
      )}

      {mountGalaxy && (
        <group ref={galaxyPivotOuterRef}>
          <group ref={galaxyScaleRef}>
            <group ref={galaxyInnerNegRef}>
              <Suspense fallback={null}>
                <GalaxyScene />
              </Suspense>
            </group>
          </group>
        </group>
      )}
    </>
  )
}
