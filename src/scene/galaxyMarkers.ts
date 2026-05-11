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
