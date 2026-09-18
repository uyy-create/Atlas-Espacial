import { useMemo } from 'react'
import * as THREE from 'three'
import { useSolarStore } from '../../store/useSolarStore'

interface OrbitProps {
  radius: number
  segments?: number
  planetId?: string
}

export function Orbit({ radius, segments = 256, planetId }: OrbitProps) {
  const focusedId = useSolarStore((s) => s.focusedId)
  const hoveredId = useSolarStore((s) => s.hoveredId)

  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [radius, segments])

  const isHighlighted =
    planetId !== undefined && (focusedId === planetId || hoveredId === planetId)

  let opacity: number
  if (focusedId === null) {
    opacity = isHighlighted ? 0.45 : 0.3
  } else if (isHighlighted) {
    opacity = 0.4
  } else {
    opacity = 0.05
  }

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial
        color="#9bb0ff"
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </lineLoop>
  )
}
