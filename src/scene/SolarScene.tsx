import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import {
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
  BlendFunction,
  KernelSize,
} from 'postprocessing'
import { Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useSolarStore } from '../store/useSolarStore'
import { CameraRig } from './CameraRig'
import { Starfield } from './Starfield'
import { warpIntensityCurve, WarpStreaks } from './WarpStreaks'
import { WarpSceneLayers } from './WarpSceneLayers'

const BLOOM_BASE_INTENSITY = 0.55
const BLOOM_PEAK_INTENSITY = 1.25
const BLOOM_BASE_THRESHOLD = 0.85
const BLOOM_PEAK_THRESHOLD = 0.6
const CA_PEAK_OFFSET = 0.0028
const GALAXY_BLOOM_INTENSITY = 0.5
const BLACK_HOLE_BLOOM_INTENSITY = 0.92
const BLACK_HOLE_BLOOM_THRESHOLD = 0.58

function PostFX() {
  const { bloom, chromaticAberration, vignette } = useMemo(() => {
    const bloomEffect = new BloomEffect({
      intensity: BLOOM_BASE_INTENSITY,
      luminanceThreshold: BLOOM_BASE_THRESHOLD,
      luminanceSmoothing: 0.2,
      kernelSize: KernelSize.LARGE,
      mipmapBlur: true,
    })
    bloomEffect.blendMode.blendFunction = BlendFunction.ADD

    const caEffect = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0, 0),
      radialModulation: false,
      modulationOffset: 0,
    })

    const vignetteEffect = new VignetteEffect({
      offset: 0.35,
      darkness: 0.45,
      blendFunction: BlendFunction.NORMAL,
    })

    return {
      bloom: bloomEffect,
      chromaticAberration: caEffect,
      vignette: vignetteEffect,
    }
  }, [])

  useEffect(() => {
    return () => {
      bloom.dispose()
      chromaticAberration.dispose()
      vignette.dispose()
    }
  }, [bloom, chromaticAberration, vignette])

  useFrame(() => {
    const { mode, view, warpProgress } = useSolarStore.getState()
    const isWarping = mode === 'warping'
    const intensity = isWarping ? warpIntensityCurve(warpProgress) : 0

    const baseBloom =
      view === 'galaxy'
        ? GALAXY_BLOOM_INTENSITY
        : view === 'blackHole'
          ? BLACK_HOLE_BLOOM_INTENSITY
          : BLOOM_BASE_INTENSITY
    bloom.intensity = baseBloom + (BLOOM_PEAK_INTENSITY - baseBloom) * intensity

    const lumPass = (
      bloom as unknown as {
        luminancePass?: {
          luminanceMaterial?: { threshold: number }
        }
      }
    ).luminancePass
    if (lumPass?.luminanceMaterial) {
      const baseThreshold =
        view === 'blackHole' ? BLACK_HOLE_BLOOM_THRESHOLD : BLOOM_BASE_THRESHOLD
      lumPass.luminanceMaterial.threshold =
        baseThreshold - (baseThreshold - BLOOM_PEAK_THRESHOLD) * intensity
    }

    const bh = view === 'blackHole'
    const caBh = bh ? 0.00055 : 0
    chromaticAberration.offset.set(
      caBh + intensity * CA_PEAK_OFFSET,
      caBh + intensity * CA_PEAK_OFFSET,
    )
    vignette.darkness = bh ? 0.56 : 0.45
    vignette.offset = bh ? 0.44 : 0.35
  })

  return (
    <EffectComposer multisampling={0}>
      <primitive object={bloom} />
      <primitive object={chromaticAberration} />
      <primitive object={vignette} />
    </EffectComposer>
  )
}

export function SolarScene() {
  const view = useSolarStore((s) => s.view)
  const mode = useSolarStore((s) => s.mode)
  const unfocus = useSolarStore((s) => s.unfocus)

  const fogEnabled = useSolarStore((s) => {
    if (s.view === 'galaxy' && s.mode === 'overview') return false
    if (
      s.mode === 'warping' &&
      s.warpTargetView === 'galaxy' &&
      s.warpProgress > 0.46
    ) {
      return false
    }
    return true
  })

  const handlePointerMissed = () => {
    if (mode === 'warping') return
    if (view !== 'solar') return
    unfocus()
  }

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 32, 78], fov: 45, near: 0.1, far: 1200 }}
      onPointerMissed={handlePointerMissed}
    >
      <color attach="background" args={['#02030a']} />
      {fogEnabled && <fog attach="fog" args={['#02030a', 140, 360]} />}

      <Suspense fallback={null}>
        <Starfield />
        <WarpSceneLayers />
      </Suspense>

      <WarpStreaks />
      <CameraRig />
      <PostFX />
    </Canvas>
  )
}
