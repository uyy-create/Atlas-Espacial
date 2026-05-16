import * as THREE from 'three'

/**
 * Raymarching black hole (Shadertoy tsBXW3). Plan C hybrid.
 *
 * Edita BLACK_HOLE_DEFAULTS para retocar el aspecto; los valores se pasan
 * al shader como uniforms (salvo diskLayers, que fija el bucle del disco).
 *
 * Copia de seguridad: blackHoleDefaults.snapshot.ts
 */

export const BLACK_HOLE_RAYMARCH_VERT = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`

/**
 * Panel de ajuste manual del agujero negro.
 * Tras cambiar diskLayers hay que recargar la página (define GLSL).
 */
export const BLACK_HOLE_DEFAULTS = {
  // ── Agujero y disco de acreción ──────────────────────────────────────
  /** Radio de Schwarzschild en unidades del shader (original Shadertoy: 0.3). Más alto = BH y disco más grandes. */
  size: 0.3,
  /** Velocidad de rotación del disco (original _Speed: 3). */
  diskSpeed: 3,
  /** Capas del raymarch del disco (original _Steps: 12). Más = disco más denso, más coste GPU. */
  diskLayers: 12,
  /** Multiplicador del brillo base del gas del disco. */
  diskBrightness: 2.0,
  /** Intensidad del brillo rim naranja/blanco en el borde interno del disco. */
  diskRimBoost: 100.0,
  /** Frecuencia del ruido en el patrón del disco (original: 70). */
  diskNoiseFreq: 70.0,
  /** Color cálido del disco (centro / interior). RGB 0–1. */
  diskColorHot: [1.0, 0.8, 0.0] as const,
  /** Color frío del disco (exterior atenuado). RGB 0–1. */
  diskColorCool: [0.5, 0.13, 0.02] as const,

  // ── Cámara cinemática (vista fija Shadertoy) ─────────────────────────
  /** Distancia de la cámara al BH (>1 aleja, <1 acerca). */
  camDistance: 1.22,
  /** Componente Y del ángulo de encuadre (inclinación del plano del disco). */
  camAngleY: 0.2,
  /** Ajuste fino del pitch tras rotar la cámara (original: 0.3). */
  camPitchTrim: 0.1,

  // ── Encuadre en pantalla (fragCoordRot del original) ───────────────────
  /** Rotación del muestreo en grados (~10° en el original). */
  frameRotDeg: 10.0,
  /** Desplazamiento horizontal del encuadre (fracción del ancho, original: -0.06). */
  frameOffsetX: -0.06,
  /** Desplazamiento vertical del encuadre (fracción del alto, original: 0.12). */
  frameOffsetY: 0.12,

  // ── Fondo estrellado ───────────────────────────────────────────────────
  /** Brillo de las estrellas puntuales (original clamp ×100, aquí ×72). */
  starBrightness: 72.0,
  /** Exponente que afila las estrellas (más alto = puntos más finos). */
  starSharpness: 156.0,
  /** Velocidad del parpadeo (twinkle); 0 = estrellas fijas. */
  starTwinkleSpeed: 9.35,
  /** Intensidad del parpadeo (0–1; ~0.25–0.4 suele verse natural). */
  starTwinkleAmount: 0.42,
  /** Velocidad de deriva lenta del cielo estrellado. */
  starDriftSpeed: 0.155,
  /** Amplitud de la deriva (más alto = más movimiento visible). */
  starDriftScale: 0.034,

  // ── Lente gravitatoria y halos ─────────────────────────────────────────
  /** Fuerza de curvatura de los rayos (original: 0.625). Más = más lente. */
  bendStrength: 0.625,
  /** Brillo del glow blanco junto al horizonte (original acumulado ×0.01). */
  glowStrength: 0.02,
  /** Color RGB del glow cercano al horizonte. */
  glowColor: [1.2, 1.1, 1.0] as const,
  /** A partir de qué distancia al centro empieza el glow (original: centDist×2 − 1.2). */
  glowHorizon: 1.5,
  /** Escala del anillo exterior lensado (× uBhSize; original ~90). */
  lensedBgRadius: 90.0,
  /** Opacidad del fondo muy lensado (0–1; menor = anillo exterior más tenue). */
  lensedBgStrength: 0.12,
  /** Compresión de highlights en el fondo lensado (más alto = menos deslumbramiento). */
  lensedBgKnee: 1.55,
  /**
   * Radio mínimo (× uBhSize) para el rim del disco; evita pico blanco en el horizonte.
   * Sube si la línea blanca persiste (p. ej. 0.16); baja si el borde se ve apagado.
   */
  horizonRimMinRadius: 0.05,
  /**
   * Atenúa el glow al cruzar el horizonte (0 = sin glow en la silueta, 1 = original).
   */
  horizonSilhouetteGlow: 0.01,

  // ── Salida de imagen ───────────────────────────────────────────────────
  /** Antialiasing por píxel: 1 rápido, 2 más suave. */
  aa: 2,
  /** Curva final pow(rgb, gamma): menor = más contraste, mayor = más suave. */
  outputGamma: 0.68,
} as const

export type BlackHoleDefaults = typeof BLACK_HOLE_DEFAULTS

function frameRotFromDeg(deg: number) {
  const rad = (deg * Math.PI) / 180
  return { cos: Math.cos(rad), sin: Math.sin(rad) }
}

function buildFragmentShader(diskLayers: number): string {
  return /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uUseShadertoyCamera;
  uniform vec3 uCameraPosition;
  uniform mat4 uInverseProjectionMatrix;
  uniform mat4 uInverseViewMatrix;

  uniform float uBhSize;
  uniform float uDiskSpeed;
  uniform float uAa;
  uniform float uCamDistance;
  uniform float uCamAngleY;
  uniform float uCamPitchTrim;
  uniform vec2 uFrameRot;
  uniform vec2 uFrameOffset;
  uniform float uGlowStrength;
  uniform vec3 uGlowColor;
  uniform float uGlowHorizon;
  uniform float uBendStrength;
  uniform float uLensedBgStrength;
  uniform float uLensedBgKnee;
  uniform float uLensedBgRadius;
  uniform float uHorizonRimMinRadius;
  uniform float uHorizonSilhouetteGlow;
  uniform float uStarBrightness;
  uniform float uStarSharpness;
  uniform float uStarTwinkleSpeed;
  uniform float uStarTwinkleAmount;
  uniform float uStarDriftSpeed;
  uniform float uStarDriftScale;
  uniform float uDiskBrightness;
  uniform float uDiskRimBoost;
  uniform float uDiskNoiseFreq;
  uniform vec3 uDiskColorHot;
  uniform vec3 uDiskColorCool;
  uniform float uOutputGamma;

  #define STEPS ${diskLayers}

  float hash(float x) { return fract(sin(x) * 152754.742); }
  float hash(vec2 x) { return hash(x.x + hash(x.y)); }

  float valueNoise(vec2 p, float f) {
    float bl = hash(floor(p * f + vec2(0.0, 0.0)));
    float br = hash(floor(p * f + vec2(1.0, 0.0)));
    float tl = hash(floor(p * f + vec2(0.0, 1.0)));
    float tr = hash(floor(p * f + vec2(1.0, 1.0)));
    vec2 fr = fract(p * f);
    fr = (3.0 - 2.0 * fr) * fr * fr;
    float b = mix(bl, br, fr.x);
    float t = mix(tl, tr, fr.x);
    return mix(b, t, fr.y);
  }

  void rotateVec(inout vec3 vector, vec2 angle) {
    vector.yz =
      cos(angle.y) * vector.yz + sin(angle.y) * vec2(-1.0, 1.0) * vector.zy;
    vector.xz =
      cos(angle.x) * vector.xz + sin(angle.x) * vec2(-1.0, 1.0) * vector.zx;
  }

  void setupShadertoyCamera(out vec3 ray, out vec3 pos, vec2 fragCoordRot, vec2 subPixel) {
    ray = normalize(
      vec3((fragCoordRot - uResolution * 0.5 + subPixel) / uResolution.x, 1.0)
    );

    float mouseY = 0.0;
    float depthTerm = 20.0 * mouseY / uResolution.y - 10.0;
    pos = vec3(0.0, 0.05, -depthTerm * depthTerm * 0.05);

    vec2 angle = vec2(0.0, uCamAngleY);
    angle.y = (2.0 * mouseY / uResolution.y) * 3.14159265 + 0.1 + 3.14159265;

    float dist = length(pos);
    rotateVec(pos, angle);
    angle.xy -= min(uCamPitchTrim / max(dist, 1e-4), 3.14159265) * vec2(1.0, 0.5);
    rotateVec(ray, angle);
    pos *= uCamDistance;
  }

  vec3 worldRay(vec2 uv) {
    vec2 ndc = uv * 2.0 - 1.0;
    vec4 clip = vec4(ndc, 1.0, 1.0);
    vec4 view = uInverseProjectionMatrix * clip;
    view.xyz /= view.w;
    return normalize((uInverseViewMatrix * vec4(normalize(view.xyz), 0.0)).xyz);
  }

  vec4 sampleBackground(vec3 ray) {
    vec2 uv = ray.xy;
    if (abs(ray.x) > 0.5) uv.x = ray.z;
    else if (abs(ray.y) > 0.5) uv.y = ray.z;

    float tDrift = uTime * uStarDriftSpeed;
    vec2 drift = vec2(sin(tDrift * 0.71), cos(tDrift * 0.53)) * uStarDriftScale;
    vec2 uvAnim = uv + drift;

    float brightness = valueNoise(uvAnim * 3.0, 100.0);
    float color = valueNoise(uvAnim * 2.0 + 1.73, 20.0);
    brightness = pow(brightness, uStarSharpness);
    brightness = clamp(brightness * uStarBrightness, 0.0, 1.0);

    float phase = hash(uvAnim * 127.1) * 6.2831853;
    float twinkle =
      1.0 +
      uStarTwinkleAmount * sin(uTime * uStarTwinkleSpeed + phase) +
      uStarTwinkleAmount * 0.38 * sin(uTime * uStarTwinkleSpeed * 2.17 + phase * 1.63);
    brightness *= clamp(twinkle, 0.12, 1.0);

    vec3 stars = brightness * mix(vec3(1.0, 0.6, 0.2), vec3(0.2, 0.6, 1.0), color);

    return vec4(stars, 1.0);
  }

  vec4 raymarchDisk(vec3 ray, vec3 zeroPos) {
    vec3 position = zeroPos;
    float lengthPos = length(position.xz);
    float dist =
      min(1.0, lengthPos * (1.0 / uBhSize) * 0.5) *
      uBhSize *
      0.4 *
      (1.0 / float(STEPS)) /
      max(abs(ray.y), 1e-4);

    position += dist * float(STEPS) * ray * 0.5;

    vec2 deltaPos;
    deltaPos.x = -zeroPos.z * 0.01 + zeroPos.x;
    deltaPos.y = zeroPos.x * 0.01 + zeroPos.z;
    deltaPos = normalize(deltaPos - zeroPos.xz);

    float parallel = dot(ray.xz, deltaPos);
    parallel /= sqrt(max(lengthPos, 1e-4));
    parallel *= 0.5;
    float redShift = parallel + 0.3;
    redShift *= redShift;
    redShift = clamp(redShift, 0.0, 1.0);

    float disMix = clamp((lengthPos - uBhSize * 2.0) * (1.0 / uBhSize) * 0.24, 0.0, 1.0);
    vec3 insideCol = mix(uDiskColorHot, uDiskColorCool * 0.2, disMix);
    insideCol *= mix(vec3(0.4, 0.2, 0.1), vec3(1.6, 2.4, 4.0), redShift);
    insideCol *= 1.25;
    redShift += 0.12;
    redShift *= redShift;

    vec4 o = vec4(0.0);

    for (int i = 0; i < STEPS; i++) {
      float fi = float(i);
      position -= dist * ray;

      float intensity = clamp(1.0 - abs((fi - 0.8) * (1.0 / float(STEPS)) * 2.0), 0.0, 1.0);
      lengthPos = length(position.xz);
      float distMult = 1.0;
      distMult *= clamp((lengthPos - uBhSize * 0.75) * (1.0 / uBhSize) * 1.5, 0.0, 1.0);
      distMult *= clamp((uBhSize * 10.0 - lengthPos) * (1.0 / uBhSize) * 0.2, 0.0, 1.0);
      distMult *= distMult;

      float u = lengthPos + uTime * uBhSize * 0.3 + intensity * uBhSize * 0.2;

      vec2 xy;
      float rot = mod(uTime * uDiskSpeed, 8192.0);
      xy.x = -position.z * sin(rot) + position.x * cos(rot);
      xy.y = position.x * sin(rot) + position.z * cos(rot);

      float x = abs(xy.x / max(xy.y, 1e-4));
      float ang = 0.02 * atan(x);

      float noise = valueNoise(vec2(ang, u * (1.0 / uBhSize) * 0.05), uDiskNoiseFreq);
      noise = noise * 0.66 + 0.33 * valueNoise(vec2(ang, u * (1.0 / uBhSize) * 0.05), uDiskNoiseFreq * 2.0);

      float extraWidth =
        noise * 1.0 * (1.0 - clamp(fi * (1.0 / float(STEPS)) * 2.0 - 1.0, 0.0, 1.0));

      float alpha = clamp(
        noise * (intensity + extraWidth) * ((1.0 / uBhSize) * 10.0 + 0.01) * dist * distMult,
        0.0,
        1.0
      );

      vec3 col =
        uDiskBrightness * mix(vec3(0.3, 0.2, 0.15) * insideCol, insideCol, min(1.0, intensity * 2.0));
      o = clamp(
        vec4(col * alpha + o.rgb * (1.0 - alpha), o.a * (1.0 - alpha) + alpha),
        vec4(0.0),
        vec4(1.0)
      );

      lengthPos *= 1.0 / uBhSize;
      float rimR2 = lengthPos * lengthPos;
      float rimMin2 = uHorizonRimMinRadius * uHorizonRimMinRadius;
      float rimFalloff = smoothstep(rimMin2 * 0.6, rimMin2 * 1.4, rimR2);
      o.rgb +=
        redShift *
        (intensity * 1.0 + 0.5) *
        (1.0 / float(STEPS)) *
        uDiskRimBoost *
        distMult *
        rimFalloff /
        max(rimR2, rimMin2);
    }

    o.rgb = clamp(o.rgb - 0.005, 0.0, 1.0);
    return o;
  }

  vec3 softenLensedBackground(vec3 bg, float closestApproach) {
    float lum = max(max(bg.r, bg.g), bg.b);
    bg /= 1.0 + lum * uLensedBgKnee;
    float lensing = 1.0 - clamp(closestApproach / (uBhSize * uLensedBgRadius), 0.0, 1.0);
    bg *= mix(1.0, uLensedBgStrength, lensing * lensing);
    return bg;
  }

  vec4 traceScene(vec3 ray, vec3 pos) {
    vec4 col = vec4(0.0);
    vec4 glow = vec4(0.0);
    vec4 outCol = vec4(100.0);
    float closestApproach = 1e10;

    for (int disks = 0; disks < 20; disks++) {
      for (int h = 0; h < 6; h++) {
        float dotpos = dot(pos, pos);
        float invDist = inversesqrt(max(dotpos, 1e-8));
        float centDist = dotpos * invDist;
        closestApproach = min(closestApproach, centDist);
        float stepDist = 0.92 * abs(pos.y / max(ray.y, 1e-4));
        float farLimit = centDist * 0.5;
        float closeLimit = centDist * 0.1 + 0.05 * centDist * centDist * (1.0 / uBhSize);
        stepDist = min(stepDist, min(farLimit, closeLimit));

        float invDistSqr = invDist * invDist;
        float bendForce = stepDist * invDistSqr * uBhSize * uBendStrength;
        ray = normalize(ray - (bendForce * invDist) * pos);
        pos += stepDist * ray;

        float glowBand = clamp(centDist * 2.0 - uGlowHorizon, 0.0, 1.0);
        float glowHorizFade = smoothstep(uBhSize * 0.04, uBhSize * 0.14, centDist);
        glow +=
          vec4(uGlowColor, 1.0) *
          (0.01 * uGlowStrength * stepDist * invDistSqr * invDistSqr *
            glowBand * glowHorizFade);
      }

      float dist2 = length(pos);

      if (dist2 < uBhSize * 0.1) {
        float silFade = smoothstep(uBhSize * 0.04, uBhSize * 0.095, dist2);
        float glowAtHorizon = uHorizonSilhouetteGlow * silFade;
        outCol = vec4(
          col.rgb * col.a + glow.rgb * (1.0 - col.a) * glowAtHorizon,
          1.0
        );
        break;
      } else if (dist2 > uBhSize * 1000.0) {
        vec3 bgRgb = softenLensedBackground(sampleBackground(ray).rgb, closestApproach);
        outCol = vec4(
          col.rgb * col.a + bgRgb * (1.0 - col.a) + glow.rgb * (1.0 - col.a),
          1.0
        );
        break;
      } else if (abs(pos.y) <= uBhSize * 0.002) {
        vec4 diskCol = raymarchDisk(ray, pos);
        pos.y = 0.0;
        pos += abs(uBhSize * 0.001 / max(ray.y, 1e-4)) * ray;
        col = vec4(
          diskCol.rgb * (1.0 - col.a) + col.rgb,
          col.a + diskCol.a * (1.0 - col.a)
        );
      }
    }

    if (outCol.r == 100.0) {
      outCol = vec4(col.rgb + glow.rgb * (col.a + glow.a), 1.0);
    }

    outCol.rgb = pow(outCol.rgb, vec3(uOutputGamma));
    return outCol;
  }

  vec4 tracePixel(vec2 fragCoord, vec2 subPixel) {
    vec2 fragCoordRot;
    fragCoordRot.x = fragCoord.x * uFrameRot.x + fragCoord.y * uFrameRot.y;
    fragCoordRot.y = fragCoord.y * uFrameRot.x - fragCoord.x * uFrameRot.y;
    fragCoordRot += uFrameOffset * uResolution;

    vec3 ray;
    vec3 pos;

    if (uUseShadertoyCamera > 0.5) {
      setupShadertoyCamera(ray, pos, fragCoordRot, subPixel);
    } else {
      vec2 uv = fragCoordRot / uResolution;
      ray = worldRay(uv);
      pos = uCameraPosition;
    }

    return traceScene(ray, pos);
  }

  void main() {
    vec2 baseCoord = vUv * uResolution;
    vec4 colOut = vec4(0.0);
    float aa = clamp(uAa, 1.0, 2.0);
    float samples = 0.0;

    for (int j = 0; j < 2; j++) {
      for (int i = 0; i < 2; i++) {
        if (float(i) >= aa || float(j) >= aa) continue;
        vec2 subPixel = vec2(float(i), float(j)) / aa;
        colOut += tracePixel(baseCoord, subPixel);
        samples += 1.0;
      }
    }

    gl_FragColor = colOut / max(samples, 1.0);
  }
`
}

