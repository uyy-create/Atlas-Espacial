import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useSolarStore } from '../../store/useSolarStore'
import {
  BLACK_HOLE_MARKER_POSITION_TUPLE,
  SOLAR_MARKER_POSITION_TUPLE,
} from './galaxyMarkers'
import { MilkyWay } from './MilkyWay'
import {
  warpGalaxyOpacityToGalaxy,
  warpGalaxyOpacityToSolar,
} from '../../transitions/warp/warpScaleCurves'

function SolarSystemMarker() {
  const navigateToView = useSolarStore((s) => s.navigateToView)
  const mode = useSolarStore((s) => s.mode)
  /** Drei `Html` is portaled to the DOM; unmount when not in stable galaxy view so it never shows over the solar scene. */
  const showMarkerUi = useSolarStore(
    (s) => s.view === 'galaxy' && s.mode !== 'warping',
  )
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const expanded = hovered || focused

  useEffect(() => {
    document.body.style.cursor = expanded && showMarkerUi ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [expanded, showMarkerUi])

  const goSolar = () => {
    if (mode === 'warping') return
    navigateToView('solar')
  }

  if (!showMarkerUi) {
    return null
  }

  return (
    <group position={SOLAR_MARKER_POSITION_TUPLE}>
      <Html center distanceFactor={38} style={{ pointerEvents: 'auto' }}>
        <button
          type="button"
          tabIndex={0}
          aria-label="Ir al sistema solar"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation()
            goSolar()
          }}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              goSolar()
            }
          }}
          className={[
            'relative flex cursor-pointer select-none items-center justify-center overflow-hidden font-display outline-none',
            'rounded-full border transition-[width,min-width,height,padding,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)]',
            'focus-visible:ring-[3px] focus-visible:ring-cosmos-accent/80 focus-visible:ring-offset-[3px] focus-visible:ring-offset-[#050814]',
            expanded
              ? 'h-[4.25rem] min-w-[min(22rem,calc(100vw-2rem))] border-white/35 bg-black px-10 shadow-[0_12px_40px_rgba(0,0,0,0.65)]'
              : 'h-12 w-12 min-w-[3rem] border-white/25 bg-transparent px-0 shadow-none',
          ].join(' ')}
        >
          <span
            className={[
              'pointer-events-none shrink-0 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9),0_0_24px_rgba(200,220,255,0.3)] transition-opacity duration-300 ease-out',
              expanded ? 'hidden' : 'block h-3.5 w-3.5 opacity-100',
            ].join(' ')}
            aria-hidden
          />
          <span
            className={[
              'pointer-events-none whitespace-nowrap text-center font-semibold uppercase tracking-[0.14em] text-white transition-[opacity,max-width] duration-300 ease-out',
              expanded
                ? 'max-w-[min(20rem,calc(100vw-4rem))] px-1 text-[clamp(1.25rem,2vw,1.75rem)] opacity-100'
                : 'hidden',
            ].join(' ')}
          >
            Sistema Solar
          </span>
        </button>
      </Html>
    </group>
  )
}

function BlackHoleMarker() {
  const navigateToView = useSolarStore((s) => s.navigateToView)
  const mode = useSolarStore((s) => s.mode)
  const showMarkerUi = useSolarStore(
    (s) => s.view === 'galaxy' && s.mode !== 'warping',
  )
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const expanded = hovered || focused

  useEffect(() => {
    document.body.style.cursor = expanded && showMarkerUi ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [expanded, showMarkerUi])

  const goBlackHole = () => {
    if (mode === 'warping') return
    navigateToView('blackHole')
  }

  if (!showMarkerUi) {
    return null
  }

  return (
    <group position={BLACK_HOLE_MARKER_POSITION_TUPLE}>
      <Html center distanceFactor={38} style={{ pointerEvents: 'auto' }}>
        <button
          type="button"
          tabIndex={0}
          aria-label="Ir al agujero negro"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation()
            goBlackHole()
          }}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              goBlackHole()
            }
          }}
          className={[
            'relative flex cursor-pointer select-none items-center justify-center overflow-hidden font-display outline-none',
            'rounded-full border transition-[width,min-width,height,padding,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)]',
            'focus-visible:ring-[3px] focus-visible:ring-cosmos-accent/80 focus-visible:ring-offset-[3px] focus-visible:ring-offset-[#050814]',
            expanded
              ? 'h-[4.25rem] min-w-[min(22rem,calc(100vw-2rem))] border-white/35 bg-black px-10 shadow-[0_12px_40px_rgba(0,0,0,0.65)]'
              : 'h-12 w-12 min-w-[3rem] border-white/25 bg-transparent px-0 shadow-none',
          ].join(' ')}
        >
          <span
            className={[
              'pointer-events-none shrink-0 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9),0_0_24px_rgba(200,220,255,0.3)] transition-opacity duration-300 ease-out',
              expanded ? 'hidden' : 'block h-3.5 w-3.5 opacity-100',
            ].join(' ')}
            aria-hidden
          />
          <span
            className={[
              'pointer-events-none whitespace-nowrap text-center font-semibold uppercase tracking-[0.14em] text-white transition-[opacity,max-width] duration-300 ease-out',
              expanded
                ? 'max-w-[min(20rem,calc(100vw-4rem))] px-1 text-[clamp(1.25rem,2vw,1.75rem)] opacity-100'
                : 'hidden',
            ].join(' ')}
          >
            Agujero negro
          </span>
        </button>
      </Html>
    </group>
  )
}

export function GalaxyScene() {
  const milkyOpacityRef = useRef(1)

  useFrame(() => {
    const { mode, view, warpTargetView, warpProgress } = useSolarStore.getState()
    if (mode !== 'warping') {
      milkyOpacityRef.current = view === 'galaxy' ? 1 : 0
    } else if (warpTargetView === 'galaxy') {
      milkyOpacityRef.current = warpGalaxyOpacityToGalaxy(warpProgress)
    } else {
      milkyOpacityRef.current = warpGalaxyOpacityToSolar(warpProgress)
    }
  })

  return (
    <group>
      <ambientLight intensity={0.4} />
      <MilkyWay opacityRef={milkyOpacityRef} />
      <SolarSystemMarker />
      <BlackHoleMarker />
    </group>
  )
}
