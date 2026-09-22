import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { J2000 } from '../../simulation/ephemeris'
import { useTimeStore } from '../../store/useTimeStore'
import { createRandom } from '../../utils/random'

const COUNT = 2600
const SEED = 0x42454c54
/** Scene radii between the orbits of Mars (20) and Jupiter (27). */
const INNER_RADIUS = 22.0
const OUTER_RADIUS = 25.4
/** Real belt spans roughly 2.1–3.3 AU: mapped onto the scene radii above. */
const INNER_AU = 2.1
const OUTER_AU = 3.3
const MAX_HEIGHT = 0.45
const MIN_SIZE = 0.018
const MAX_SIZE = 0.05
/**
 * Jupiter's (exaggerated) moon orbits cross the belt, so a focused moon can
 * sit right among the rocks. Rocks shrink as the camera approaches (down
 * to this fraction) and vanish inside the cull radius, while from the
 * overview they keep full size so the belt still reads as a dusty ring.
 */
const NEAR_SCALE_MIN = 0.3
const NEAR_SCALE_DISTANCE = 30
const NEAR_CULL_DISTANCE = 0.8

const BELT_VERT = /* glsl */ `
  // angle at J2000, orbit radius, period (days), height above the plane
  attribute vec4 aOrbit;
  uniform float uDaysSinceJ2000;
  uniform float uNearScaleMin;
  uniform float uNearScaleDistance;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    float angle = aOrbit.x + 6.28318530718 * uDaysSinceJ2000 / aOrbit.z;
    // Prograde: counter-clockwise seen from above, like the planets.
    vec3 center = vec3(cos(angle) * aOrbit.y, aOrbit.w, -sin(angle) * aOrbit.y);

    // Shrink rocks the camera gets close to (see NEAR_SCALE_MIN).
    vec3 worldCenter = (modelMatrix * vec4(center, 1.0)).xyz;
    float nearScale = clamp(
      distance(cameraPosition, worldCenter) / uNearScaleDistance,
      uNearScaleMin,
      1.0
    );

    // instanceMatrix carries each rock's rotation and scale only.
    vec4 local = instanceMatrix * vec4(position, 1.0);
    vec4 worldPosition = modelMatrix * vec4(local.xyz * nearScale + center, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * (mat3(instanceMatrix) * normal));
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const BELT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uNearCull;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    if (distance(cameraPosition, vWorldPosition) < uNearCull) discard;
    // The Sun sits at the world origin.
    vec3 sunDir = normalize(-vWorldPosition);
    float diffuse = max(dot(normalize(vNormal), sunDir), 0.0);
    vec3 color = uColor * (0.22 + 0.9 * diffuse);
    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const skipRaycast = () => null

/** One shared, slightly lumpy rock; instance rotations do the rest. */
function createRockGeometry(rand: () => number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 2)
  const position = geometry.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    v.multiplyScalar(0.8 + rand() * 0.35)
    position.setXYZ(i, v.x, v.y, v.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

interface BeltData {
  geometry: THREE.BufferGeometry
  /** Rotation + scale per instance, applied once. */
  matrices: THREE.Matrix4[]
}

function createBelt(): BeltData {
  const rand = createRandom(SEED)
  const geometry = createRockGeometry(rand)

  const orbits = new Float32Array(COUNT * 4)
  const matrices: THREE.Matrix4[] = []
  const euler = new THREE.Euler()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const origin = new THREE.Vector3()

  for (let i = 0; i < COUNT; i++) {
    // Density peaks mid-belt: average two uniforms for a triangular spread.
    const t = (rand() + rand()) / 2
    const radius = INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS) * t
    const au = INNER_AU + (OUTER_AU - INNER_AU) * t
    const periodDays = 365.25 * Math.pow(au, 1.5)
    const height = (rand() + rand() + rand() - 1.5) * MAX_HEIGHT
    orbits[i * 4 + 0] = rand() * Math.PI * 2
    orbits[i * 4 + 1] = radius
    orbits[i * 4 + 2] = periodDays
    orbits[i * 4 + 3] = height

    // Mostly small rocks, a handful of bigger ones.
    const size = MIN_SIZE + (MAX_SIZE - MIN_SIZE) * Math.pow(rand(), 2.4)
    euler.set(rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2)
    quaternion.setFromEuler(euler)
    scale.setScalar(size)
    matrices.push(new THREE.Matrix4().compose(origin, quaternion, scale))
  }

  geometry.setAttribute('aOrbit', new THREE.InstancedBufferAttribute(orbits, 4))
  return { geometry, matrices }
}

/**
 * The main asteroid belt: thousands of rocks on Keplerian orbits between
 * Mars and Jupiter, positioned entirely on the GPU from the simulated date.
 */
export function AsteroidBelt() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const belt = useMemo(() => createBelt(), [])

  const uniforms = useMemo(
    () => ({
      uDaysSinceJ2000: { value: 0 },
      uColor: { value: new THREE.Color('#8d7f70') },
      uNearCull: { value: NEAR_CULL_DISTANCE },
      uNearScaleMin: { value: NEAR_SCALE_MIN },
      uNearScaleDistance: { value: NEAR_SCALE_DISTANCE },
    }),
    [],
  )

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    belt.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
  }, [belt])

  useEffect(() => () => belt.geometry.dispose(), [belt])

  useFrame(() => {
    const mat = materialRef.current
    if (!mat) return
    mat.uniforms.uDaysSinceJ2000.value =
      useTimeStore.getState().clock.julianDay - J2000
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, COUNT]}
      geometry={belt.geometry}
      frustumCulled={false}
      raycast={skipRaycast}
    >
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={BELT_VERT}
        fragmentShader={BELT_FRAG}
      />
    </instancedMesh>
  )
}
