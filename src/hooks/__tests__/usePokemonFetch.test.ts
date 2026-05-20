import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePokemonFetch } from '../usePokemonFetch.ts'
import type { PokemonDetail, PokemonIndexItem } from '../../services/pokeApi.ts'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../services/pokeApi.js', () => ({
  fetchPokemonDetails: vi.fn(),
}))

vi.mock('../../services/visionSimulator.js', () => ({
  identifyPokemonFromImage: vi.fn(),
}))

vi.mock('../../utils/playPokemonCry.js', () => ({
  playPokemonCry: vi.fn(),
  unlockAudio: vi.fn(),
}))

import { fetchPokemonDetails } from '../../services/pokeApi.ts'
import { identifyPokemonFromImage } from '../../services/visionSimulator.ts'
import { playPokemonCry } from '../../utils/playPokemonCry.ts'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mkDetail = (overrides: Partial<PokemonDetail> = {}): PokemonDetail => ({
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: '', type: ['Electric'],
  stats: [], matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
  gameAppearances: [], evolution: '', evolutionChain: [], attacks: [], abilities: [],
  weight: '', height: '', generation: 1, description: '',
  cryUrl: 'https://cries/pikachu.ogg', animatedSprite: '', baseExperience: 0,
  confidenceScore: 100, scannedAt: '', scanMode: 'búsqueda por texto',
  visualReason: '', dataVersion: 'v4',
  isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
  isRegional: false, isStarter: false, isUltraBeast: false,
  isParadox: false, isBaby: false,
  ...overrides,
})

const emptyIndex: PokemonIndexItem[] = []

function makeFile(name = 'pikachu.png'): File {
  return new File(['data'], name, { type: 'image/png' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── fetchAndDisplay ───────────────────────────────────────────────────────────

describe('usePokemonFetch — fetchAndDisplay', () => {
  it('calls onSuccess with fetched details on success', async () => {
    const detail = mkDetail()
    vi.mocked(fetchPokemonDetails).mockResolvedValue(detail)
    const onSuccess = vi.fn()

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))

    await act(async () => {
      await result.current.fetchAndDisplay('pikachu', {}, 'Error', { onSuccess })
    })

    expect(onSuccess).toHaveBeenCalledWith(detail)
  })

  it('plays the cry when cryUrl is present', async () => {
    vi.mocked(fetchPokemonDetails).mockResolvedValue(mkDetail({ cryUrl: 'https://cry.ogg' }))

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))
    await act(async () => {
      await result.current.fetchAndDisplay('pikachu', {}, 'Error')
    })

    expect(playPokemonCry).toHaveBeenCalledWith('https://cry.ogg', 0.42)
  })

  it('does not play cry when cryUrl is empty', async () => {
    vi.mocked(fetchPokemonDetails).mockResolvedValue(mkDetail({ cryUrl: '' }))

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))
    await act(async () => {
      await result.current.fetchAndDisplay('pikachu', {}, 'Error')
    })

    expect(playPokemonCry).not.toHaveBeenCalled()
  })

  it('sets error message when fetchPokemonDetails throws', async () => {
    vi.mocked(fetchPokemonDetails).mockRejectedValue(new Error('network'))

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))
    await act(async () => {
      await result.current.fetchAndDisplay('bad', {}, 'No encontrado')
    })

    expect(result.current.error).toBe('No encontrado')
  })

  it('sets isScanning to false after completion', async () => {
    vi.mocked(fetchPokemonDetails).mockResolvedValue(mkDetail())

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))
    await act(async () => {
      await result.current.fetchAndDisplay('pikachu', {}, 'Error')
    })

    expect(result.current.isScanning).toBe(false)
  })

  it('clears scanCandidates by default', async () => {
    vi.mocked(fetchPokemonDetails).mockResolvedValue(mkDetail())

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))

    // Pre-set candidates
    act(() => { result.current.setScanCandidates([{ id: 1, apiName: 'bulbasaur', name: 'Bulbasaur', displayNumber: '#0001', sprite: '', confidenceScore: 90, reason: '' }]) })

    await act(async () => {
      await result.current.fetchAndDisplay('pikachu', {}, 'Error')
    })

    expect(result.current.scanCandidates).toHaveLength(0)
  })

  it('preserves scanCandidates when keepCandidates=true', async () => {
    vi.mocked(fetchPokemonDetails).mockResolvedValue(mkDetail())

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))

    const candidate = { id: 1, apiName: 'bulbasaur', name: 'Bulbasaur', displayNumber: '#0001', sprite: '', confidenceScore: 90, reason: '' }
    act(() => { result.current.setScanCandidates([candidate]) })

    await act(async () => {
      await result.current.fetchAndDisplay('pikachu', {}, 'Error', { keepCandidates: true })
    })

    expect(result.current.scanCandidates).toHaveLength(1)
  })
})

