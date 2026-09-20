import { useMemo } from 'react'
import * as THREE from 'three'
import type { AtmosphereDef } from '../../data/planets'

interface AtmosphereProps {
  radius: number
  def: AtmosphereDef
}

/**
 * Two-shell atmospheric glow around a planet.
 *
 *   - Inner shell (front faces, barely larger than the planet): a Fresnel rim
 *     that brightens toward the limb — the thin line of scattered light you
 *     see on photos of Earth from orbit.
 *   - Outer shell (back faces, ~15 % larger): a soft halo that is strongest
 *     right outside the silhouette and fades out with distance. Rendering
 *     the back faces means the part behind the planet is depth-culled and
 *     only the visible ring remains.
 *
 * Both are lit by the Sun (at the origin), so the halo is fuller on the
 * day side and almost vanishes on the night side.
 */
const ATMOSPHERE_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const ATMOSPHERE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  /** 1.0 = outer halo (back faces), 0.0 = inner rim (front faces). */
  uniform float uOuter;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    // The Sun sits at the world origin.
    vec3 sunDir = normalize(-vWorldPosition);

    float facing = dot(normal, viewDir);
    // Inner rim: bright at the limb. Outer halo: bright just outside the
    // silhouette (back-face normals point away from the camera there).
    float fresnel = uOuter > 0.5
      ? pow(clamp(-facing, 0.0, 1.0), uPower)
      : pow(clamp(1.0 - facing, 0.0, 1.0), uPower);

    float daylight = smoothstep(-0.55, 0.45, dot(normal, sunDir));
    float light = mix(0.12, 1.0, daylight);

    vec3 color = uColor * fresnel * uIntensity * light;
    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const skipRaycast = () => null

export function Atmosphere({ radius, def }: AtmosphereProps) {
  const color = useMemo(() => new THREE.Color(def.color), [def.color])
  const intensity = def.intensity ?? 1
  const outerScale = def.scale ?? 1.16

  const rimUniforms = useMemo(
    () => ({
      uColor: { value: color },
      uIntensity: { value: intensity * 0.9 },
      uPower: { value: 3.2 },
      uOuter: { value: 0 },
    }),
    [color, intensity],
  )
  const haloUniforms = useMemo(
    () => ({
      uColor: { value: color },
      uIntensity: { value: intensity * 1.4 },
      uPower: { value: 5.5 },
      uOuter: { value: 1 },
    }),
    [color, intensity],
  )

  return (
    <>
      <mesh scale={1.015} raycast={skipRaycast}>
        <sphereGeometry args={[radius, 48, 48]} />
        <shaderMaterial
          uniforms={rimUniforms}
          vertexShader={ATMOSPHERE_VERT}
          fragmentShader={ATMOSPHERE_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh scale={outerScale} raycast={skipRaycast}>
        <sphereGeometry args={[radius, 48, 48]} />
        <shaderMaterial
          uniforms={haloUniforms}
          vertexShader={ATMOSPHERE_VERT}
          fragmentShader={ATMOSPHERE_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  )
}
