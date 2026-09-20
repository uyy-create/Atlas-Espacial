import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { RingBand, RingDef } from '../../data/planets'
import { enhanceTextureQuality } from '../../components/textureQuality'

interface PlanetRingsProps {
  rings: RingDef
}

/**
 * The default UV layout of THREE.RingGeometry doesn't make ring textures
 * (which are 1D radial bands) wrap correctly. We rewrite the UVs so that:
 *   - U maps to the radial position (inner edge -> 0, outer edge -> 1)
 *   - V is constant
 * This makes color/alpha textures designed as horizontal bands look right.
 */
function useRingGeometry(innerRadius: number, outerRadius: number) {
  return useMemo(() => {
    const g = new THREE.RingGeometry(innerRadius, outerRadius, 192, 8)
    const pos = g.attributes.position as THREE.BufferAttribute
    const uv = g.attributes.uv as THREE.BufferAttribute
    const range = outerRadius - innerRadius
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const r = Math.sqrt(x * x + y * y)
      const u = (r - innerRadius) / range
      uv.setXY(i, u, 0.5)
    }
    uv.needsUpdate = true
    return g
  }, [innerRadius, outerRadius])
}

const BAND_TEXTURE_WIDTH = 1024

const smoothstep01 = (t: number) => {
  const c = t < 0 ? 0 : t > 1 ? 1 : t
  return c * c * (3 - 2 * c)
}

/**
 * Bakes a radial band profile into a 1-D RGBA strip: colour in RGB and
 * the band opacity in alpha, with smoothstep edges per `soft`.
 */
function makeBandTexture(bands: RingBand[]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = BAND_TEXTURE_WIDTH
  canvas.height = 2
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(BAND_TEXTURE_WIDTH, 2)
  const data = image.data
  const color = new THREE.Color()

  for (let x = 0; x < BAND_TEXTURE_WIDTH; x++) {
    const u = (x + 0.5) / BAND_TEXTURE_WIDTH
    let r = 0
    let g = 0
    let b = 0
    let a = 0
    for (const band of bands) {
      const width = band.to - band.from
      const edge = Math.max(1e-4, width * (band.soft ?? 0.3) * 0.5)
      const rise = smoothstep01((u - band.from) / edge)
      const fall = 1 - smoothstep01((u - (band.to - edge)) / edge)
      const weight = Math.min(rise, fall) * band.alpha
      if (weight <= 0) continue
      color.set(band.color)
      // Bands composite "over" one another.
      r = r * (1 - weight) + color.r * weight
      g = g * (1 - weight) + color.g * weight
      b = b * (1 - weight) + color.b * weight
      a = a + weight * (1 - a)
    }
    for (let row = 0; row < 2; row++) {
      const i = (row * BAND_TEXTURE_WIDTH + x) * 4
      data[i + 0] = Math.round(r * 255)
      data[i + 1] = Math.round(g * 255)
      data[i + 2] = Math.round(b * 255)
      data[i + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function RingMesh({
  rings,
  map,
  alphaMap,
}: {
  rings: RingDef
  map: THREE.Texture
  alphaMap?: THREE.Texture
}) {
  const geometry = useRingGeometry(rings.innerRadius, rings.outerRadius)
  const tilt = ((rings.tiltDeg ?? 0) * Math.PI) / 180

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2 + tilt, 0, 0]}
      receiveShadow={false}
      castShadow={false}
    >
      <meshBasicMaterial
        map={map}
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

function TexturedRings({
  rings,
}: {
  rings: RingDef & { textureUrl: string }
}) {
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

  return <RingMesh rings={rings} map={colorMap} alphaMap={alphaMap} />
}

function ProceduralRings({
  rings,
}: {
  rings: RingDef & { bands: RingBand[] }
}) {
  const gl = useThree((s) => s.gl)
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy()
  const map = useMemo(() => makeBandTexture(rings.bands), [rings.bands])

  useEffect(() => {
    enhanceTextureQuality(map, maxAnisotropy, 'color')
    return () => map.dispose()
  }, [map, maxAnisotropy])

  return <RingMesh rings={rings} map={map} />
}

/** A ring system lying on the equatorial plane of its parent. */
export function PlanetRings({ rings }: PlanetRingsProps) {
  if (rings.bands) return <ProceduralRings rings={rings} />
  return <TexturedRings rings={rings} />
}
