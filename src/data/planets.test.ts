import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PLANETS, getBodyById } from './planets'

// Vitest runs from the project root.
const PUBLIC_DIR = resolve('public')

const moons = PLANETS.flatMap((p) => p.moons ?? [])

describe('planet data', () => {
  it('keeps the planets in order from the Sun', () => {
    const radii = PLANETS.map((p) => p.orbitRadius)
    expect(radii).toEqual([...radii].sort((a, b) => a - b))
  })

  it('gives every body a unique id that resolves back to it', () => {
    const ids = [...PLANETS.map((p) => p.id), ...moons.map((m) => m.id)]
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(getBodyById(id)).toBeDefined()
  })

  it('points every texture at a file that exists', () => {
    const urls = [
      ...PLANETS.flatMap((p) => [
        p.textureUrl,
        p.cloudsUrl,
        p.nightUrl,
        p.rings?.textureUrl,
        p.rings?.alphaUrl,
      ]),
      ...moons.map((m) => m.textureUrl),
    ].filter((url): url is string => Boolean(url))
    const missing = urls.filter((url) => !existsSync(PUBLIC_DIR + url))
    expect(missing).toEqual([])
  })

  it('keeps moons outside their planet and periods non-zero', () => {
    for (const planet of PLANETS) {
      expect(planet.rotationPeriodDays).not.toBe(0)
      for (const moon of planet.moons ?? []) {
        expect(moon.orbitPeriodDays).not.toBe(0)
        expect(moon.orbitRadius).toBeGreaterThan(planet.radius + moon.radius)
      }
    }
  })
})
