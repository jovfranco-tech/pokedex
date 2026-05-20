import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCollection } from '../useCollection.ts'
import type { PokemonDetail } from '../../services/pokeApi.ts'

// Shared storage keys for all tests
const KEYS = {
  historyKey: 'test-history',
  favoritesKey: 'test-favorites',
  collectionKey: 'test-collection',
}

const mkPokemon = (overrides: Partial<PokemonDetail> = {}): PokemonDetail => ({
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: 'https://img/25.png', type: ['electric'],
  stats: [], matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
  gameAppearances: [], evolution: '', evolutionChain: [], attacks: [], abilities: [],
  weight: '', height: '', generation: 1, description: '',
  cryUrl: '', animatedSprite: '', baseExperience: 0,
  confidenceScore: 95, scannedAt: '', scanMode: 'búsqueda por texto',
  visualReason: '', dataVersion: 'v4',
  isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
  isRegional: false, isStarter: false, isUltraBeast: false,
  isParadox: false, isBaby: false,
  ...overrides,
})

describe('useCollection', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => window.localStorage.clear())

  // ── Initial state ─────────────────────────────────────────────────────────

  it('starts with empty lists when localStorage is empty', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    expect(result.current.scanHistory).toEqual([])
    expect(result.current.favorites).toEqual([])
    expect(result.current.collection).toEqual([])
  })

  // ── rememberScan ──────────────────────────────────────────────────────────

  it('rememberScan adds an entry to the front of scanHistory', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.rememberScan(mkPokemon()))
    expect(result.current.scanHistory).toHaveLength(1)
    expect(result.current.scanHistory[0].name).toBe('Pikachu')
  })

  it('rememberScan ignores pokémon without an id', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.rememberScan(mkPokemon({ id: 0 })))
    expect(result.current.scanHistory).toHaveLength(0)
  })

  it('rememberScan deduplicates by id (most recent wins, moves to front)', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.rememberScan(mkPokemon({ id: 1, name: 'Bulbasaur' })))
    act(() => result.current.rememberScan(mkPokemon({ id: 6, name: 'Charizard' })))
    act(() => result.current.rememberScan(mkPokemon({ id: 1, name: 'Bulbasaur' })))

    expect(result.current.scanHistory).toHaveLength(2)
    expect(result.current.scanHistory[0].id).toBe(1)
    expect(result.current.scanHistory[1].id).toBe(6)
  })

  it('rememberScan caps the history at 8 entries', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    for (let i = 1; i <= 12; i++) {
      act(() => result.current.rememberScan(mkPokemon({ id: i, name: `Mon${i}` })))
    }
    expect(result.current.scanHistory).toHaveLength(8)
    // Most recent (id 12) is at the front
    expect(result.current.scanHistory[0].id).toBe(12)
  })

  it('rememberScan uses the pokémon scannedAt timestamp when present', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.rememberScan(mkPokemon({ scannedAt: '2024-01-01T00:00:00.000Z' })))
    expect(result.current.scanHistory[0].scannedAt).toBe('2024-01-01T00:00:00.000Z')
  })

  // ── updateCollection ──────────────────────────────────────────────────────

  it('updateCollection adds a seen entry with seenAt timestamp', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.updateCollection(mkPokemon(), 'seen'))
    expect(result.current.collection).toHaveLength(1)
    expect(result.current.collection[0].seenAt).toBeTruthy()
    expect(result.current.collection[0].capturedAt).toBeUndefined()
  })

  it('updateCollection defaults to "seen" when action is omitted', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.updateCollection(mkPokemon()))
    expect(result.current.collection[0].seenAt).toBeTruthy()
    expect(result.current.collection[0].capturedAt).toBeUndefined()
  })

  it('updateCollection adds capturedAt and seenAt for captured action', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.updateCollection(mkPokemon(), 'captured'))
    expect(result.current.collection[0].seenAt).toBeTruthy()
    expect(result.current.collection[0].capturedAt).toBeTruthy()
  })

  it('updateCollection toggles capture off when calling captured on an already-captured entry', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.updateCollection(mkPokemon(), 'captured'))
    act(() => result.current.updateCollection(mkPokemon(), 'captured'))
    // Toggling off sets capturedAt to '' (falsy)
    expect(result.current.collection[0].capturedAt).toBe('')
  })

  it('updateCollection ignores pokémon without an id', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.updateCollection(mkPokemon({ id: 0 })))
    expect(result.current.collection).toHaveLength(0)
  })

  it('updateCollection deduplicates by apiName/id', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.updateCollection(mkPokemon({ id: 1, apiName: 'bulbasaur', name: 'Bulbasaur' }), 'seen'))
    act(() => result.current.updateCollection(mkPokemon({ id: 1, apiName: 'bulbasaur', name: 'Bulbasaur' }), 'captured'))
    expect(result.current.collection).toHaveLength(1)
    expect(result.current.collection[0].capturedAt).toBeTruthy()
  })

  it('updateCollection caps the collection at 60 entries', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    for (let i = 1; i <= 75; i++) {
      act(() => result.current.updateCollection(mkPokemon({ id: i, apiName: `mon-${i}` }), 'seen'))
    }
    expect(result.current.collection).toHaveLength(60)
  })

  // ── toggleFavorite ────────────────────────────────────────────────────────

  it('toggleFavorite adds the pokémon when not present', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.toggleFavorite(mkPokemon()))
    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.favorites[0].name).toBe('Pikachu')
  })

  it('toggleFavorite removes the pokémon when already present', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.toggleFavorite(mkPokemon()))
    act(() => result.current.toggleFavorite(mkPokemon()))
    expect(result.current.favorites).toHaveLength(0)
  })

  it('toggleFavorite ignores pokémon without an id', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.toggleFavorite(mkPokemon({ id: 0 })))
    expect(result.current.favorites).toHaveLength(0)
  })

  it('toggleFavorite caps favorites at 18', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    for (let i = 1; i <= 25; i++) {
      act(() => result.current.toggleFavorite(mkPokemon({ id: i, apiName: `mon-${i}` })))
    }
    expect(result.current.favorites).toHaveLength(18)
  })

  it('toggleFavorite stamps savedAt on the entry', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.toggleFavorite(mkPokemon()))
    expect(result.current.favorites[0].savedAt).toMatch(/\d{4}-\d{2}-\d{2}T/)
  })

  // ── Persistence ───────────────────────────────────────────────────────────

  it('persists the scan history to localStorage under the given key', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.rememberScan(mkPokemon()))
    const raw = window.localStorage.getItem(KEYS.historyKey)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toHaveLength(1)
  })

  it('persists favorites under the given key', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.toggleFavorite(mkPokemon()))
    const raw = window.localStorage.getItem(KEYS.favoritesKey)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toHaveLength(1)
  })

  it('persists the collection under the given key', () => {
    const { result } = renderHook(() => useCollection(KEYS))
    act(() => result.current.updateCollection(mkPokemon(), 'seen'))
    const raw = window.localStorage.getItem(KEYS.collectionKey)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toHaveLength(1)
  })
})
