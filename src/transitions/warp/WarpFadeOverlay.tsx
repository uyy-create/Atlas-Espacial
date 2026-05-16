import { useSolarStore } from '../../store/useSolarStore'
import { computeBlackHoleWarpFade } from './blackHoleTransition'

/**
 * Covers the canvas during BH warp transitions so camera / shader swaps stay hidden.
 */
export function WarpFadeOverlay() {
  const fade = useSolarStore((s) =>
    computeBlackHoleWarpFade(s.mode, s.view, s.warpTargetView, s.warpProgress),
  )

  if (fade <= 0.001) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 bg-[#02030a]"
      style={{ opacity: fade }}
      aria-hidden
    />
  )
}
