import * as THREE from 'three'
import { GALAXY_RADIUS_VALUE } from './MilkyWay'

export const SOLAR_MARKER_RADIUS = GALAXY_RADIUS_VALUE * 0.55
export const SOLAR_MARKER_ANGLE = Math.PI * 0.32

/** World position of the solar system marker on the galaxy disc (pivot for warp scaling). */
export const SOLAR_SYSTEM_GALAXY_MARKER = new THREE.Vector3(
  Math.cos(SOLAR_MARKER_ANGLE) * SOLAR_MARKER_RADIUS,
  0.6,
  Math.sin(SOLAR_MARKER_ANGLE) * SOLAR_MARKER_RADIUS,
)

export const SOLAR_MARKER_POSITION_TUPLE: [number, number, number] = [
  SOLAR_SYSTEM_GALAXY_MARKER.x,
  SOLAR_SYSTEM_GALAXY_MARKER.y,
  SOLAR_SYSTEM_GALAXY_MARKER.z,
]

/** Second arm — opposite-ish side of the disc from the solar marker. */
export const BLACK_HOLE_MARKER_RADIUS = GALAXY_RADIUS_VALUE * 0.58
export const BLACK_HOLE_MARKER_ANGLE = Math.PI * 0.68

export const BLACK_HOLE_SYSTEM_GALAXY_MARKER = new THREE.Vector3(
  Math.cos(BLACK_HOLE_MARKER_ANGLE) * BLACK_HOLE_MARKER_RADIUS,
  -0.35,
  Math.sin(BLACK_HOLE_MARKER_ANGLE) * BLACK_HOLE_MARKER_RADIUS,
)

export const BLACK_HOLE_MARKER_POSITION_TUPLE: [number, number, number] = [
  BLACK_HOLE_SYSTEM_GALAXY_MARKER.x,
  BLACK_HOLE_SYSTEM_GALAXY_MARKER.y,
  BLACK_HOLE_SYSTEM_GALAXY_MARKER.z,
]
