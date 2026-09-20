import { useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createRandom } from '../../utils/random'

const PARTICLE_COUNT = 52000
/** Fixed seed: the galaxy must look the same every time it is mounted. */
const GALAXY_SEED = 0x4d494c4b
const GALAXY_RADIUS = 80
const ARMS = 4
const DISC_THICKNESS = 0.3
const BULGE_RATIO = 0.1
/**
 * Fraction of disc particles that are NOT bound to a spiral arm — random in
 * the disc. Gives the cloudy / chaotic feel of a real galaxy.
 */
const CLOUD_RATIO = 0.42
/**
 * Logarithmic spiral coefficient. Higher = arms wind tighter.
 * spinAngle = log(1 + radius * SPIRAL_GROWTH) * SPIRAL_TIGHTNESS
 */
const SPIRAL_GROWTH = 0.3
const SPIRAL_TIGHTNESS = 2.7
/** Angular half-width (radians) of an arm — bigger = thicker arm. */
const ARM_ANGULAR_SCATTER = 0.55
const ARM_RADIAL_SCATTER = 0.55
const CLOUD_SCATTER = 0.4

const COLOR_CORE = new THREE.Color('#fff0f7')
const COLOR_MID = new THREE.Color('#e7baea')
const COLOR_OUTER = new THREE.Color('#b3c0f2')
const COLOR_RIM = new THREE.Color('#7888dc')

