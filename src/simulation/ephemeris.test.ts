import { describe, expect, it } from 'vitest'
import { getPlanetById, type PlanetDef } from '../data/planets'
import {
  EPHEMERIS_MAX_JD,
  EPHEMERIS_MIN_JD,
  J2000,
  clampToEphemerisRange,
  dateToJulianDay,
  heliocentricLongitude,
  julianDayToDate,
  uniformAngle,
} from './ephemeris'

const DEG = Math.PI / 180

const planet = (id: string): PlanetDef => {
  const def = getPlanetById(id)
  if (!def) throw new Error(`Unknown planet ${id}`)
  return def
}

const moon = planet('earth').moons!.find((m) => m.id === 'moon')!

/** Signed difference a − b folded into (−180°, 180°]. */
const diffDeg = (a: number, b: number) => {
  const d = (((a - b) / DEG) % 360 + 360) % 360
  return d > 180 ? d - 360 : d
}

const longitude = (id: string, iso: string) =>
  heliocentricLongitude(planet(id).elements, dateToJulianDay(new Date(iso)))

/** Direction of the Sun seen from Earth, in the same convention. */
const sunFromEarth = (jd: number) =>
  heliocentricLongitude(planet('earth').elements, jd) + Math.PI

describe('julian days', () => {
  it('puts J2000 at 2000-01-01 12:00 UT', () => {
    expect(dateToJulianDay(new Date('2000-01-01T12:00:00Z'))).toBe(J2000)
  })

  it('round-trips a date', () => {
    const date = new Date('2031-07-04T18:30:00Z')
    expect(julianDayToDate(dateToJulianDay(date)).getTime()).toBeCloseTo(
      date.getTime(),
      -1,
    )
  })

  it('clamps to the range the elements are valid for', () => {
    expect(clampToEphemerisRange(0)).toBe(EPHEMERIS_MIN_JD)
    expect(clampToEphemerisRange(1e9)).toBe(EPHEMERIS_MAX_JD)
    expect(clampToEphemerisRange(J2000)).toBe(J2000)
    expect(julianDayToDate(EPHEMERIS_MIN_JD).toISOString()).toBe(
      '1800-01-01T12:00:00.000Z',
    )
    expect(julianDayToDate(EPHEMERIS_MAX_JD).toISOString()).toBe(
      '2050-12-31T12:00:00.000Z',
    )
  })
})

describe('planet longitudes', () => {
  // Seen from the Sun, Earth sits opposite the Sun's geocentric longitude.
  it.each([
    ['equinoccio de marzo', '2024-03-20T03:06:00Z', 180],
    ['solsticio de junio', '2024-06-20T20:51:00Z', 270],
    ['equinoccio de septiembre', '2024-09-22T12:44:00Z', 0],
    ['solsticio de diciembre', '2024-12-21T09:20:00Z', 90],
  ])('places Earth right at the %s', (_, iso, expected) => {
    expect(Math.abs(diffDeg(longitude('earth', iso), expected * DEG))).toBeLessThan(0.5)
  })

  // At opposition a planet and Earth share their heliocentric longitude.
  it.each([
    ['mars', '2025-01-16T02:32:00Z'],
    ['jupiter', '2023-11-03T05:03:00Z'],
    ['saturn', '2024-09-08T04:35:00Z'],
    ['uranus', '2024-11-17T02:00:00Z'],
    ['neptune', '2024-09-21T00:00:00Z'],
  ])('lines %s up with Earth at its opposition', (id, iso) => {
    const d = diffDeg(longitude(id, iso), longitude('earth', iso))
    expect(Math.abs(d)).toBeLessThan(1)
  })

  it('moves every planet counter-clockwise', () => {
    for (const id of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn']) {
      const a = longitude(id, '2030-01-01T00:00:00Z')
      const b = longitude(id, '2030-01-02T00:00:00Z')
      expect(diffDeg(b, a)).toBeGreaterThan(0)
    }
  })
})

describe('uniform rotations', () => {
  it('turns retrograde for negative periods', () => {
    const a = uniformAngle(0, -5.877, J2000)
    const b = uniformAngle(0, -5.877, J2000 + 0.1)
    expect(diffDeg(b, a)).toBeLessThan(0)
  })

  it('stays within [0, 2π)', () => {
    const a = uniformAngle(1, 0.319, J2000 + 12_345.678)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(2 * Math.PI)
  })

  const elongation = (iso: string) => {
    const jd = dateToJulianDay(new Date(iso))
    const theta = uniformAngle(moon.orbitAngleAtJ2000, moon.orbitPeriodDays, jd)
    return diffDeg(theta, sunFromEarth(jd))
  }

  // Mean elements: a few degrees off the true Moon is expected.
  it.each([
    ['luna nueva', '2024-01-11T11:57:00Z', 0],
    ['luna llena', '2024-01-25T17:54:00Z', 180],
    // Eclipses: solar at new moon, lunar at full moon.
    ['luna nueva', '2017-08-21T18:30:00Z', 0],
    ['luna llena', '2010-12-21T08:13:00Z', 180],
  ])('matches the %s of %s', (_, iso, expected) => {
    expect(Math.abs(diffDeg(elongation(iso) * DEG, expected * DEG))).toBeLessThan(7)
  })

  it('turns Greenwich towards the Sun at noon UT', () => {
    const earth = planet('earth')
    const greenwichVsSun = (iso: string) => {
      const jd = dateToJulianDay(new Date(iso))
      const spin = uniformAngle(
        earth.spinAtJ2000Deg! * DEG,
        earth.rotationPeriodDays,
        jd,
      )
      return diffDeg(spin, sunFromEarth(jd))
    }
    for (const day of ['1850-03-01', '2000-01-01', '2024-06-21', '2049-11-30']) {
      expect(Math.abs(greenwichVsSun(`${day}T12:00:00Z`))).toBeLessThan(5)
      expect(Math.abs(greenwichVsSun(`${day}T00:00:00Z`))).toBeGreaterThan(175)
    }
  })
})
