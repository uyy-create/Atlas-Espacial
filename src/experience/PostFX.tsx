import { useFrame } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import {
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
  BlendFunction,
  KernelSize,
} from 'postprocessing'
import { useEffect, useMemo, useRef } from 'react'
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

/**
 * The effects are built once and handed to `<primitive>`; per-frame tuning
 * goes through the refs R3F attaches to those same objects. We don't use the
 * `<Bloom>`-style wrappers from @react-three/postprocessing: they key their
 * memo on `JSON.stringify(props)`, and with React 19 putting `ref` in props
 * that serialises the whole effect graph and throws on re-render.
 */
export function PostFX() {
  const effects = useMemo(() => {
    const bloom = new BloomEffect({
      intensity: BLOOM_BASE_INTENSITY,
      luminanceThreshold: BLOOM_BASE_THRESHOLD,
      luminanceSmoothing: 0.2,
      kernelSize: KernelSize.LARGE,
      mipmapBlur: true,
    })
    bloom.blendMode.blendFunction = BlendFunction.ADD

    const chromaticAberration = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0, 0),
      radialModulation: false,
      modulationOffset: 0,
    })

    const vignette = new VignetteEffect({
      offset: 0.35,
      darkness: 0.45,
      blendFunction: BlendFunction.NORMAL,
    })

    return { bloom, chromaticAberration, vignette }
  }, [])

  useEffect(() => {
    return () => {
      effects.bloom.dispose()
      effects.chromaticAberration.dispose()
      effects.vignette.dispose()
    }
  }, [effects])

  const bloomRef = useRef<BloomEffect>(null)
  const chromaticAberrationRef = useRef<ChromaticAberrationEffect>(null)
  const vignetteRef = useRef<VignetteEffect>(null)

  useFrame(() => {
    const { mode, view, warpTargetView, warpProgress } =
      useSolarStore.getState()
    const intensity = computeWarpStreakIntensity(
      mode,
      view,
      warpTargetView,
      warpProgress,
    )

    const bloom = bloomRef.current
    if (bloom) {
      const baseBloom =
        view === 'galaxy'
          ? GALAXY_BLOOM_INTENSITY
          : view === 'blackHole'
            ? BLACK_HOLE_BLOOM_INTENSITY
            : BLOOM_BASE_INTENSITY
      bloom.intensity =
        baseBloom + (BLOOM_PEAK_INTENSITY - baseBloom) * intensity

      const baseThreshold =
        view === 'blackHole' ? BLACK_HOLE_BLOOM_THRESHOLD : BLOOM_BASE_THRESHOLD
      bloom.luminanceMaterial.threshold =
        baseThreshold - (baseThreshold - BLOOM_PEAK_THRESHOLD) * intensity
    }

    const bh = view === 'blackHole'
    const chromaticAberration = chromaticAberrationRef.current
    if (chromaticAberration) {
      const caBh = bh ? 0.00055 : 0
      chromaticAberration.offset.set(
        caBh + intensity * CA_PEAK_OFFSET,
        caBh + intensity * CA_PEAK_OFFSET,
      )
    }

    const vignette = vignetteRef.current
    if (vignette) {
      vignette.darkness = bh ? 0.56 : 0.45
      vignette.offset = bh ? 0.44 : 0.35
    }
  })

  return (
    <EffectComposer multisampling={0}>
      <primitive ref={bloomRef} object={effects.bloom} />
      <primitive ref={chromaticAberrationRef} object={effects.chromaticAberration} />
      <primitive ref={vignetteRef} object={effects.vignette} />
    </EffectComposer>
  )
}