// ── handleAnalyze ─────────────────────────────────────────────────────────────

describe('usePokemonFetch — handleAnalyze', () => {
  it('sets error when file is null', async () => {
    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))

    await act(async () => {
      await result.current.handleAnalyze(null)
    })

    expect(result.current.error).toMatch(/Elige una imagen/i)
  })

  it('calls onSuccess when identifyPokemonFromImage returns a match', async () => {
    const detected = { ...mkDetail(), scanCandidates: [] }
    vi.mocked(identifyPokemonFromImage).mockResolvedValue(detected)
    const onSuccess = vi.fn()

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))
    await act(async () => {
      await result.current.handleAnalyze(makeFile(), { onSuccess })
    })

    expect(onSuccess).toHaveBeenCalledWith(detected)
  })

  it('sets scanCandidates from detected result', async () => {
    const candidates = [{ id: 1, apiName: 'bulbasaur', name: 'Bulbasaur', displayNumber: '#0001', sprite: '', confidenceScore: 90, reason: '' }]
    vi.mocked(identifyPokemonFromImage).mockResolvedValue({ ...mkDetail(), scanCandidates: candidates })

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))
    await act(async () => {
      await result.current.handleAnalyze(makeFile())
    })

    expect(result.current.scanCandidates).toHaveLength(1)
  })

  it('calls onNotFound and sets error when identifyPokemonFromImage returns null', async () => {
    vi.mocked(identifyPokemonFromImage).mockResolvedValue(null)
    const onNotFound = vi.fn()

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))
    await act(async () => {
      await result.current.handleAnalyze(makeFile(), { onNotFound })
    })

    expect(onNotFound).toHaveBeenCalledOnce()
    expect(result.current.error).toMatch(/No pude reconocerlo/i)
  })

  it('sets error from thrown Error message', async () => {
    vi.mocked(identifyPokemonFromImage).mockRejectedValue(new Error('IA no disponible'))

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))
    await act(async () => {
      await result.current.handleAnalyze(makeFile())
    })

    expect(result.current.error).toBe('IA no disponible')
  })

  it('sets generic error message when non-Error is thrown', async () => {
    vi.mocked(identifyPokemonFromImage).mockRejectedValue('unexpected string error')

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))
    await act(async () => {
      await result.current.handleAnalyze(makeFile())
    })

    expect(result.current.error).toMatch(/Ups/i)
  })

  it('sets isScanning to false after image analysis', async () => {
    vi.mocked(identifyPokemonFromImage).mockResolvedValue({ ...mkDetail(), scanCandidates: [] })

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))
    await act(async () => {
      await result.current.handleAnalyze(makeFile())
    })

    expect(result.current.isScanning).toBe(false)
  })

  it('plays cry when detected pokemon has cryUrl', async () => {
    vi.mocked(identifyPokemonFromImage).mockResolvedValue({ ...mkDetail({ cryUrl: 'https://cry.ogg' }), scanCandidates: [] })

    const { result } = renderHook(() => usePokemonFetch({ pokemonIndex: emptyIndex }))
    await act(async () => {
      await result.current.handleAnalyze(makeFile())
    })

    expect(playPokemonCry).toHaveBeenCalledWith('https://cry.ogg', 0.42)
  })
})
