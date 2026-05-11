import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PLANETS } from '../data/planets'
import { useSolarStore } from '../store/useSolarStore'
import { SOLAR_SYSTEM_GALAXY_MARKER } from './galaxyMarkers'
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

const pivotArr: [number, number, number] = [
  SOLAR_SYSTEM_GALAXY_MARKER.x,
  SOLAR_SYSTEM_GALAXY_MARKER.y,
  SOLAR_SYSTEM_GALAXY_MARKER.z,
]

const negPivotArr: [number, number, number] = [
  -SOLAR_SYSTEM_GALAXY_MARKER.x,
  -SOLAR_SYSTEM_GALAXY_MARKER.y,
  -SOLAR_SYSTEM_GALAXY_MARKER.z,
]

export function WarpSceneLayers() {
  const solarWrapRef = useRef<THREE.Group>(null)
  const galaxyScaleRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const { mode, view, warpTargetView, warpProgress } = useSolarStore.getState()
    const warping = mode === 'warping'

    let solarScale = 1
    let galaxyScale = 1
    let showSolar = view === 'solar'
    let showGalaxy = view === 'galaxy'

    if (warping && warpTargetView === 'galaxy') {
      showSolar = true
      showGalaxy = true
      solarScale = warpSolarSystemScaleToGalaxy(warpProgress)
      galaxyScale = warpGalaxyScaleToGalaxy(warpProgress)
    } else if (warping && warpTargetView === 'solar') {
      showSolar = true
      showGalaxy = true
      solarScale = warpSolarSystemScaleToSolar(warpProgress)
      galaxyScale = warpGalaxyScaleToSolar(warpProgress)
    } else if (!warping) {
      if (view === 'solar') {
        showGalaxy = false
        solarScale = 1
      } else {
        showSolar = false
        galaxyScale = 1
      }
    }

    if (solarWrapRef.current) {
      solarWrapRef.current.visible = showSolar
      solarWrapRef.current.scale.setScalar(solarScale)
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

      <group position={pivotArr}>
        <group ref={galaxyScaleRef}>
          <group position={negPivotArr}>
            <GalaxyScene />
          </group>
        </group>
      </group>
    </>
  )
}
