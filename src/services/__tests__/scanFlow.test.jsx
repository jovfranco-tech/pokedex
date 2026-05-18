import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// ── Module-level mocks (hoisted before imports) ───────────────────────────────

// Image processing utility — not the scan flow we're testing
vi.mock('../../utils/imageDataUrl.js', () => ({
  fileToModelImageDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,testdata=='),
}))

// Catalog JSON — prevents loading the real 1000+ entry file
vi.mock('../../data/pokemonFullCatalog.json', () => ({
  default: [],
}))

// fetchPokemonDetails is a separate unit (tested in pokeApi.test.jsx).
// We preserve all pure helpers (normalizePokemonText, searchPokemonIndex, etc.)
// and replace only the network-bound function.
vi.mock('../../services/pokeApi.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchPokemonDetails: vi.fn().mockImplementation(async (name, meta = {}) => ({
      id: meta.id ?? 0,
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      types: [],
      stats: [],
      moves: [],
      description: 'Test description.',
      ...meta,
    })),
  }
})

// ── Import the module under test AFTER mocks are declared ────────────────────
const { identifyPokemonFromImage } = await import('../../services/visionSimulator.js')

// ── Shared fixtures ───────────────────────────────────────────────────────────

const SAMPLE_INDEX = [
  { id: 25,  name: 'pikachu',   displayName: 'Pikachu',   generation: 1, isMega: false, isPrimal: false, aliases: [] },
  { id: 6,   name: 'charizard', displayName: 'Charizard', generation: 1, isMega: false, isPrimal: false, aliases: [] },
  { id: 1,   name: 'bulbasaur', displayName: 'Bulbasaur', generation: 1, isMega: false, isPrimal: false, aliases: [] },
  { id: 150, name: 'mewtwo',    displayName: 'Mewtwo',    generation: 1, isMega: false, isPrimal: false, aliases: [] },
]

/** Build a mock fetch that returns a canned response for /api/identify-pokemon */
function makeVisionFetch(payload, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  })
}

/** A file whose name gives no Pokémon hint */
const genericFile = (name = 'photo_001.jpg') => new File([''], name, { type: 'image/jpeg' })

// ── Integration tests ─────────────────────────────────────────────────────────

