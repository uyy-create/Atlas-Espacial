import * as THREE from 'three'

type TextureRole = 'color' | 'data'

export function enhanceTextureQuality(
  texture: THREE.Texture,
  maxAnisotropy: number,
  role: TextureRole = 'color',
) {
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = Math.max(1, Math.min(16, maxAnisotropy))
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping

  if (role === 'color') {
    texture.colorSpace = THREE.SRGBColorSpace
  } else {
    texture.colorSpace = THREE.NoColorSpace
  }

  texture.needsUpdate = true
}
