import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAchievements } from '../useAchievements.js'

const makeEntry = (overrides = {}) => ({
  id: 1,
  name: 'Bulbasaur',
  seenAt: null,
  capturedAt: null,
  ...overrides,
})

describe('useAchievements', () => {
  it('returns all achievements locked when collection and favorites are empty', () => {
    const { result } = renderHook(() => useAchievements({ collection: [], favorites: [] }))
    expect(result.current.every((a) => !a.unlocked)).toBe(true)
  })

  it('unlocks first_seen when any entry has seenAt', () => {
    const collection = [makeEntry({ seenAt: new Date().toISOString() })]
    const { result } = renderHook(() => useAchievements({ collection, favorites: [] }))
    const achievement = result.current.find((a) => a.id === 'first_seen')
    expect(achievement.unlocked).toBe(true)
  })

  it('does NOT unlock first_seen when seenAt is null', () => {
    const collection = [makeEntry({ seenAt: null })]
    const { result } = renderHook(() => useAchievements({ collection, favorites: [] }))
    const achievement = result.current.find((a) => a.id === 'first_seen')
    expect(achievement.unlocked).toBe(false)
  })

  it('unlocks first_captured when any entry has capturedAt', () => {
    const collection = [makeEntry({ capturedAt: new Date().toISOString() })]
    const { result } = renderHook(() => useAchievements({ collection, favorites: [] }))
    const achievement = result.current.find((a) => a.id === 'first_captured')
    expect(achievement.unlocked).toBe(true)
  })

  it('unlocks first_favorite when favorites has at least one entry', () => {
    const { result } = renderHook(() => useAchievements({ collection: [], favorites: [{ id: 25 }] }))
    const achievement = result.current.find((a) => a.id === 'first_favorite')
    expect(achievement.unlocked).toBe(true)
  })

  it('unlocks seen_10 only when 10+ entries have seenAt', () => {
    const nine = Array.from({ length: 9 }, (_, i) => makeEntry({ id: i, seenAt: 'now' }))
    const ten  = Array.from({ length: 10 }, (_, i) => makeEntry({ id: i, seenAt: 'now' }))

    const { result: r9 } = renderHook(() => useAchievements({ collection: nine, favorites: [] }))
    const { result: r10 } = renderHook(() => useAchievements({ collection: ten, favorites: [] }))

    expect(r9.result?.current?.find((a) => a.id === 'seen_10')?.unlocked ?? r9.current.find((a) => a.id === 'seen_10').unlocked).toBe(false)
    expect(r10.result?.current?.find((a) => a.id === 'seen_10')?.unlocked ?? r10.current.find((a) => a.id === 'seen_10').unlocked).toBe(true)
  })

  it('returns the correct emoji and label for each achievement', () => {
    const { result } = renderHook(() => useAchievements({ collection: [], favorites: [] }))
    const firstSeen = result.current.find((a) => a.id === 'first_seen')
    expect(firstSeen.emoji).toBe('🎯')
    expect(firstSeen.label).toBe('¡Primer Pokémon!')
  })
})
