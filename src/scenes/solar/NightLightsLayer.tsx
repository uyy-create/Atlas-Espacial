import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { enhanceTextureQuality } from '../../components/textureQuality'

const NIGHT_LIGHTS_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const NIGHT_LIGHTS_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uIntensity;
  uniform vec3 uTint;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    // The Sun sits at the world origin.
    vec3 sunDir = normalize(-vWorldPosition);
    float daylight = dot(normalize(vWorldNormal), sunDir);
    // Lights fade in across the terminator, a little before true night.
    float night = 1.0 - smoothstep(-0.12, 0.18, daylight);

    vec3 lights = texture2D(uMap, vUv).rgb;
    vec3 color = lights * uTint * night * uIntensity;
    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const skipRaycast = () => null

/**
 * City lights on the night side, drawn as an additive shell just above
 * the surface so they never show through the day side.
 */
export function NightLightsLayer({
  url,
  radius,
}: {
  url: string
  radius: number
}) {
  const map = useTexture(url) as THREE.Texture
  const gl = useThree((s) => s.gl)
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy()

  useEffect(() => {
    enhanceTextureQuality(map, maxAnisotropy, 'color')
  }, [map, maxAnisotropy])

  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uIntensity: { value: 1.4 },
      uTint: { value: new THREE.Color('#ffd9a3') },
    }),
    [map],
  )

  return (
    <mesh scale={1.003} raycast={skipRaycast}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={NIGHT_LIGHTS_VERT}
        fragmentShader={NIGHT_LIGHTS_FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