function makeParticleTexture(): THREE.CanvasTexture {
  const size = 164
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const center = size / 2
  const gradient = ctx.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center,
  )
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.25, 'rgba(255,240,210,0.85)')
  gradient.addColorStop(0.55, 'rgba(180,180,255,0.25)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function makeHaloTexture(): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
  gradient.addColorStop(0.0, 'rgba(255, 215, 240, 0.55)')
  gradient.addColorStop(0.08, 'rgba(235, 180, 220, 0.4)')
  gradient.addColorStop(0.2, 'rgba(180, 160, 220, 0.22)')
  gradient.addColorStop(0.45, 'rgba(110, 130, 210, 0.12)')
  gradient.addColorStop(0.75, 'rgba(60, 75, 170, 0.05)')
  gradient.addColorStop(1.0, 'rgba(20, 30, 80, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

const PARTICLE_VERT = /* glsl */ `
  attribute float aSize;
  uniform float uPixelRatio;
  uniform float uSize;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uSize * uPixelRatio / -mvPosition.z;
    gl_PointSize = clamp(gl_PointSize, 1.0, 60.0);
  }
`

const PARTICLE_FRAG = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(uTexture, gl_PointCoord);
    if (tex.a < 0.02) discard;
    gl_FragColor = vec4(vColor * tex.rgb, tex.a * uOpacity);
  }
`

export function MilkyWay({
  opacityRef,
}: {
  opacityRef?: MutableRefObject<number>
}) {
  const spinRef = useRef<THREE.Group>(null)
  const haloMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const pointsMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const dpr = useThree((s) => s.viewport.dpr)

  const haloTexture = useMemo(() => makeHaloTexture(), [])

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)

    const rand = createRandom(GALAXY_SEED)
    const tmpColor = new THREE.Color()

    // Break perfect rotational symmetry between arms with small random
    // offsets so the galaxy doesn't read as "four identical arms".
    const armOffsets = new Float32Array(ARMS)
    for (let a = 0; a < ARMS; a++) {
      armOffsets[a] =
        (a / ARMS) * Math.PI * 2 + (rand() - 0.5) * 0.55
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const popRoll = rand()
      let population: 'bulge' | 'cloud' | 'arm'
      if (popRoll < BULGE_RATIO) {
        population = 'bulge'
      } else if (popRoll < BULGE_RATIO + CLOUD_RATIO) {
        population = 'cloud'
      } else {
        population = 'arm'
      }

      let radius: number
      let angle: number

      if (population === 'bulge') {
        radius = Math.pow(rand(), 2) * GALAXY_RADIUS * 0.2
        angle = rand() * Math.PI * 2
      } else if (population === 'cloud') {
        // Random anywhere in the disc, biased slightly toward center.
        radius = Math.pow(rand(), 0.55) * GALAXY_RADIUS
        angle = rand() * Math.PI * 2
      } else {
        radius =
          Math.pow(rand(), 0.55) * GALAXY_RADIUS +
          (rand() - 0.5) * ARM_RADIAL_SCATTER * GALAXY_RADIUS * 0.06
        const branchIndex = i % ARMS
        const branchAngle = armOffsets[branchIndex]
        // Per-particle jitter on the spin so the arm itself isn't a perfect
        // mathematical curve.
        const growthJitter = 0.9 + rand() * 0.2
        const spinAngle =
          Math.log(1 + radius * SPIRAL_GROWTH * growthJitter) *
          SPIRAL_TIGHTNESS
        // Wide angular scatter -> thick arm. Power 1.4 keeps most particles
        // near the arm centre but allows a soft halo around it.
        const angularJitter =
          (rand() - 0.5) *
          2 *
          ARM_ANGULAR_SCATTER *
          Math.pow(rand(), 1.4)
        angle = branchAngle + spinAngle + angularJitter
      }

      const radialFraction = radius / GALAXY_RADIUS
      const baseScatter =
        population === 'cloud' ? CLOUD_SCATTER : ARM_RADIAL_SCATTER
      const scatterStrength = baseScatter + radialFraction * 0.2

      const sx =
        Math.pow(rand(), 3) *
        (rand() < 0.5 ? 1 : -1) *
        scatterStrength *
        radius *
        0.22
      const sz =
        Math.pow(rand(), 3) *
        (rand() < 0.5 ? 1 : -1) *
        scatterStrength *
        radius *
        0.22
      const sy =
        Math.pow(rand(), 3) *
        (rand() < 0.5 ? 1 : -1) *
        (population === 'bulge'
          ? radius * 0.4
          : radius * DISC_THICKNESS *
            (population === 'cloud' ? 1.9 : 1.1))

      const x = Math.cos(angle) * radius + sx
      const z = Math.sin(angle) * radius + sz
      const y = sy

      positions[i * 3 + 0] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      const t = radialFraction
      if (t < 0.18) {
        tmpColor.copy(COLOR_CORE).lerp(COLOR_MID, t / 0.18)
      } else if (t < 0.6) {
        tmpColor.copy(COLOR_MID).lerp(COLOR_OUTER, (t - 0.18) / 0.42)
      } else {
        tmpColor.copy(COLOR_OUTER).lerp(COLOR_RIM, (t - 0.6) / 0.4)
      }
      colors[i * 3 + 0] = tmpColor.r
      colors[i * 3 + 1] = tmpColor.g
      colors[i * 3 + 2] = tmpColor.b

      const baseSize =
        population === 'bulge'
          ? 1.0
          : population === 'cloud'
            ? 0.45 + (1 - t) * 0.8
            : 0.55 + (1 - t) * 1.1
      sizes[i] = baseSize * (0.65 + rand() * 0.7)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

    const particleTexture = makeParticleTexture()

    return {
      geometry: geo,
      uniforms: {
        uPixelRatio: { value: 1 },
        uSize: { value: 44 },
        uTexture: { value: particleTexture },
        uOpacity: { value: 1.0 },
      },
    }
  }, [])

  useFrame((_, delta) => {
    if (spinRef.current) {
      spinRef.current.rotation.y += delta * 0.012
    }
    const op = opacityRef?.current ?? 1
    const pointsMat = pointsMaterialRef.current
    if (pointsMat) {
      pointsMat.uniforms.uOpacity.value = op
      pointsMat.uniforms.uPixelRatio.value = Math.min(dpr, 2)
    }
    const haloMat = haloMaterialRef.current
    if (haloMat) haloMat.opacity = 0.55 * op
  })

  return (
    <group rotation={[-0.04, 0, 0.07]}>
      <group ref={spinRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
          <planeGeometry
            args={[GALAXY_RADIUS * 2.6, GALAXY_RADIUS * 2.6]}
          />
          <meshBasicMaterial
            ref={haloMaterialRef}
            map={haloTexture}
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={true}
          />
        </mesh>
        <points geometry={geometry}>
          <shaderMaterial
            ref={pointsMaterialRef}
            uniforms={uniforms}
            vertexShader={PARTICLE_VERT}
            fragmentShader={PARTICLE_FRAG}
            transparent
            depthWrite={false}
            vertexColors
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </group>
  )
}

export const GALAXY_RADIUS_VALUE = GALAXY_RADIUS
