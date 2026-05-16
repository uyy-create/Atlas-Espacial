import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSolarStore } from '../store/useSolarStore'

/**
 * EXPERIMENTAL — no usado en la escena por defecto (`OutreachBlackHole` es la ruta estable).
 * Schwarzschild null geodesics in the equatorial plane: el disco vive en el plano **y = 0**
 * (plano horizontal **xz** en Three.js; normal del disco = **eje +Y**).
 * La cámara por defecto mira casi desde +Z para que la distorsión lea como banda horizontal.
 *
 * G = c = M = 1: horizonte r = 2, ODE d²u/dφ² + u = 3u² con u = 1/r. Kerr no modelado.
 */

const VISUAL_SCALE = 2.95
const S = VISUAL_SCALE

/** Imposing horizon in world units (same order as previous scene). */
const RS_WORLD = 2.35 * S
const DISK_IN_WORLD = 2.55 * S
const DISK_OUT_WORLD = 52 * S

const triPositions = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0])

const vertexShader = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2 uResolution;
  uniform vec3 uCameraPos;
  uniform mat4 uInverseProjection;
  uniform mat4 uInverseView;
  uniform float uTime;
  uniform float uRs;
  uniform float uDiskIn;
  uniform float uDiskOut;

  const int MAX_STEPS = 240;
  const float DPHI = 0.012;
  const float R_NAT_HORIZON = 2.0;

  vec3 worldRayDir(vec2 frag) {
    vec2 ndc = (frag / uResolution) * 2.0 - 1.0;
    vec4 clip = vec4(ndc, -1.0, 1.0);
    vec4 eye = uInverseProjection * clip;
    eye = vec4(eye.xy, -1.0, 0.0);
    vec4 world = uInverseView * eye;
    vec3 w = world.xyz;
    float len = length(w);
    if (len < 1e-6) return vec3(0.0, 0.0, -1.0);
    return w / len;
  }

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  vec3 starfield(vec3 rd) {
    vec3 p = floor(rd * 350.0);
    float h = hash(p);
    float tw = smoothstep(0.92, 1.0, h);
    vec3 cool = vec3(0.88, 0.92, 1.0);
    vec3 warm = vec3(1.0, 0.98, 0.94);
    vec3 starCol = mix(cool, warm, 0.35 + 0.65 * h);
    return starCol * (tw * 0.62 + 0.06 * h);
  }

  /** Keplerian-ish tangential speed — crece al acercarse al horizonte (plasma más violento). */
  float orbSpeed(float rNat) {
    float dz = max(rNat - R_NAT_HORIZON, 0.08);
    return 1.05 / sqrt(dz);
  }

  /** ω efectivo mayor cerca del horizonte → espirales más rápidas y más rojizo. */
  float omegaDisk(float rNat) {
    float dz = max(rNat - R_NAT_HORIZON, 0.06);
    float boost = 1.0 / (dz * dz);
    return clamp(9.0 + 2.8 * boost, 9.0, 95.0);
  }

  /** Oro → naranja; mucho más rojo cerca de r_nat = 2 (interior del disco). */
  vec3 sampleDisk(float rNat, float phi, float time) {
    if (rNat < uDiskIn * 2.0 / uRs || rNat > uDiskOut * 2.0 / uRs) return vec3(0.0);

    float om = omegaDisk(rNat);
    float vphi = orbSpeed(rNat);
    float phase = phi + time * om * vphi;
    float spiral = sin(14.0 * log(max(rNat, 2.05)) - phase * 2.4);
    float bands = 0.55 + 0.45 * sin(log(max(rNat, 2.02)) * 22.0 - time * om * 0.82);
    float filaments = 0.5 + 0.5 * sin(phi * 7.0 + log(max(rNat, 2.0)) * 9.0 - time * om * 0.55);

    float dop = 0.38 + 0.62 * (0.5 + 0.5 * sin(phi + time * om * vphi));
    float beam = pow(dop, 1.2);

    float t = smoothstep(uDiskIn * 2.0 / uRs, uDiskOut * 2.0 / uRs, rNat);

    vec3 cCore = vec3(1.0, 0.62, 0.18);
    vec3 cHot = vec3(1.0, 0.38, 0.08);
    vec3 cAmber = vec3(0.98, 0.22, 0.04);
    vec3 cOrange = vec3(0.9, 0.12, 0.03);
    vec3 cEmber = vec3(0.72, 0.06, 0.02);
    vec3 cRust = vec3(0.45, 0.03, 0.012);
    vec3 cRim = vec3(0.22, 0.015, 0.008);

    vec3 col = cCore;
    col = mix(col, cHot, smoothstep(0.0, 0.14, t));
    col = mix(col, cAmber, smoothstep(0.1, 0.32, t));
    col = mix(col, cOrange, smoothstep(0.24, 0.52, t));
    col = mix(col, cEmber, smoothstep(0.44, 0.76, t));
    col = mix(col, cRust, smoothstep(0.66, 0.96, t));
    col = mix(col, cRim, smoothstep(0.88, 1.0, t));

    float armHot = smoothstep(0.15, 0.95, spiral * 0.5 + 0.5);
    col = mix(col, mix(cOrange, vec3(1.0, 0.25, 0.06), 0.55), 0.42 * armHot * (1.0 - t * 0.65));
    col = mix(col, vec3(0.95, 0.08, 0.04), 0.28 * filaments * bands * (1.0 - t * 0.45));

    float innerStress = exp(-(max(rNat, 2.08) - 2.08) / 0.38);
    col *= mix(vec3(1.0), vec3(1.32, 0.36, 0.22), clamp(innerStress * 0.72, 0.0, 0.92));

    float heat = pow(max(0.0, 1.0 - (rNat - 2.9) / 22.0), 1.75);
    float emis = heat * bands * (0.2 + 0.8 * spiral * spiral) * beam;
    float gRed = sqrt(clamp(1.0 - R_NAT_HORIZON / max(rNat, 2.001), 0.15, 1.0));
    col *= gRed;
    return clamp(col * emis * 2.55, vec3(0.0), vec3(40.0));
  }

  /** RK2 (Heun) un paso para u'' + u = 3u² con u = 1/r_nat, v = du/dφ. */
  void stepGeodesic(inout float u, inout float v, float dphi) {
    float h = dphi;
    float k1v = (-u + 3.0 * u * u) * h;
    float k1u = v * h;
    float um = clamp(u + 0.5 * k1u, 0.04, 1.65);
    float vm = clamp(v + 0.5 * k1v, -4.5, 4.5);
    float k2v = (-um + 3.0 * um * um) * h;
    float k2u = vm * h;
    u = clamp(u + k2u, 0.04, 1.65);
    v = clamp(v + k2v, -4.5, 4.5);
  }

  /** Silueta esférica euclidiana + borde caliente (solo lectura visual 3D, no geodésica). */
  vec3 nucleusRim(vec3 ro, vec3 rd, float uRsPhys) {
    float cR = uRsPhys * 0.985;
    float B = dot(ro, rd);
    float C = dot(ro, ro) - cR * cR;
    float disc = B * B - C;
    if (disc <= 0.0) return vec3(0.0);
    float s = sqrt(disc);
    float t1 = -B - s;
    float t2 = -B + s;
    float tHit = (t1 > 1e-3) ? t1 : ((t2 > 1e-3) ? t2 : -1.0);
    if (tHit < 0.0) return vec3(0.0);
    vec3 Ps = ro + rd * tHit;
    vec3 Ns = normalize(Ps);
    float mu = clamp(dot(Ns, -rd), 0.0, 1.0);
    float rim = pow(1.0 - mu, 2.8);
    float body = pow(mu, 0.35);
    vec3 edge = vec3(1.0, 0.35, 0.1) * rim * 1.45;
    vec3 deep = vec3(0.002, 0.0, 0.0) * body;
    return deep + edge;
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    vec3 ro = uCameraPos;
    vec3 rd = worldRayDir(frag);

    float y0 = ro.y;
    float yd = rd.y;
    float t0 = 0.0;
    if (abs(yd) > 1e-5) {
      t0 = -y0 / yd;
    }
    if (t0 < 0.0) t0 = 0.0;

    vec3 p0 = ro + rd * t0;
    vec3 rd0 = rd;
    if (length(rd0.xz) < 1e-4) {
      gl_FragColor = vec4(starfield(rd), 1.0);
      return;
    }
    rd0.xz = normalize(rd0.xz);
    float r0 = length(p0.xz);
    if (r0 < 1e-4) {
      gl_FragColor = vec4(starfield(rd), 1.0);
      return;
    }
    float phi0 = atan(p0.z, p0.x);

    float rNat0 = r0 * 2.0 / uRs;
    float u0 = 1.0 / max(rNat0, 0.08);
    u0 = clamp(u0, 0.05, 1.6);
    float drdt = dot(rd0.xz, p0.xz / r0);
    float dphidt = (p0.x * rd0.z - p0.z * rd0.x) / max(r0 * r0, 1e-6);
    float drnatdt = (2.0 / uRs) * drdt;
    float du_dt = -drnatdt / max(rNat0 * rNat0, 1e-5);
    float v0 = du_dt / max(abs(dphidt), 1e-5);
    v0 = clamp(v0, -4.0, 4.0);

    float phi = phi0;
    float u = u0;
    float v = v0;
    float dphi = (dphidt >= 0.0) ? 1.0 : -1.0;

    vec3 acc = vec3(0.0);
    float opacity = 0.0;
    bool dead = false;
    bool escaped = false;

    for (int i = 0; i < MAX_STEPS; i++) {
      float rNat = 1.0 / max(u, 1e-4);

      if (rNat < R_NAT_HORIZON + 0.014) {
        dead = true;
        break;
      }

      vec3 dcol = sampleDisk(rNat, phi, uTime);
      float add = length(dcol);
      if (add > 1e-5) {
        acc += dcol * (1.0 - opacity) * 0.12;
        opacity = min(1.0, opacity + add * 0.055);
      }

      if (rNat > uDiskOut * 2.0 / uRs * 1.4 && u < 0.08) {
        escaped = true;
        break;
      }

      stepGeodesic(u, v, DPHI * dphi);
      phi += DPHI * dphi;
    }

    vec3 sky = starfield(rd);
    if (escaped || (!dead && opacity < 0.99)) {
      acc += sky * (1.0 - opacity);
    }

    vec3 nuc = nucleusRim(ro, rd, uRs);
    if (dead) {
      acc = mix(vec3(0.0), acc, clamp(opacity * 1.15, 0.0, 1.0));
      acc = acc * 0.08 + nuc;
    } else {
      acc += nuc * (1.0 - smoothstep(0.0, 0.85, opacity)) * 0.55;
    }

    acc = acc / (acc + vec3(0.42));
    acc = clamp(acc, vec3(0.0), vec3(1.0));
    gl_FragColor = vec4(acc, 1.0);
  }
