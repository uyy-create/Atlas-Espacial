import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Escena estable para divulgación: sombra esférica + anillo de fotones + nube de partículas.
 * Disco: nube texturada (~88k) + 3 capas afiladas sin textura (borde, polvo, exterior frío).
 *
 * Eje: disco en plano xz; grosor / “altura” del disco = **Y** (la cámara suele leerlo como profundidad).
 */

const VISUAL_SCALE = 2.95
const S = VISUAL_SCALE
const RIM = 2.1 * S
const DISK_OUT = 15.8 * S

/** Horizonte visual: esfera negra casi esférica (radio mundo, ~borde del disco interior). */
const SHADOW_BALL_RADIUS = RIM * 0.985

/** Radio interior de la nube (fuera de la esfera negra). */
const DISK_R_IN = SHADOW_BALL_RADIUS * 1.2
const DISK_R_OUT = DISK_OUT * 0.98

/** Perfil lenticular: escala Y del grupo del disco (más alto → menos “núcleo aplastado” vs bola). */
const LENTICULAR_Y_SCALE = 0.21

const ACCRETION_PARTICLE_COUNT = 88000
const ACCRETION_ARMS = 2
const ACCRETION_BULGE_RATIO = 0.1
const ACCRETION_CLOUD_RATIO = 0.52
const ACCRETION_SPIRAL_GROWTH = 0.42
const ACCRETION_SPIRAL_TIGHTNESS = 3.1
const ACCRETION_ARM_ANGULAR_SCATTER = 0.62
const ACCRETION_ARM_RADIAL_SCATTER = 0.62
const ACCRETION_CLOUD_SCATTER = 0.78
const ACCRETION_DISC_THICKNESS = 0.078 * S

/** Paleta tipo referencia: interior refinado (no blanco puro), exterior “frío” (magenta/violeta oscuro). */
const COLOR_DISK_IVORY = new THREE.Color('#ebe2d4')
const COLOR_DISK_AMBER = new THREE.Color('#d4a066')
const COLOR_DISK_ORANGE = new THREE.Color('#c45c26')
const COLOR_DISK_RUST = new THREE.Color('#7a2818')
const COLOR_DISK_COLD = new THREE.Color('#3d1428')
const COLOR_DISK_VOID = new THREE.Color('#0c060a')

/** Misma rampa que el disco de acreción (`radialT` 0 = interior del anillo, 1 = borde). */
function diskColorFromRadialT(
  radialT: number,
  out: THREE.Color,
  brightness = 0.9,
): void {
  const t = radialT < 0 ? 0 : radialT > 1 ? 1 : radialT
  if (t < 0.11) {
    out.copy(COLOR_DISK_IVORY).lerp(COLOR_DISK_AMBER, t / 0.11)
  } else if (t < 0.34) {
    out.copy(COLOR_DISK_AMBER).lerp(COLOR_DISK_ORANGE, (t - 0.11) / 0.23)
  } else if (t < 0.62) {
    out.copy(COLOR_DISK_ORANGE).lerp(COLOR_DISK_RUST, (t - 0.34) / 0.28)
  } else if (t < 0.86) {
    out.copy(COLOR_DISK_RUST).lerp(COLOR_DISK_COLD, (t - 0.62) / 0.24)
  } else {
    out.copy(COLOR_DISK_COLD).lerp(COLOR_DISK_VOID, (t - 0.86) / 0.14)
  }
  out.r *= brightness
  out.g *= brightness
  out.b *= brightness
}

/** Capas afiladas (sin textura): chispas finas + polvo + escorias frías, encima de la nube texturada. */
const LAYER_RIM_COUNT = 2800
const LAYER_DUST_COUNT = 5200
const LAYER_STREAM_COUNT = 2400

/**
 * Filamentos: muchas hebras cortas en arco circular en xz (vista oblicua vía rotación del grupo).
 * Dentro del radio del núcleo se atenúan (como si el flujo quedara oculto y reapareciera en otras hebras).
 */
