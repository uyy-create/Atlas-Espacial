import * as THREE from 'three'

const DEG = Math.PI / 180

/**
 * Rotation of a planet's tilt frame (whose +y is the spin axis), as Euler
 * angles in three.js's default XYZ order: tip +y over by the axial tilt
 * towards -x, then turn that lean round to face `poleLongitudeDeg`.
 * Headings follow the orbital longitude: (cos λ, 0, -sin λ).
 */
export function tiltFrameEuler(
  axialTiltDeg: number,
  poleLongitudeDeg: number,
): [number, number, number] {
  return [0, poleLongitudeDeg * DEG + Math.PI, axialTiltDeg * DEG]
}

/** Spin axis (the tilt frame's +y) in world space. */
export function spinAxis(
  axialTiltDeg: number,
  poleLongitudeDeg: number,
): THREE.Vector3 {
  const euler = new THREE.Euler(...tiltFrameEuler(axialTiltDeg, poleLongitudeDeg))
  return new THREE.Vector3(0, 1, 0).applyEuler(euler)
}

/**
 * Turns a world heading (an orbital-longitude angle) into the spin angle,
 * inside the tilt frame, of the meridian that faces it. With a tilted axis
 * the two differ by more than a constant, so e.g. Earth's noon meridian
 * has to be found this way to face the Sun.
 */
export class HeadingToSpin {
  private readonly inverse: THREE.Quaternion
  private readonly v = new THREE.Vector3()

  constructor(axialTiltDeg: number, poleLongitudeDeg: number) {
    this.inverse = new THREE.Quaternion()
      .setFromEuler(
        new THREE.Euler(...tiltFrameEuler(axialTiltDeg, poleLongitudeDeg)),
      )
      .invert()
  }

  angle(heading: number): number {
    this.v.set(Math.cos(heading), 0, -Math.sin(heading)).applyQuaternion(this.inverse)
    return Math.atan2(-this.v.z, this.v.x)
  }
}