describe('identifyPokemonFromImage — scan flow (HTTP-level mock)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // ── Happy path: AI vision API returns a confident match ───────────────────

  it('returns the AI-matched Pokémon when the vision API responds successfully', async () => {
    vi.stubGlobal('fetch', makeVisionFetch({
      isPokemon: true,
      pokemonName: 'pikachu',
      pokemonId: 25,
      confidenceScore: 95,
      reason: 'Yellow mouse with lightning-bolt tail',
      model: 'gpt-4o',
      candidates: [],
    }))

    // Use a generic filename so filename-matching can't produce a false positive
    const promise = identifyPokemonFromImage(genericFile('DSC_0001.jpg'), SAMPLE_INDEX)
    await vi.advanceTimersByTimeAsync(700)   // skip 650 ms SCAN_DELAY_MS
    const result = await promise

    expect(result).not.toBeNull()
    expect(result.name).toBe('pikachu')
    expect(result.confidenceScore).toBe(95)
  })

  it('populates scanCandidates from the AI response', async () => {
    vi.stubGlobal('fetch', makeVisionFetch({
      isPokemon: true,
      pokemonName: 'charizard',
      pokemonId: 6,
      confidenceScore: 88,
      reason: 'Orange dragon-like Pokémon',
      model: 'gpt-4o',
      candidates: [
        { pokemonName: 'charmander', confidenceScore: 55, reason: 'Pre-evolution' },
      ],
    }))

    const promise = identifyPokemonFromImage(genericFile('IMG_2048.jpg'), SAMPLE_INDEX)
    await vi.advanceTimersByTimeAsync(700)
    const result = await promise

    expect(Array.isArray(result.scanCandidates)).toBe(true)
    // Primary match must appear in candidates
    expect(result.scanCandidates[0].apiName).toBe('charizard')
    expect(result.scanCandidates[0].confidenceScore).toBe(88)
  })

  // ── Fallback path: AI unavailable, filename used instead ─────────────────

  it('falls back to filename matching when the network is offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const promise = identifyPokemonFromImage(new File([''], 'pikachu.jpg', { type: 'image/jpeg' }), SAMPLE_INDEX)
    await vi.advanceTimersByTimeAsync(700)
    const result = await promise

    expect(result).not.toBeNull()
    expect(result.name).toBe('pikachu')
  })

  it('falls back to filename matching when the API key is missing (503 missing_openai_key)', async () => {
    vi.stubGlobal('fetch', makeVisionFetch(
      { code: 'missing_openai_key', error: 'OpenAI API key is not configured.' },
      503,
    ))

    const promise = identifyPokemonFromImage(new File([''], 'charizard.png', { type: 'image/png' }), SAMPLE_INDEX)
    await vi.advanceTimersByTimeAsync(700)
    const result = await promise

    expect(result).not.toBeNull()
    expect(result.name).toBe('charizard')
  })

  it('falls back to filename matching when AI confidence is below threshold', async () => {
    vi.stubGlobal('fetch', makeVisionFetch({
      isPokemon: true,
      pokemonName: 'bulbasaur',
      pokemonId: 1,
      confidenceScore: 10,   // below MIN_AI_CONFIDENCE_SCORE (38)
      reason: 'Unclear image',
      model: 'gpt-4o',
      candidates: [],
    }))

    const promise = identifyPokemonFromImage(new File([''], 'bulbasaur.jpg', { type: 'image/jpeg' }), SAMPLE_INDEX)
    await vi.advanceTimersByTimeAsync(700)
    const result = await promise

    // AI result discarded, filename fallback kicks in
    expect(result).not.toBeNull()
    expect(result.name).toBe('bulbasaur')
  })

  it('falls back to filename matching when AI says isPokemon=false', async () => {
    vi.stubGlobal('fetch', makeVisionFetch({
      isPokemon: false,
      pokemonName: null,
      confidenceScore: 0,
      reason: 'No Pokémon detected',
      model: 'gpt-4o',
      candidates: [],
    }))

    const promise = identifyPokemonFromImage(new File([''], 'mewtwo.jpg', { type: 'image/jpeg' }), SAMPLE_INDEX)
    await vi.advanceTimersByTimeAsync(700)
    const result = await promise

    expect(result).not.toBeNull()
    expect(result.name).toBe('mewtwo')
  })

  // ── No-match path ─────────────────────────────────────────────────────────

  it('returns null when AI fails and the filename gives no Pokémon hint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const promise = identifyPokemonFromImage(genericFile('DSC_9999.jpg'), SAMPLE_INDEX)
    await vi.advanceTimersByTimeAsync(700)
    const result = await promise

    expect(result).toBeNull()
  })

  // ── Cache path ────────────────────────────────────────────────────────────

  it('returns the cached result on a second call with the same file', async () => {
    const mockFetch = makeVisionFetch({
      isPokemon: true,
      pokemonName: 'mewtwo',
      pokemonId: 150,
      confidenceScore: 97,
      reason: 'Legendary Pokémon',
      model: 'gpt-4o',
      candidates: [],
    })
    vi.stubGlobal('fetch', mockFetch)

    // Use a stable File reference so the fingerprint is identical across both calls
    const file = new File([''], 'cache-test.jpg', { type: 'image/jpeg' })

    const p1 = identifyPokemonFromImage(file, SAMPLE_INDEX)
    await vi.advanceTimersByTimeAsync(700)
    const r1 = await p1

    // Second call — should be served from the session cache, no new fetch
    const callsBefore = mockFetch.mock.calls.length
    const p2 = identifyPokemonFromImage(file, SAMPLE_INDEX)
    await vi.advanceTimersByTimeAsync(700)
    const r2 = await p2

    expect(r2).toEqual(r1)
    expect(mockFetch.mock.calls.length).toBe(callsBefore)  // fetch NOT called again
  })
})