const FILAMENT_STRANDS = 1750
/** Pocos puntos por hebra = arcos cortos alrededor del núcleo. */
const FILAMENT_PTS_PER_STRAND = 18
const FILAMENT_SEGMENTS_PER_STRAND = FILAMENT_PTS_PER_STRAND - 1
/** Apertura angular de cada hebra (rad); ~0.18π ≈ 32°. */
const FILAMENT_SWEEP = 0.18 * Math.PI
/** Varias franjas paralelas en el plano del disco (WebGL no dibuja grosor real de línea). */
const FILAMENT_RIBBON_STRIPES = 3
const FILAMENT_RIBBON_STEP = 0.011 * S
const FILAMENT_VERTEX_COUNT =
  FILAMENT_STRANDS * FILAMENT_SEGMENTS_PER_STRAND * 2 * FILAMENT_RIBBON_STRIPES
/** Radio por debajo del cual el filamento no se dibuja (zona del “núcleo” / sombra). */
const FILAMENT_NUCLEUS_R = SHADOW_BALL_RADIUS * 1.05
/** Transición suave al salir del núcleo (mismo orden de magnitud que el disco). */
const FILAMENT_HOLE_SOFT = 0.52 * S

const glslDiskRamp = /* glsl */ `
  vec3 diskColorFromRadialT(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 ivory = vec3(0.9216, 0.8863, 0.8314);
    vec3 amber = vec3(0.8314, 0.6275, 0.4000);
    vec3 orange = vec3(0.7686, 0.3608, 0.1490);
    vec3 rust = vec3(0.4784, 0.1569, 0.0941);
    vec3 cold = vec3(0.2392, 0.0784, 0.1569);
    vec3 voidc = vec3(0.0471, 0.0235, 0.0392);
    if (t < 0.11) return mix(ivory, amber, t / 0.11);
    if (t < 0.34) return mix(amber, orange, (t - 0.11) / 0.23);
    if (t < 0.62) return mix(orange, rust, (t - 0.34) / 0.28);
    if (t < 0.86) return mix(rust, cold, (t - 0.62) / 0.24);
    return mix(cold, voidc, (t - 0.86) / 0.14);
  }
`

