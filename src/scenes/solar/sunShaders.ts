/**
 * GLSL for the procedural Sun. Everything is driven by 3D simplex noise
 * sampled on the sphere's own normal, so there are no UV seams and the
 * surface can be animated without a texture.
 */

/** Ashima Arts simplex noise (MIT). */
const SIMPLEX_NOISE_3D = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      sum += amp * snoise(p);
      p *= 2.05;
      amp *= 0.5;
    }
    return sum;
  }
`

const SHELL_VERT = /* glsl */ `
  varying vec3 vObjectNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vObjectNormal = normalize(position);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

export const SUN_SURFACE_VERT = SHELL_VERT

export const SUN_SURFACE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uBrightness;
  uniform vec3 uColorDeep;
  uniform vec3 uColorMid;
  uniform vec3 uColorHot;

  varying vec3 vObjectNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  ${SIMPLEX_NOISE_3D}

  void main() {
    vec3 dir = normalize(vObjectNormal);

    // Slow large convection cells + faster fine granulation.
    float cells = fbm(dir * 3.2 + vec3(0.0, uTime * 0.05, 0.0));
    float grains = fbm(dir * 11.0 - vec3(uTime * 0.09, 0.0, uTime * 0.04));
    float n = clamp(0.5 + 0.55 * cells + 0.35 * grains, 0.0, 1.0);

    vec3 color = mix(uColorDeep, uColorMid, smoothstep(0.15, 0.6, n));
    color = mix(color, uColorHot, smoothstep(0.62, 0.95, n));

    // Limb darkening: real stars are dimmer toward the edge.
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float facing = clamp(dot(normalize(vWorldNormal), viewDir), 0.0, 1.0);
    color *= mix(0.55, 1.0, pow(facing, 0.55));

    gl_FragColor = vec4(color * uBrightness, 1.0);
  }
`

export const SUN_CORONA_VERT = SHELL_VERT

/**
 * Rendered on the back faces of a shell larger than the Sun: the part behind
 * the disc is depth-culled, leaving a ring that is brightest at the surface
 * and fades outward. Noise breaks it into slowly moving flares.
 */
export const SUN_CORONA_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uFlare;
  uniform vec3 uColorInner;
  uniform vec3 uColorOuter;

  varying vec3 vObjectNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  ${SIMPLEX_NOISE_3D}

  void main() {
    vec3 dir = normalize(vObjectNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float facing = clamp(-dot(normalize(vWorldNormal), viewDir), 0.0, 1.0);
    float falloff = pow(facing, uPower);

    float flare = snoise(dir * 2.6 + vec3(0.0, uTime * 0.12, 0.0));
    flare += 0.5 * snoise(dir * 7.0 - vec3(uTime * 0.2, 0.0, 0.0));
    flare = 1.0 - uFlare + uFlare * (0.5 + 0.5 * flare);

    vec3 color = mix(uColorOuter, uColorInner, falloff);
    float alpha = falloff * flare * uIntensity;
    gl_FragColor = vec4(color * alpha, alpha);
  }
`
