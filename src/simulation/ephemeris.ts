/**
 * Simplified Keplerian ephemeris: heliocentric ecliptic longitude of a
 * planet on a given date, from the JPL mean orbital elements (Standish,
 * valid 1800-2050). Circular orbit radii in the scene are decorative, but
 * the *angle* each planet sits at is real to within about a degree.
 */

export interface OrbitalElements {
  /** Mean longitude at J2000, degrees. */
  L0: number
  /** Rate of mean longitude, degrees per Julian century. */
  Lrate: number
  /** Longitude of perihelion at J2000, degrees. */
  varpi: number
  /** Eccentricity. */
  e: number
}

/** Julian Day of the J2000.0 epoch (2000-01-01 12:00 TT). */
export const J2000 = 2451545.0
const MS_PER_DAY = 86_400_000
const DEG = Math.PI / 180

export function dateToJulianDay(date: Date): number {
  return date.getTime() / MS_PER_DAY + 2440587.5
}

export function julianDayToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * MS_PER_DAY)
}

const wrap2Pi = (a: number) => {
  const t = a % (Math.PI * 2)
  return t < 0 ? t + Math.PI * 2 : t
}

/**
 * Heliocentric ecliptic longitude in radians, counter-clockwise seen from
 * ecliptic north. Uses the equation of centre to second order in e, which
 * is plenty for these eccentricities.
 */
export function heliocentricLongitude(
  el: OrbitalElements,
  julianDay: number,
): number {
  const T = (julianDay - J2000) / 36525
  const L = (el.L0 + el.Lrate * T) * DEG
  const varpi = el.varpi * DEG
  const M = L - varpi
  const e = el.e
  const nu =
    M +
    (2 * e - (e * e * e) / 4) * Math.sin(M) +
    (5 / 4) * e * e * Math.sin(2 * M)
  return wrap2Pi(nu + varpi)
}
