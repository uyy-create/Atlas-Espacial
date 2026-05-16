import { useFrame } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import {
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
  BlendFunction,
  KernelSize,
} from 'postprocessing'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useSolarStore } from '../store/useSolarStore'
import { computeWarpStreakIntensity } from '../transitions/warp/blackHoleTransition'

const BLOOM_BASE_INTENSITY = 0.55
const BLOOM_PEAK_INTENSITY = 1.25
const BLOOM_BASE_THRESHOLD = 0.85
const BLOOM_PEAK_THRESHOLD = 0.6
const CA_PEAK_OFFSET = 0.0028
const GALAXY_BLOOM_INTENSITY = 0.5
/** Subtle bloom in BH view — shader already carries most of the glow. */
const BLACK_HOLE_BLOOM_INTENSITY = 0.38
const BLACK_HOLE_BLOOM_THRESHOLD = 0.82

export function PostFX() {
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
    const { mode, view, warpTargetView, warpProgress } =
      useSolarStore.getState()
    const intensity = computeWarpStreakIntensity(
      mode,
      view,
      warpTargetView,
      warpProgress,
    )

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
