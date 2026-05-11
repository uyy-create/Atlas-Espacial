import { useMemo } from 'react'
import * as THREE from 'three'
import { useSolarStore } from '../store/useSolarStore'

interface OrbitProps {
  radius: number
  segments?: number
  planetId?: string
}

export function Orbit({ radius, segments = 256, planetId }: OrbitProps) {
  const focusedId = useSolarStore((s) => s.focusedId)
  const hoveredId = useSolarStore((s) => s.hoveredId)

  const lineObject = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius))
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: '#9bb0ff',
      transparent: true,
      depthWrite: false,
    })
    return new THREE.Line(geometry, material)
  }, [radius, segments])

  const material = lineObject.material as THREE.LineBasicMaterial

  const isHighlighted = planetId !== undefined && (focusedId === planetId || hoveredId === planetId)

  if (focusedId === null) {
    material.opacity = isHighlighted ? 0.45 : 0.2
  } else if (isHighlighted) {
    material.opacity = 0.4
  } else {
    material.opacity = 0.05
  }

  return <primitive object={lineObject} />
}