`

export function RelativisticBlackHole() {
  const { camera, size, gl } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)

  const visible = useSolarStore(
    (s) =>
      s.view === 'blackHole' ||
      (s.mode === 'warping' && s.warpTargetView === 'blackHole'),
  )

  const uniforms = useMemo(
    () => ({
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCameraPos: { value: new THREE.Vector3() },
      uInverseProjection: { value: new THREE.Matrix4() },
      uInverseView: { value: new THREE.Matrix4() },
      uTime: { value: 0 },
      uRs: { value: RS_WORLD },
      uDiskIn: { value: DISK_IN_WORLD },
      uDiskOut: { value: DISK_OUT_WORLD },
    }),
    [],
  )

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(triPositions, 3))
    return g
  }, [])

  const mat = useMemo(
    () =>
      new THREE.RawShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        depthTest: false,
        depthWrite: false,
        toneMapped: true,
      }),
    [uniforms],
  )

  useFrame((state) => {
    if (!visible) return
    const mesh = meshRef.current
    const m = mesh?.material as THREE.RawShaderMaterial | undefined
    if (!m) return
    const w = size.width * gl.getPixelRatio()
    const h = size.height * gl.getPixelRatio()
    m.uniforms.uResolution.value.set(w, h)
    m.uniforms.uCameraPos.value.copy(camera.position)
    m.uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse)
    m.uniforms.uInverseView.value.copy(camera.matrixWorld)
    m.uniforms.uTime.value = state.clock.elapsedTime
  })

  if (!visible) return null

  return (
    <mesh
      ref={meshRef}
      geometry={geom}
      material={mat}
      frustumCulled={false}
      renderOrder={2000}
    />
  )
}
