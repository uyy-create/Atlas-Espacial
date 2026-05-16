/**
 * Raymarching black hole (accretion disk + gravitational lensing + event horizon).
 * Ported from Shadertoy "Black Hole" (tsBXW3) to Three.js GLSL.
 */

export const BLACK_HOLE_RAYMARCH_VERT = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`

export const BLACK_HOLE_RAYMARCH_FRAG = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uCameraPosition;
  uniform mat4 uInverseProjectionMatrix;
  uniform mat4 uInverseViewMatrix;

  uniform float uBhSize;
  uniform float uDiskSpeed;
  uniform float uAa;

  #define STEPS 12

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

  vec3 worldRay(vec2 uv) {
    vec2 ndc = uv * 2.0 - 1.0;
    vec4 clip = vec4(ndc, 1.0, 1.0);
    vec4 view = uInverseProjectionMatrix * clip;
    view.xyz /= view.w;
    vec3 dir = (uInverseViewMatrix * vec4(normalize(view.xyz), 0.0)).xyz;
    return normalize(dir);
  }

  vec4 sampleBackground(vec3 ray) {
    vec2 uv = ray.xy;
    if (abs(ray.x) > 0.5) uv.x = ray.z;
    else if (abs(ray.y) > 0.5) uv.y = ray.z;

    float brightness = valueNoise(uv * 3.0, 100.0);
    float color = valueNoise(uv * 2.0, 20.0);
    brightness = pow(brightness, 256.0);
    brightness = clamp(brightness * 100.0, 0.0, 1.0);
    vec3 stars = brightness * mix(vec3(1.0, 0.6, 0.2), vec3(0.2, 0.6, 1.0), color);

    vec3 nebula = valueNoise(uv * 1.5, 8.0) * vec3(0.08, 0.05, 0.14);
    nebula += valueNoise(uv * 3.0 + 4.1, 16.0) * vec3(0.04, 0.02, 0.08);
    nebula = nebula * nebula * 2.5;

    return vec4(nebula + stars, 1.0);
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
    vec3 insideCol = mix(vec3(1.0, 0.8, 0.0), vec3(0.5, 0.13, 0.02) * 0.2, disMix);
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
      float angle = 0.02 * atan(x);

      const float f = 70.0;
      float noise = valueNoise(vec2(angle, u * (1.0 / uBhSize) * 0.05), f);
      noise = noise * 0.66 + 0.33 * valueNoise(vec2(angle, u * (1.0 / uBhSize) * 0.05), f * 2.0);

      float extraWidth =
        noise * 1.0 * (1.0 - clamp(fi * (1.0 / float(STEPS)) * 2.0 - 1.0, 0.0, 1.0));

      float alpha = clamp(
        noise * (intensity + extraWidth) * ((1.0 / uBhSize) * 10.0 + 0.01) * dist * distMult,
        0.0,
        1.0,
      );

      vec3 col =
        2.0 * mix(vec3(0.3, 0.2, 0.15) * insideCol, insideCol, min(1.0, intensity * 2.0));
      o = clamp(
        vec4(col * alpha + o.rgb * (1.0 - alpha), o.a * (1.0 - alpha) + alpha),
        vec4(0.0),
        vec4(1.0),
      );

      lengthPos *= 1.0 / uBhSize;
      o.rgb +=
        redShift *
        (intensity * 1.0 + 0.5) *
        (1.0 / float(STEPS)) *
        100.0 *
        distMult /
        max(lengthPos * lengthPos, 1e-3);
    }

    o.rgb = clamp(o.rgb - 0.005, 0.0, 1.0);
    return o;
  }

  vec4 tracePixel(vec2 fragCoord) {
    vec2 fragCoordRot;
    fragCoordRot.x = fragCoord.x * 0.985 + fragCoord.y * 0.174;
    fragCoordRot.y = fragCoord.y * 0.985 - fragCoord.x * 0.174;
    fragCoordRot += vec2(-0.06, 0.12) * uResolution;

    vec2 uv = fragCoordRot / uResolution;
    vec3 ray = worldRay(uv);
    vec3 pos = uCameraPosition;

    vec4 col = vec4(0.0);
    vec4 glow = vec4(0.0);
    vec4 outCol = vec4(100.0);

    for (int disks = 0; disks < 20; disks++) {
      for (int h = 0; h < 6; h++) {
        float dotpos = dot(pos, pos);
        float invDist = inversesqrt(max(dotpos, 1e-8));
        float centDist = dotpos * invDist;
        float stepDist = 0.92 * abs(pos.y / max(ray.y, 1e-4));
        float farLimit = centDist * 0.5;
        float closeLimit = centDist * 0.1 + 0.05 * centDist * centDist * (1.0 / uBhSize);
        stepDist = min(stepDist, min(farLimit, closeLimit));

        float invDistSqr = invDist * invDist;
        float bendForce = stepDist * invDistSqr * uBhSize * 0.625;
        ray = normalize(ray - (bendForce * invDist) * pos);
        pos += stepDist * ray;

        glow +=
          vec4(1.2, 1.1, 1.0, 1.0) *
          (0.01 * stepDist * invDistSqr * invDistSqr *
            clamp(centDist * 2.0 - 1.2, 0.0, 1.0));
      }

      float dist2 = length(pos);

      if (dist2 < uBhSize * 0.1) {
        outCol = vec4(col.rgb * col.a + glow.rgb * (1.0 - col.a), 1.0);
        break;
      } else if (dist2 > uBhSize * 1000.0) {
        vec4 bg = sampleBackground(ray);
        outCol = vec4(
          col.rgb * col.a + bg.rgb * (1.0 - col.a) + glow.rgb * (1.0 - col.a),
          1.0,
        );
        break;
      } else if (abs(pos.y) <= uBhSize * 0.002) {
        vec4 diskCol = raymarchDisk(ray, pos);
        pos.y = 0.0;
        pos += abs(uBhSize * 0.001 / max(ray.y, 1e-4)) * ray;
        col = vec4(
          diskCol.rgb * (1.0 - col.a) + col.rgb,
          col.a + diskCol.a * (1.0 - col.a),
        );
      }
    }

    if (outCol.r == 100.0) {
      outCol = vec4(col.rgb + glow.rgb * (col.a + glow.a), 1.0);
    }

    outCol.rgb = pow(outCol.rgb, vec3(0.6));
    return outCol;
  }

  void main() {
    vec2 baseCoord = vUv * uResolution;
    vec4 colOut = vec4(0.0);
    float aa = clamp(uAa, 1.0, 2.0);
    float samples = 0.0;

    for (int j = 0; j < 2; j++) {
      for (int i = 0; i < 2; i++) {
        if (float(i) >= aa || float(j) >= aa) continue;
        vec2 offset = vec2(float(i), float(j)) / aa;
        colOut += tracePixel(baseCoord + offset);
        samples += 1.0;
      }
    }

    gl_FragColor = colOut / max(samples, 1.0);
  }
`

export const BLACK_HOLE_DEFAULTS = {
  /** Schwarzschild radius in world units (tuned for camera ~z=102). */
  size: 1.85,
  diskSpeed: 3.0,
  aa: 1,
} as const