function buildOrbitingFilamentLineSegments(): {
  geometry: THREE.BufferGeometry
  material: THREE.ShaderMaterial
} {
  const fract = (x: number) => x - Math.floor(x)
  const positions = new Float32Array(FILAMENT_VERTEX_COUNT * 3)
  const aAlong = new Float32Array(FILAMENT_VERTEX_COUNT)
  const aPulsePhase = new Float32Array(FILAMENT_VERTEX_COUNT)
  const aArc = new Float32Array(FILAMENT_VERTEX_COUNT)
  const aOmegaR = new Float32Array(FILAMENT_VERTEX_COUNT)

  const span = DISK_R_OUT - DISK_R_IN
  type Pt = { x: number; y: number; z: number; t: number }
  const arcPts: Pt[] = new Array(FILAMENT_PTS_PER_STRAND)
  const stripeKs: number[] = []
  for (let k = 0; k < FILAMENT_RIBBON_STRIPES; k++) {
    stripeKs.push(k - (FILAMENT_RIBBON_STRIPES - 1) / 2)
  }

  let w = 0
  const rMin2 = DISK_R_IN * DISK_R_IN
  const rMax2 = (DISK_R_OUT * 0.992) ** 2
  for (let strand = 0; strand < FILAMENT_STRANDS; strand++) {
    const arcN = strand / FILAMENT_STRANDS
    // Par (u,v) desacoplado en [0,1): evita amontonarse en el borde interior (problema de golden^0.82).
    const u = fract((strand + 1) * 0.618033988749895)
    const v = fract((strand + 1) * 0.381966011250105 + 0.2718281828459)
    let rMid = Math.sqrt(rMin2 + u * (rMax2 - rMin2))
    rMid *= 1 + 0.035 * Math.sin(strand * 1.713 + u * 6.2)
    rMid = Math.min(DISK_R_OUT * 0.992, Math.max(DISK_R_IN * 1.01, rMid))
    const theta0 = v * Math.PI * 2 + u * 0.35
    const phaseArc = (strand * 2.5132741228718345) % (Math.PI * 2)
    const omegaRef = Math.min(DISK_R_OUT * 0.995, Math.max(DISK_R_IN * 1.002, rMid))

    for (let i = 0; i < FILAMENT_PTS_PER_STRAND; i++) {
      const t = FILAMENT_PTS_PER_STRAND > 1 ? i / (FILAMENT_PTS_PER_STRAND - 1) : 0
      const theta = theta0 + t * FILAMENT_SWEEP
      const rWobble = span * 0.012 * Math.sin(t * Math.PI * 2 + phaseArc * 0.4)
      const Rc = Math.min(
        DISK_R_OUT * 0.992,
        Math.max(DISK_R_IN * 0.99, rMid + rWobble),
      )
      const yDisc =
        ACCRETION_DISC_THICKNESS *
        0.28 *
        Math.sin(t * Math.PI) *
        Math.sin(theta * 0.5 + phaseArc * 0.2)
      arcPts[i] = {
        x: Math.cos(theta) * Rc,
        z: Math.sin(theta) * Rc,
        y: yDisc,
        t,
      }
    }

    for (let s = 0; s < FILAMENT_SEGMENTS_PER_STRAND; s++) {
      const pA = arcPts[s]
      const pB = arcPts[s + 1]
      const dx = pB.x - pA.x
      const dz = pB.z - pA.z
      const tlen = Math.hypot(dx, dz) || 1e-7
      const px = (-dz / tlen) * FILAMENT_RIBBON_STEP
      const pz = (dx / tlen) * FILAMENT_RIBBON_STEP
      for (const stripe of stripeKs) {
        const ox = px * stripe
        const oz = pz * stripe
        for (const p of [pA, pB]) {
          positions[w * 3] = p.x + ox
          positions[w * 3 + 1] = p.y
          positions[w * 3 + 2] = p.z + oz
          aAlong[w] = p.t
          aPulsePhase[w] = phaseArc
          aArc[w] = arcN
          aOmegaR[w] = omegaRef
          w++
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aAlong', new THREE.BufferAttribute(aAlong, 1))
  geometry.setAttribute('aPulsePhase', new THREE.BufferAttribute(aPulsePhase, 1))
  geometry.setAttribute('aArc', new THREE.BufferAttribute(aArc, 1))
  geometry.setAttribute('aOmegaR', new THREE.BufferAttribute(aOmegaR, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uRim: { value: DISK_R_IN },
      uRout: { value: DISK_R_OUT },
      uSpin: { value: 1.0 },
      uGain: { value: 0.72 },
      uRNucleus: { value: FILAMENT_NUCLEUS_R },
      uHoleSoft: { value: FILAMENT_HOLE_SOFT },
    },
    vertexShader: /* glsl */ `
      attribute float aAlong;
      attribute float aPulsePhase;
      attribute float aArc;
      attribute float aOmegaR;
      uniform float uTime;
      uniform float uRim;
      uniform float uRout;
      uniform float uSpin;
      varying float vAlong;
      varying float vRadiusXZ;
      varying float vPulsePhase;
      varying float vArc;
      void main() {
        vAlong = aAlong;
        vPulsePhase = aPulsePhase;
        vArc = aArc;
        vec3 p = position;
        float rrRef = max(aOmegaR, uRim * 1.002);
        float dz = max(rrRef - uRim * 0.92, 0.12);
        float omega = uSpin * (1.12 / sqrt(dz) + 0.38);
        float wrot = uTime * omega + aPulsePhase * 0.02;
        float cs = cos(wrot);
        float sn = sin(wrot);
        mat2 rot = mat2(cs, -sn, sn, cs);
        p.xz = rot * p.xz;
        vRadiusXZ = length(p.xz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uGain;
      uniform float uTime;
      uniform float uRNucleus;
      uniform float uHoleSoft;
      uniform float uRout;
      varying float vAlong;
      varying float vRadiusXZ;
      varying float vPulsePhase;
      varying float vArc;
      ${glslDiskRamp}
      void main() {
        float spanHue = max(uRout - uRNucleus, 1e-4);
        float tHue = clamp((vRadiusXZ - uRNucleus) / spanHue, 0.0, 1.0);
        vec3 base = diskColorFromRadialT(tHue) * 0.94;
        float holeMask = smoothstep(uRNucleus, uRNucleus + uHoleSoft, vRadiusXZ);
        float endFade = smoothstep(0.0, 0.08, vAlong) * smoothstep(1.0, 0.9, vAlong);
        float slow = 0.52 + 0.48 * sin(uTime * 0.35 + vArc * 6.28318);
        float fast = 0.5 + 0.5 * sin(uTime * 1.45 + vPulsePhase + vAlong * 5.5);
        float breathe = pow(clamp(fast, 0.0, 1.0), 2.2) * slow;
        breathe = mix(0.22, 1.0, breathe);
        float a = breathe * endFade * uGain * holeMask;
        vec3 rgb = base * a * 1.22;
        gl_FragColor = vec4(rgb, clamp(a, 0.0, 0.88));
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: true,
  })
  return { geometry, material }
}

function createSharpParticleLayer(opts: {
  count: number
  rMin: number
  rMax: number
  ySpread: number
  uSize: number
  color: THREE.Color
  spinSign: number
  radialWander: number
  gain: number
  spotSigma: number
  coldMix: number
}): { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial } {
  const pos = new Float32Array(opts.count * 3)
  const seed = new Float32Array(opts.count)
  for (let i = 0; i < opts.count; i++) {
    const t = Math.random()
    const r = opts.rMin + t * (opts.rMax - opts.rMin)
    const ang = Math.random() * Math.PI * 2
    pos[i * 3] = Math.cos(ang) * r
    pos[i * 3 + 1] = (Math.random() - 0.5) * 2 * opts.ySpread
    pos[i * 3 + 2] = Math.sin(ang) * r
    seed[i] = Math.random() * 1000
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geom.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))

  const col = opts.color.clone()
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: opts.uSize },
      uRim: { value: DISK_R_IN },
      uRout: { value: DISK_R_OUT },
      uSpin: { value: opts.spinSign },
      uRadialWander: { value: opts.radialWander },
      uGain: { value: opts.gain },
      uSpotSigma: { value: opts.spotSigma },
      uColdMix: { value: opts.coldMix },
      uColor: { value: col },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uRim;
      uniform float uRout;
      uniform float uSpin;
      uniform float uRadialWander;
      uniform float uSize;
      uniform float uPixelRatio;
      varying float vRadial;
      varying float vJ;
      void main() {
        vec3 p = position;
        float ang = atan(p.z, p.x);
        float rr = length(p.xz);
        float dz = max(rr - uRim * 0.92, 0.12);
        float omega = uSpin * (1.12 / sqrt(dz) + 0.38);
        float w = uTime * omega + aSeed * 0.017;
        float cs = cos(w);
        float sn = sin(w);
        mat2 rot = mat2(cs, -sn, sn, cs);
        p.xz = rot * p.xz;
        float drift = sin(uTime * 0.55 + aSeed + ang * 3.0) * uRadialWander;
        p.xz *= 1.0 + drift * 0.035;
        float span = max(uRout - uRim, 0.001);
        vRadial = clamp((length(p.xz) - uRim) / span, 0.0, 1.0);
        vJ = fract(aSeed * 17.413);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float ps = uSize * uPixelRatio * (240.0 / max(-mv.z, 0.55));
        gl_PointSize = clamp(ps, 0.9, 64.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uGain;
      uniform float uSpotSigma;
      uniform float uColdMix;
      varying float vRadial;
      varying float vJ;
      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(uv, uv);
        if (r2 > 1.0) discard;
        float spot = exp(-r2 * uSpotSigma);
        float fr = smoothstep(0.45, 0.98, vRadial);
        float lu = dot(uColor, vec3(0.299, 0.587, 0.114));
        vec3 cold = lu * vec3(0.7, 0.46, 0.86) + vec3(0.02, 0.0, 0.03);
        vec3 base = mix(uColor, cold, fr * uColdMix);
        base *= 0.88 + 0.24 * vJ;
        vec3 rgb = base * spot * uGain;
        float alpha = spot * uGain * (0.55 + 0.25 * (1.0 - fr));
        gl_FragColor = vec4(rgb, clamp(alpha, 0.0, 0.72));
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: true,
  })
  return { geometry: geom, material: mat }
}

function makeDiskParticleSpriteTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.99)
  g.addColorStop(0.0, 'rgba(245,236,220,0.78)')
  g.addColorStop(0.08, 'rgba(235,210,175,0.62)')
  g.addColorStop(0.18, 'rgba(220,150,95,0.42)')
  g.addColorStop(0.34, 'rgba(185,85,48,0.24)')
  g.addColorStop(0.52, 'rgba(120,42,38,0.12)')
  g.addColorStop(0.72, 'rgba(55,22,40,0.06)')
  g.addColorStop(0.9, 'rgba(28,10,24,0.025)')
  g.addColorStop(1.0, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  const g2 = ctx.createRadialGradient(c, c, 0, c, c, c * 0.26)
  g2.addColorStop(0, 'rgba(240,228,210,0.05)')
  g2.addColorStop(0.55, 'rgba(200,160,190,0.025)')
  g2.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = true
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function makePhotonRingMat(inner: number, outer: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: inner },
      uOuter: { value: outer },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vW = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uInner;
      uniform float uOuter;
      varying vec3 vW;
      void main() {
        float r = length(vW.xz);
        if (r < uInner - 0.01 || r > uOuter + 0.01) discard;
        float t = (r - uInner) / max(uOuter - uInner, 0.001);
        float ang = atan(vW.z, vW.x);
        float shimmer = 0.5 + 0.5 * sin(ang * 48.0 - uTime * 6.5);
        float edge = smoothstep(0.0, 0.22, t) * (1.0 - smoothstep(0.78, 1.0, t));
        vec3 hot = vec3(0.98, 0.88, 0.78);
        vec3 warm = vec3(0.92, 0.42, 0.14);
        vec3 col = mix(warm, hot, pow(shimmer, 2.1));
        float a = edge * (0.32 + 0.58 * shimmer) * 0.78;
        gl_FragColor = vec4(col * (0.48 + 1.35 * edge), a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: true,
  })
}

function buildAccretionDiskParticles(): {
  geometry: THREE.BufferGeometry
  material: THREE.ShaderMaterial
  spriteTexture: THREE.CanvasTexture
} {
  const positions = new Float32Array(ACCRETION_PARTICLE_COUNT * 3)
  const colors = new Float32Array(ACCRETION_PARTICLE_COUNT * 3)
  const sizes = new Float32Array(ACCRETION_PARTICLE_COUNT)
  const aSeed = new Float32Array(ACCRETION_PARTICLE_COUNT)
  const aSoft = new Float32Array(ACCRETION_PARTICLE_COUNT)

  const tmp = new THREE.Color()
  const armOffsets = new Float32Array(ACCRETION_ARMS)
  for (let a = 0; a < ACCRETION_ARMS; a++) {
    armOffsets[a] = (a / ACCRETION_ARMS) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
  }

  const span = DISK_R_OUT - DISK_R_IN

  for (let i = 0; i < ACCRETION_PARTICLE_COUNT; i++) {
    const roll = Math.random()
    let population: 'bulge' | 'cloud' | 'arm'
    if (roll < ACCRETION_BULGE_RATIO) {
      population = 'bulge'
    } else if (roll < ACCRETION_BULGE_RATIO + ACCRETION_CLOUD_RATIO) {
      population = 'cloud'
    } else {
      population = 'arm'
    }

    let radius: number
    let angle: number

    if (population === 'bulge') {
      radius = DISK_R_IN + Math.pow(Math.random(), 2.2) * span * 0.14
      angle = Math.random() * Math.PI * 2
    } else if (population === 'cloud') {
      radius = DISK_R_IN + Math.pow(Math.random(), 0.34) * span
      angle = Math.random() * Math.PI * 2
    } else {
      radius =
        DISK_R_IN +
        Math.pow(Math.random(), 0.52) * span +
        (Math.random() - 0.5) *
          ACCRETION_ARM_RADIAL_SCATTER *
          span *
          0.05
      const branchIndex = i % ACCRETION_ARMS
      const branchAngle = armOffsets[branchIndex]
      const growthJitter = 0.88 + Math.random() * 0.24
      const spinAngle =
        Math.log(1 + Math.max(radius - DISK_R_IN, 0.001) * ACCRETION_SPIRAL_GROWTH * growthJitter) *
        ACCRETION_SPIRAL_TIGHTNESS
      const angularJitter =
        (Math.random() - 0.5) *
        2 *
        ACCRETION_ARM_ANGULAR_SCATTER *
        Math.pow(Math.random(), 1.35)
      angle = branchAngle + spinAngle + angularJitter
    }

    const radialT = (radius - DISK_R_IN) / Math.max(span, 1e-6)
    const baseScatter =
      population === 'cloud' ? ACCRETION_CLOUD_SCATTER : ACCRETION_ARM_RADIAL_SCATTER
    const scatterStrength = baseScatter + radialT * 0.25

    const sx =
      Math.pow(Math.random(), 3) *
      (Math.random() < 0.5 ? 1 : -1) *
      scatterStrength *
      radius *
      0.2
    const sz =
      Math.pow(Math.random(), 3) *
      (Math.random() < 0.5 ? 1 : -1) *
      scatterStrength *
      radius *
      0.2
    const thick =
      population === 'bulge'
        ? radius * 0.55
        : radius * ACCRETION_DISC_THICKNESS * (population === 'cloud' ? 2.0 : 1.15)
    const sy =
      Math.pow(Math.random(), 3) *
      (Math.random() < 0.5 ? 1 : -1) *
      thick

    const x = Math.cos(angle) * radius + sx
    const z = Math.sin(angle) * radius + sz
    const y = sy

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    diskColorFromRadialT(radialT, tmp, 0.9)
    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b

    const baseSize =
      population === 'bulge'
        ? 0.82
        : population === 'cloud'
          ? 0.32 + (1 - radialT) * 0.78
          : 0.4 + (1 - radialT) * 0.88
    sizes[i] = baseSize * (0.48 + Math.random() * 0.72)

    aSeed[i] = Math.random() * 1000
    aSoft[i] = Math.random()
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1))
  geometry.setAttribute('aSoft', new THREE.BufferAttribute(aSoft, 1))

  const spriteTexture = makeDiskParticleSpriteTexture()

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: 1 },
      uSize: { value: 28 },
      uTexture: { value: spriteTexture },
      uTime: { value: 0 },
      uRim: { value: DISK_R_IN },
      uRout: { value: DISK_R_OUT },
      uSpin: { value: 1.0 },
      uGain: { value: 0.22 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aSeed;
      attribute float aSoft;
      uniform float uPixelRatio;
      uniform float uSize;
      uniform float uTime;
      uniform float uRim;
      uniform float uRout;
      uniform float uSpin;
      varying vec3 vColor;
      varying float vTwinkle;
      varying float vRadial;
      varying float vSoft;
      void main() {
        vColor = color;
        vSoft = aSoft;
        vec3 p = position;
        float ang = atan(p.z, p.x);
        float rr = length(p.xz);
        float dz = max(rr - uRim * 0.92, 0.12);
        float omega = uSpin * (1.12 / sqrt(dz) + 0.38);
        float w = uTime * omega + aSeed * 0.017;
        float cs = cos(w);
        float sn = sin(w);
        mat2 rot = mat2(cs, -sn, sn, cs);
        p.xz = rot * p.xz;
        float angR = atan(p.z, p.x);
        float rra = length(p.xz);
        p.y += sin(uTime * 2.0 + aSeed * 1.4 + angR * 5.5) * 0.028 * pow(max(rra, 0.2), 0.42);
        float wobble =
          sin(uTime * 1.85 + aSeed + angR * 6.2) * 0.018 * rra +
          sin(uTime * 0.68 + angR * 3.1 + aSeed * 0.01) * 0.014 * rra;
        p.y += wobble;
        float span = max(uRout - uRim, 0.001);
        float rrAfter = length(p.xz);
        vRadial = clamp((rrAfter - uRim) / span, 0.0, 1.0);
        vTwinkle = 0.62 + 0.38 * sin(uTime * 2.9 + aSeed * 2.7 + ang * 4.0);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depthScale = 228.0 / max(-mvPosition.z, 0.55);
        gl_PointSize = aSize * uSize * uPixelRatio * depthScale;
        gl_PointSize = clamp(gl_PointSize, 1.1, 48.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTexture;
      uniform float uGain;
      varying vec3 vColor;
      varying float vTwinkle;
      varying float vRadial;
      varying float vSoft;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float circ = smoothstep(0.515, 0.478, d);
        if (circ <= 0.001) discard;
        vec4 tex = texture2D(uTexture, gl_PointCoord);
        float ta = smoothstep(0.008, 0.055, tex.a) * tex.a;
        float inward = 1.0 - vRadial;
        float heat = 0.38 + 1.55 * pow(inward, 1.65);
        heat *= mix(1.0, 0.58, smoothstep(0.88, 1.0, inward));
        float outerAtt = mix(1.0, 0.4, smoothstep(0.32, 1.0, vRadial));
        float tw = mix(0.95, 1.03, vTwinkle);
        vec3 rgb = vColor * tex.rgb * tw * uGain * heat * outerAtt;
        float refine = smoothstep(0.12, 0.42, inward) * (1.0 - smoothstep(0.55, 0.88, inward));
        rgb *= 1.0 + 0.06 * refine;
        rgb = mix(rgb, vec3(0.96, 0.9, 0.84), pow(inward, 3.8) * 0.07);
        float fr = smoothstep(0.52, 0.98, vRadial);
        float lu = dot(rgb, vec3(0.299, 0.587, 0.114));
        vec3 cold = lu * vec3(0.72, 0.48, 0.88) + vec3(0.02, 0.0, 0.03);
        rgb = mix(rgb, cold, fr * 0.68);
        rgb = pow(max(rgb, vec3(1e-6)), vec3(1.02));
        rgb *= 0.5 + 0.18 * pow(max(0.0, 1.0 - d * 2.0), 1.35);
        float alpha = ta * (0.38 + 0.14 * circ + 0.1 * vSoft);
        alpha *= mix(1.05, 0.48, smoothstep(0.0, 1.0, vRadial));
        alpha *= mix(0.52, 1.05, smoothstep(0.0, 0.92, vRadial));
        alpha *= uGain * 1.18 * circ;
        gl_FragColor = vec4(rgb, clamp(alpha, 0.0, 0.78));
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    toneMapped: true,
  })

  return { geometry, material, spriteTexture }
}

export function OutreachBlackHole() {
  const { gl } = useThree()

  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#10060e'),
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: true,
      }),
    [],
  )

  const haloRef = useRef<THREE.Mesh>(null)

  const photonInner = SHADOW_BALL_RADIUS * 1.008
  const photonOuter = SHADOW_BALL_RADIUS * 1.07
  const photonMat = useMemo(
    () => makePhotonRingMat(photonInner, photonOuter),
    [],
  )

  const accretion = useMemo(() => buildAccretionDiskParticles(), [])

  const filaments = useMemo(() => buildOrbitingFilamentLineSegments(), [])

  const layerRim = useMemo(
    () =>
      createSharpParticleLayer({
        count: LAYER_RIM_COUNT,
        rMin: DISK_R_IN * 1.01,
        rMax: DISK_R_IN * 1.22,
        ySpread: 0.042 * S,
        uSize: 15,
        color: new THREE.Color('#e6d2b8'),
        spinSign: 1,
        radialWander: 0.42,
        gain: 0.15,
        spotSigma: 28,
        coldMix: 0.06,
      }),
    [],
  )
  const layerDust = useMemo(
    () =>
      createSharpParticleLayer({
        count: LAYER_DUST_COUNT,
        rMin: DISK_R_IN * 1.04,
        rMax: DISK_R_OUT * 0.94,
        ySpread: 0.082 * S,
        uSize: 20,
        color: new THREE.Color('#b8825c'),
        spinSign: 1,
        radialWander: 1.12,
        gain: 0.1,
        spotSigma: 13,
        coldMix: 0.32,
      }),
    [],
  )
  const layerStream = useMemo(
    () =>
      createSharpParticleLayer({
        count: LAYER_STREAM_COUNT,
        rMin: DISK_R_OUT * 0.4,
        rMax: DISK_R_OUT * 1.02,
        ySpread: 0.15 * S,
        uSize: 23,
        color: new THREE.Color('#4a2030'),
        spinSign: 1,
        radialWander: 2.0,
        gain: 0.085,
        spotSigma: 10,
        coldMix: 0.82,
      }),
    [],
  )

  useEffect(() => {
    return () => {
      haloMat.dispose()
      photonMat.dispose()
      accretion.geometry.dispose()
      accretion.material.dispose()
      accretion.spriteTexture.dispose()
      filaments.geometry.dispose()
      filaments.material.dispose()
      layerRim.geometry.dispose()
      layerRim.material.dispose()
      layerDust.geometry.dispose()
      layerDust.material.dispose()
      layerStream.geometry.dispose()
      layerStream.material.dispose()
    }
  }, [haloMat, photonMat, accretion, filaments, layerRim, layerDust, layerStream])

  useFrame((_, delta) => {
    const t = photonMat.uniforms.uTime.value + delta
    photonMat.uniforms.uTime.value = t

    const pr = Math.min(gl.getPixelRatio(), 2)
    accretion.material.uniforms.uTime.value = t
    accretion.material.uniforms.uPixelRatio.value = pr
    filaments.material.uniforms.uTime.value = t
    layerRim.material.uniforms.uTime.value = t
    layerRim.material.uniforms.uPixelRatio.value = pr
    layerDust.material.uniforms.uTime.value = t
    layerDust.material.uniforms.uPixelRatio.value = pr
    layerStream.material.uniforms.uTime.value = t
    layerStream.material.uniforms.uPixelRatio.value = pr

    if (haloRef.current) haloRef.current.rotation.z -= delta * 0.016
  })

  return (
    <group rotation={[0.11, -0.06, 0.04]}>
      <ambientLight intensity={0.08} />
      <pointLight
        position={[16 * S, 10 * S, 6 * S]}
        intensity={2.55}
        color="#fff5ec"
        distance={140 * S}
        decay={2}
      />
      <pointLight
        position={[-20 * S, -4 * S, -10 * S]}
        intensity={0.52}
        color="#ff5520"
        distance={140 * S}
        decay={2}
      />
      <pointLight
        position={[0, 18 * S, 0]}
        intensity={0.35}
        color="#ffccb0"
        distance={90 * S}
        decay={2}
      />

      <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]} material={haloMat}>
        <ringGeometry args={[RIM * 0.88, 23 * S, 112, 1]} />
      </mesh>

      <mesh renderOrder={-3} scale={[1, 0.54, 1]}>
        <sphereGeometry args={[SHADOW_BALL_RADIUS, 80, 64]} />
        <meshBasicMaterial
          color="#000000"
          depthWrite
          depthTest
          toneMapped={false}
        />
      </mesh>

      <group scale={[1, LENTICULAR_Y_SCALE, 1]}>
        <points
          geometry={accretion.geometry}
          material={accretion.material}
          renderOrder={2}
        />
        <points
          geometry={layerDust.geometry}
          material={layerDust.material}
          renderOrder={3}
        />
        <points
          geometry={layerStream.geometry}
          material={layerStream.material}
          renderOrder={4}
        />
        <points
          geometry={layerRim.geometry}
          material={layerRim.material}
          renderOrder={5}
        />
        <lineSegments
          geometry={filaments.geometry}
          material={filaments.material}
          renderOrder={12}
        />
      </group>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        material={photonMat}
        renderOrder={3}
        scale={[1, LENTICULAR_Y_SCALE, 1]}
      >
        <ringGeometry args={[photonInner, photonOuter, 128, 1]} />
      </mesh>

      <mesh position={[-19 * S, 0.95 * S, 6.5 * S]}>
        <sphereGeometry args={[0.46 * S, 20, 20]} />
        <meshBasicMaterial color="#050302" />
      </mesh>
    </group>
  )
}