export const BLACK_HOLE_RAYMARCH_FRAG = buildFragmentShader(
  BLACK_HOLE_DEFAULTS.diskLayers,
)

/** Crea el mapa de uniforms de Three a partir de BLACK_HOLE_DEFAULTS. */
export function createBlackHoleUniforms(
  d: BlackHoleDefaults = BLACK_HOLE_DEFAULTS,
) {
  const frame = frameRotFromDeg(d.frameRotDeg)
  return {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uUseShadertoyCamera: { value: 1 },
    uCameraPosition: { value: new THREE.Vector3() },
    uInverseProjectionMatrix: { value: new THREE.Matrix4() },
    uInverseViewMatrix: { value: new THREE.Matrix4() },
    uBhSize: { value: d.size },
    uDiskSpeed: { value: d.diskSpeed },
    uAa: { value: d.aa },
    uCamDistance: { value: d.camDistance },
    uCamAngleY: { value: d.camAngleY },
    uCamPitchTrim: { value: d.camPitchTrim },
    uFrameRot: { value: new THREE.Vector2(frame.cos, frame.sin) },
    uFrameOffset: { value: new THREE.Vector2(d.frameOffsetX, d.frameOffsetY) },
    uGlowStrength: { value: d.glowStrength },
    uGlowColor: { value: new THREE.Vector3(...d.glowColor) },
    uGlowHorizon: { value: d.glowHorizon },
    uBendStrength: { value: d.bendStrength },
    uLensedBgStrength: { value: d.lensedBgStrength },
    uLensedBgKnee: { value: d.lensedBgKnee },
    uLensedBgRadius: { value: d.lensedBgRadius },
    uHorizonRimMinRadius: { value: d.horizonRimMinRadius },
    uHorizonSilhouetteGlow: { value: d.horizonSilhouetteGlow },
    uStarBrightness: { value: d.starBrightness },
    uStarSharpness: { value: d.starSharpness },
    uStarTwinkleSpeed: { value: d.starTwinkleSpeed },
    uStarTwinkleAmount: { value: d.starTwinkleAmount },
    uStarDriftSpeed: { value: d.starDriftSpeed },
    uStarDriftScale: { value: d.starDriftScale },
    uDiskBrightness: { value: d.diskBrightness },
    uDiskRimBoost: { value: d.diskRimBoost },
    uDiskNoiseFreq: { value: d.diskNoiseFreq },
    uDiskColorHot: { value: new THREE.Vector3(...d.diskColorHot) },
    uDiskColorCool: { value: new THREE.Vector3(...d.diskColorCool) },
    uOutputGamma: { value: d.outputGamma },
  }
}
