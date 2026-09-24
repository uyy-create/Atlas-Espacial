import { beforeEach, describe, expect, it } from 'vitest'
import { useSolarStore } from './useSolarStore'

const initial = useSolarStore.getState()
const state = () => useSolarStore.getState()

beforeEach(() => {
  useSolarStore.setState(initial, true)
  useSolarStore.setState({ entered: true })
})

describe('focus', () => {
  it('flies to a body', () => {
    state().focus('mars')
    expect(state()).toMatchObject({ focusedId: 'mars', mode: 'focusing' })
  })

  it('steps through planets and wraps around', () => {
    useSolarStore.setState({ focusedId: 'neptune', mode: 'focused' })
    state().focusNeighbor(1)
    expect(state().focusedId).toBe('mercury')
    state().focusNeighbor(-1)
    expect(state().focusedId).toBe('neptune')
  })

  it('steps through the moons of the same planet', () => {
    useSolarStore.setState({ focusedId: 'callisto', mode: 'focused' })
    state().focusNeighbor(1)
    expect(state().focusedId).toBe('io')
  })

  it('stays put on an only moon', () => {
    useSolarStore.setState({ focusedId: 'moon', mode: 'focused' })
    state().focusNeighbor(1)
    expect(state()).toMatchObject({ focusedId: 'moon', mode: 'focused' })
  })

  it('backs out from a moon to its planet, then to the overview', () => {
    useSolarStore.setState({ focusedId: 'titan', mode: 'focused' })
    state().unfocus()
    expect(state()).toMatchObject({ focusedId: 'saturn', mode: 'focusing' })
    useSolarStore.setState({ mode: 'focused' })
    state().unfocus()
    expect(state().mode).toBe('returning')
    state().completeReturn()
    expect(state()).toMatchObject({ focusedId: null, mode: 'overview' })
  })
})

describe('warp', () => {
  it('ignores the current view', () => {
    state().navigateToView('solar')
    expect(state().mode).toBe('overview')
  })

  it('drops the focus, swaps the view mid-flight and settles', () => {
    useSolarStore.setState({ focusedId: 'earth', mode: 'focused', hoveredId: 'earth' })
    state().navigateToView('galaxy')
    expect(state()).toMatchObject({
      mode: 'warping',
      warpTargetView: 'galaxy',
      focusedId: null,
      hoveredId: null,
      view: 'solar',
    })
    state().commitWarpView()
    expect(state().view).toBe('galaxy')
    state().completeWarp()
    expect(state()).toMatchObject({ mode: 'overview', warpTargetView: null })
  })

  it('locks focus and navigation while warping', () => {
    state().navigateToView('galaxy')
    state().focus('mars')
    state().navigateToView('blackHole')
    expect(state()).toMatchObject({ focusedId: null, warpTargetView: 'galaxy' })
  })

  it('clamps the warp progress', () => {
    state().setWarpProgress(1.4)
    expect(state().warpProgress).toBe(1)
    state().setWarpProgress(-1)
    expect(state().warpProgress).toBe(0)
  })
})

describe('enter', () => {
  beforeEach(() => useSolarStore.setState({ entered: false }))

  it('dollies in to the overview', () => {
    state().enter()
    expect(state()).toMatchObject({ entered: true, mode: 'returning' })
  })

  it('flies straight to a deep-linked body', () => {
    useSolarStore.setState({ pendingFocusId: 'europa' })
    state().enter()
    expect(state()).toMatchObject({
      entered: true,
      mode: 'focusing',
      focusedId: 'europa',
      pendingFocusId: null,
    })
  })
})
