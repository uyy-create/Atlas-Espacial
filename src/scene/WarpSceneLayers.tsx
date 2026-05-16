import { useRef } from 'react'
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
  warpGalaxyScaleToGalaxy,
  warpGalaxyScaleToSolar,
  warpSolarSystemScaleToGalaxy,
  warpSolarSystemScaleToSolar,
} from './warpScaleCurves'

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
  const solarWrapRef = useRef<THREE.Group>(null)
  const blackHoleWrapRef = useRef<THREE.Group>(null)
  const galaxyScaleRef = useRef<THREE.Group>(null)
  const galaxyPivotOuterRef = useRef<THREE.Group>(null)
  const galaxyInnerNegRef = useRef<THREE.Group>(null)
  const pivotScratch = useRef(new THREE.Vector3())

  useFrame(() => {
    const { mode, view, warpTargetView, warpProgress } = useSolarStore.getState()
    const warping = mode === 'warping'

    const pivot = resolveGalaxyPivot(mode, view, warpTargetView)
    pivotScratch.current.copy(pivot)
    if (galaxyPivotOuterRef.current) {
      galaxyPivotOuterRef.current.position.copy(pivotScratch.current)
    }
    if (galaxyInnerNegRef.current) {
      galaxyInnerNegRef.current.position.set(
        -pivotScratch.current.x,
        -pivotScratch.current.y,
        -pivotScratch.current.z,
      )
    }

    let solarScale = 1
    let blackHoleScale = 1
    let galaxyScale = 1
    let showSolar = view === 'solar'
    let showBlackHole = view === 'blackHole'
    let showGalaxy = view === 'galaxy'

    if (warping && warpTargetView === 'galaxy') {
      showGalaxy = true
      if (view === 'solar') {
        showSolar = true
        showBlackHole = false
        solarScale = warpSolarSystemScaleToGalaxy(warpProgress)
      } else if (view === 'blackHole') {
        showSolar = false
        showBlackHole = true
        blackHoleScale = warpSolarSystemScaleToGalaxy(warpProgress)
      }
      galaxyScale = warpGalaxyScaleToGalaxy(warpProgress)
    } else if (warping && warpTargetView === 'solar') {
      showSolar = true
      showGalaxy = true
      showBlackHole = false
      solarScale = warpSolarSystemScaleToSolar(warpProgress)
      galaxyScale = warpGalaxyScaleToSolar(warpProgress)
    } else if (warping && warpTargetView === 'blackHole') {
      showBlackHole = true
      showGalaxy = true
      showSolar = false
      blackHoleScale = warpSolarSystemScaleToSolar(warpProgress)
      galaxyScale = warpGalaxyScaleToSolar(warpProgress)
    } else if (!warping) {
      if (view === 'solar') {
        showGalaxy = false
        showBlackHole = false
        solarScale = 1
      } else if (view === 'blackHole') {
        showGalaxy = false
        showSolar = false
        blackHoleScale = 1
      } else {
        showSolar = false
        showBlackHole = false
        galaxyScale = 1
      }
    }

    if (solarWrapRef.current) {
      solarWrapRef.current.visible = showSolar
      solarWrapRef.current.scale.setScalar(solarScale)
    }
    if (blackHoleWrapRef.current) {
      blackHoleWrapRef.current.visible = showBlackHole
      blackHoleWrapRef.current.scale.setScalar(blackHoleScale)
    }
    if (galaxyScaleRef.current) {
      galaxyScaleRef.current.visible = showGalaxy
      galaxyScaleRef.current.scale.setScalar(galaxyScale)
    }
  })

  return (
    <>
      <group ref={solarWrapRef}>
        <SolarBodies />
      </group>

      <group ref={blackHoleWrapRef}>
        <BlackHoleScene />
      </group>

      <group ref={galaxyPivotOuterRef}>
        <group ref={galaxyScaleRef}>
          <group ref={galaxyInnerNegRef}>
            <GalaxyScene />
          </group>
        </group>
      </group>
    </>
  )
}
