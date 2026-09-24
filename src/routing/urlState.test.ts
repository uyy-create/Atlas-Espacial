import { beforeEach, describe, expect, it } from 'vitest'
import { readUrlState, writeUrlState } from './urlState'

describe('readUrlState', () => {
  it('defaults to the solar view', () => {
    expect(readUrlState('')).toEqual({ view: 'solar', planetId: null, date: null })
  })

  it('reads a view', () => {
    expect(readUrlState('?view=blackHole').view).toBe('blackHole')
  })

  it('reads planets and moons, and a body implies the solar view', () => {
    expect(readUrlState('?view=galaxy&planet=mars')).toMatchObject({
      view: 'solar',
      planetId: 'mars',
    })
    expect(readUrlState('?planet=titan').planetId).toBe('titan')
  })

  it('reads a date at noon UT', () => {
    expect(readUrlState('?date=2030-06-15').date?.toISOString()).toBe(
      '2030-06-15T12:00:00.000Z',
    )
  })

  it.each([
    ['?view=andromeda', { view: 'solar' }],
    ['?planet=pluton', { planetId: null }],
    ['?date=mañana', { date: null }],
    ['?date=2030-13-45', { date: null }],
    ['?date=15-06-2030', { date: null }],
  ])('ignores nonsense: %s', (search, expected) => {
    expect(readUrlState(search)).toMatchObject(expected)
  })
})

describe('writeUrlState', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'))

  const search = () => window.location.search

  it('leaves the default state out of the URL', () => {
    writeUrlState({ view: 'solar', planetId: null, date: null })
    expect(search()).toBe('')
  })

  it('round-trips what it writes', () => {
    const state = {
      view: 'solar' as const,
      planetId: 'jupiter',
      date: new Date('2030-06-15T12:00:00Z'),
    }
    writeUrlState(state)
    expect(readUrlState(search())).toEqual(state)
  })

  it('drops planet and date outside the solar view', () => {
    writeUrlState({
      view: 'galaxy',
      planetId: 'mars',
      date: new Date('2030-06-15T12:00:00Z'),
    })
    expect(search()).toBe('?view=galaxy')
  })

  it('keeps unrelated parameters', () => {
    window.history.replaceState(null, '', '/?debug=1')
    writeUrlState({ view: 'blackHole', planetId: null, date: null })
    expect(new URLSearchParams(search()).get('debug')).toBe('1')
  })
})
