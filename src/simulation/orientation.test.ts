import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getPlanetById, type PlanetDef } from '../data/planets'
import {
  dateToJulianDay,
  heliocentricLongitude,
  uniformAngle,
} from './ephemeris'
import { HeadingToSpin, spinAxis, tiltFrameEuler } from './orientation'

const DEG = Math.PI / 180

const planet = (id: string): PlanetDef => {
  const def = getPlanetById(id)
  if (!def) throw new Error(`Unknown planet ${id}`)
  return def
}

/** Unit vector from a planet towards the Sun, in scene coordinates. */
const sunDirection = (def: PlanetDef, iso: string) => {
  const lambda = heliocentricLongitude(def.elements, dateToJulianDay(new Date(iso)))
  return new THREE.Vector3(-Math.cos(lambda), 0, Math.sin(lambda))
}

const axisOf = (def: PlanetDef) => spinAxis(def.axialTiltDeg, def.poleLongitudeDeg)

describe('spin axes', () => {
  const earth = planet('earth')
  const tilt = Math.sin(earth.axialTiltDeg * DEG)

  it.each([
    ['solsticio de junio', '2024-06-20T20:51:00Z', tilt],
    ['solsticio de diciembre', '2024-12-21T09:20:00Z', -tilt],
    ['equinoccio de marzo', '2024-03-20T03:06:00Z', 0],
    ['equinoccio de septiembre', '2024-09-22T12:44:00Z', 0],
  ])('tips Earth’s north the right way at the %s', (_, iso, expected) => {
    expect(axisOf(earth).dot(sunDirection(earth, iso))).toBeCloseTo(expected, 1)
  })

  it('turns Saturn’s rings edge-on to the Sun at its 2025 equinox', () => {
    const saturn = planet('saturn')
    // Within ~3°: orbits are drawn flat, and Saturn's is 2.5° off the ecliptic.
    expect(Math.abs(axisOf(saturn).dot(sunDirection(saturn, '2025-05-06T00:00:00Z')))).toBeLessThan(0.05)
  })

  it('keeps the tilt itself', () => {
    for (const def of [planet('mars'), planet('uranus'), planet('venus')]) {
      const angle = Math.acos(axisOf(def).y) / DEG
      expect(angle).toBeCloseTo(def.axialTiltDeg, 5)
    }
  })
})

describe('HeadingToSpin', () => {
  const earth = planet('earth')
  const toSpin = new HeadingToSpin(earth.axialTiltDeg, earth.poleLongitudeDeg)
  const tiltFrame = new THREE.Euler(...tiltFrameEuler(earth.axialTiltDeg, earth.poleLongitudeDeg))

  /** Greenwich on the equator, in world space, for a given moment. */
  const greenwich = (iso: string) => {
    const jd = dateToJulianDay(new Date(iso))
    const heading = uniformAngle(earth.spinAtJ2000Deg! * DEG, earth.rotationPeriodDays, jd)
    return new THREE.Vector3(1, 0, 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), toSpin.angle(heading))
      .applyEuler(tiltFrame)
  }

  it.each(['2024-03-20', '2024-06-21', '2024-12-21', '2049-08-01'])(
    'faces Greenwich to the Sun at noon UT on %s',
    (day) => {
      // Up to the tilt: on a solstice the Sun sits 23° off the equator.
      expect(greenwich(`${day}T12:00:00Z`).dot(sunDirection(earth, `${day}T12:00:00Z`))).toBeGreaterThan(0.9)
      expect(greenwich(`${day}T00:00:00Z`).dot(sunDirection(earth, `${day}T00:00:00Z`))).toBeLessThan(-0.9)
    },
  )
})
