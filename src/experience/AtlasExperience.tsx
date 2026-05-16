import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Starfield } from '../components/Starfield'
import { useSolarStore } from '../store/useSolarStore'
import { CameraRig } from '../transitions/camera/CameraRig'
import { WarpSceneLayers } from '../transitions/warp/WarpSceneLayers'
import { WarpStreaks } from '../transitions/warp/WarpStreaks'
import { PostFX } from './PostFX'

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
        {view !== 'blackHole' && <Starfield />}
        <WarpSceneLayers />
      </Suspense>

      <WarpStreaks />
      <CameraRig />
      <PostFX />
    </Canvas>
  )
}
