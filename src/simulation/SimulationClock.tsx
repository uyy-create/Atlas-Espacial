import { useFrame } from '@react-three/fiber'
import { useTimeStore } from '../store/useTimeStore'

/**
 * Advances the simulated clock once per frame, before any scene object
 * reads it (negative priority runs ahead of the default 0).
 */
export function SimulationClock() {
  useFrame((_, delta) => {
    useTimeStore.getState().advance(delta)
  }, -1)
  return null
}
