import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch so TTS always fails → falls back to Web Speech API
vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

// Import after stubs are in place
const {
  buildPokedexAnnouncement,
  speakSyncAndWait,
  speakPokedexLine,
  playPokedexBeep,
} = await import('../pokedexVoice.ts')

// ── Helpers ───────────────────────────────────────────────────────────────────

import type { PokemonDetail } from '../../services/pokeApi.ts'

const mkPokemon = (overrides: Partial<PokemonDetail> = {}): PokemonDetail => ({
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: '', type: ['Electric'],
  stats: [], matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
  gameAppearances: [], evolution: '', evolutionChain: [], attacks: [], abilities: [],
  weight: '', height: '', generation: 1, description: 'Un Pokémon ratón eléctrico.',
  cryUrl: '', animatedSprite: '', baseExperience: 0,
  confidenceScore: 100, scannedAt: '', scanMode: '',
  visualReason: '', dataVersion: 'v4',
  isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
  isRegional: false, isStarter: false, isUltraBeast: false,
  isParadox: false, isBaby: false,
  ...overrides,
})

// ── buildPokedexAnnouncement ──────────────────────────────────────────────────

describe('buildPokedexAnnouncement', () => {
  it('returns empty string when pokemon is null', () => {
    expect(buildPokedexAnnouncement(null)).toBe('')
  })

  it('includes pokemon name', () => {
    const text = buildPokedexAnnouncement(mkPokemon())
    expect(text).toContain('Pikachu')
  })

  it('includes the type label', () => {
    const text = buildPokedexAnnouncement(mkPokemon({ type: ['Fire'] }))
    expect(text).toContain('Tipo')
  })

  it('includes the description', () => {
    const text = buildPokedexAnnouncement(mkPokemon({ description: 'Lanza rayos.' }))
    expect(text).toContain('Lanza rayos.')
  })

  it('handles dual types with "y" separator', () => {
    const text = buildPokedexAnnouncement(mkPokemon({ type: ['Fire', 'Flying'] }))
    // Types are translated to their display labels (e.g. Fuego, Volador)
    expect(text).toMatch(/ y /)
  })

  it('trims extra whitespace', () => {
    const text = buildPokedexAnnouncement(mkPokemon({ description: '  Rayos.  ' }))
    expect(text).not.toMatch(/\s{2,}/)
  })

  it('works when description is empty string', () => {
    const text = buildPokedexAnnouncement(mkPokemon({ description: '' }))
    expect(typeof text).toBe('string')
    expect(text).toContain('Pikachu')
  })
})

// ── speakSyncAndWait ──────────────────────────────────────────────────────────

describe('speakSyncAndWait', () => {
  let speakMock: ReturnType<typeof vi.fn>
  let cancelMock: ReturnType<typeof vi.fn>
  let mockUtterance: { onend: (() => void) | null; onerror: (() => void) | null }

  beforeEach(() => {
    speakMock = vi.fn()
    cancelMock = vi.fn()
    mockUtterance = { onend: null, onerror: null }

    // Must be a class (constructor) so `new SpeechSynthesisUtterance(...)` works
    const utteranceRef = mockUtterance
    vi.stubGlobal('SpeechSynthesisUtterance', class MockUtterance {
      lang = ''; rate = 1; pitch = 1; volume = 1; voice = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(_text: string) {
        void _text
        utteranceRef.onend = null
        utteranceRef.onerror = null
        // Link instance properties to the shared ref so tests can trigger them
        Object.defineProperty(utteranceRef, 'onend', {
          get: () => this.onend,
          set: (fn) => { this.onend = fn },
          configurable: true,
        })
        Object.defineProperty(utteranceRef, 'onerror', {
          get: () => this.onerror,
          set: (fn) => { this.onerror = fn },
          configurable: true,
        })
      }
    })
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: speakMock, cancel: cancelMock, getVoices: vi.fn(() => []) },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns immediately when text is empty', async () => {
    await expect(speakSyncAndWait('')).resolves.toBeUndefined()
    expect(speakMock).not.toHaveBeenCalled()
  })

  it('calls speechSynthesis.speak with the utterance', async () => {
    const promise = speakSyncAndWait('Hola')
    mockUtterance.onend?.()
    await promise
    expect(speakMock).toHaveBeenCalledOnce()
  })

  it('cancels previous speech before speaking', async () => {
    const promise = speakSyncAndWait('Test')
    mockUtterance.onend?.()
    await promise
    expect(cancelMock).toHaveBeenCalledBefore(speakMock)
  })

  it('resolves when utterance.onend fires', async () => {
    const promise = speakSyncAndWait('Pikachu')
    mockUtterance.onend?.()
    await expect(promise).resolves.toBeUndefined()
  })

  it('resolves when utterance.onerror fires', async () => {
    const promise = speakSyncAndWait('Error')
    mockUtterance.onerror?.()
    await expect(promise).resolves.toBeUndefined()
  })

  it('resolves immediately when speechSynthesis is not available', async () => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true, writable: true })
    await expect(speakSyncAndWait('Hola')).resolves.toBeUndefined()
  })
})

// ── playPokedexBeep ───────────────────────────────────────────────────────────

describe('playPokedexBeep', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves without throwing when AudioContext is available', async () => {
    const mockOsc = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }
    const mockGain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }
    const mockCtx = {
      state: 'running',
      currentTime: 0,
      createOscillator: vi.fn(() => mockOsc),
      createGain: vi.fn(() => mockGain),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
    }
    vi.stubGlobal('AudioContext', vi.fn(() => mockCtx))

    await expect(playPokedexBeep()).resolves.toBeUndefined()
  })

  it('resolves without throwing when AudioContext is unavailable', async () => {
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
    await expect(playPokedexBeep()).resolves.toBeUndefined()
  })
})

// ── speakPokedexLine ──────────────────────────────────────────────────────────

describe('speakPokedexLine', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns immediately when text is empty', async () => {
    await expect(speakPokedexLine('')).resolves.toBeUndefined()
  })

  it('calls onEnd callback after completion', async () => {
    const onEnd = vi.fn()

    let instanceOnend: (() => void) | null = null
    vi.stubGlobal('SpeechSynthesisUtterance', class MockUtterance {
      lang = ''; rate = 1; pitch = 1; volume = 1; voice = null
      set onend(fn: (() => void) | null) { instanceOnend = fn }
      get onend() { return instanceOnend }
      onerror: (() => void) | null = null
    })
    // speak() auto-fires onend after a tick, simulating speech completion
    const speakMock = vi.fn().mockImplementation(() => {
      setTimeout(() => instanceOnend?.(), 0)
    })
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: speakMock, cancel: vi.fn(), getVoices: vi.fn(() => []) },
      configurable: true, writable: true,
    })
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)

    await speakPokedexLine('Test', { withBeep: false, onEnd })

    expect(onEnd).toHaveBeenCalledOnce()
  })
})
