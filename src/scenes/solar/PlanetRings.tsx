import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { RingDef } from '../../data/planets'
import { enhanceTextureQuality } from '../../components/textureQuality'

interface PlanetRingsProps {
  rings: RingDef
}

/**
 * A textured ring lying on the equatorial plane of its parent.
 *
 * The default UV layout of THREE.RingGeometry doesn't make ring textures
 * (which are 1D radial bands) wrap correctly. We rewrite the UVs so that:
 *   - U maps to the radial position (inner edge -> 0, outer edge -> 1)
 *   - V is constant
 * This makes color/alpha textures designed as horizontal bands look right.
 */
export function PlanetRings({ rings }: PlanetRingsProps) {
  const gl = useThree((s) => s.gl)
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy()
  const urls = rings.alphaUrl
    ? [rings.textureUrl, rings.alphaUrl]
    : [rings.textureUrl]
  const textures = useTexture(urls) as THREE.Texture[]
  const colorMap = textures[0]
  const alphaMap = rings.alphaUrl ? textures[1] : undefined

  useEffect(() => {
    enhanceTextureQuality(colorMap, maxAnisotropy, 'color')
    if (alphaMap) {
      enhanceTextureQuality(alphaMap, maxAnisotropy, 'data')
    }
  }, [colorMap, alphaMap, maxAnisotropy])

  const geometry = useMemo(() => {
    const g = new THREE.RingGeometry(rings.innerRadius, rings.outerRadius, 192, 8)
    const pos = g.attributes.position as THREE.BufferAttribute
    const uv = g.attributes.uv as THREE.BufferAttribute
    const range = rings.outerRadius - rings.innerRadius
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const r = Math.sqrt(x * x + y * y)
      const u = (r - rings.innerRadius) / range
      uv.setXY(i, u, 0.5)
    }
    uv.needsUpdate = true
    return g
  }, [rings.innerRadius, rings.outerRadius])

  const tilt = ((rings.tiltDeg ?? 0) * Math.PI) / 180

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2 + tilt, 0, 0]}
      receiveShadow={false}
      castShadow={false}
    >
      <meshBasicMaterial
        map={colorMap}
        alphaMap={alphaMap}
        side={THREE.DoubleSide}
        transparent
        opacity={rings.opacity ?? 1}
        depthWrite={false}
        toneMapped={true}
      />
    </mesh>
  )
}
