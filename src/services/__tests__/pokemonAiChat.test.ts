import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { askPokemonAssistant } from '../pokemonAiChat.ts'
import type { PokemonDetail } from '../pokeApi.ts'

const mkPokemon = (overrides: Partial<PokemonDetail> = {}): PokemonDetail => ({
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: '', type: ['Electric'],
  stats: [{ key: 'hp', name: 'PS', value: 35 }],
  matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
  gameAppearances: [], evolution: '', evolutionChain: [], attacks: [], abilities: [],
  weight: '6 kg', height: '0.4 m', generation: 1, description: 'desc.',
  cryUrl: '', animatedSprite: '', baseExperience: 112,
  confidenceScore: 100, scannedAt: '', scanMode: 'búsqueda por texto',
  visualReason: '', dataVersion: 'v4',
  isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
  isRegional: false, isStarter: false, isUltraBeast: false,
  isParadox: false, isBaby: false,
  ...overrides,
})

describe('askPokemonAssistant', () => {
  beforeEach(() => vi.useRealTimers())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  // ── Local-only routing (no network) ──────────────────────────────────────

  it('uses the local source for "diferencia legendario mítico" without hitting fetch', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await askPokemonAssistant('diferencia entre legendario y mítico', null)
    expect(result.source).toBe('local')
    expect(result.answer).toMatch(/legendario/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('uses the local source for legendary-list questions', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await askPokemonAssistant('cuáles son los legendarios', null)
    expect(result.source).toBe('local')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('uses the local source for stone evolution (structured answer)', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await askPokemonAssistant('qué pokémon evolucionan con piedra', null)
    expect(result.source).toBe('local')
    expect(result.answer).toMatch(/Piedra Trueno/)
  })

  // ── OpenAI happy path ────────────────────────────────────────────────────

  it('returns openai source when /api/pokemon-chat responds with an answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ answer: 'Respuesta de la IA real', model: 'gpt-4o' }),
    }))

    const result = await askPokemonAssistant('¿cómo aprende Pikachu Volt Tackle?', null)
    expect(result.source).toBe('openai')
    expect(result.answer).toBe('Respuesta de la IA real')
    expect(result.model).toBe('gpt-4o')
  })

  // ── Server error fallbacks ───────────────────────────────────────────────

  it('falls back to local with source "local" when API returns missing_openai_key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ code: 'missing_openai_key', error: 'no key' }),
    }))

    const result = await askPokemonAssistant('¿qué movimiento le enseño?', null)
    expect(result.source).toBe('local')
    expect(result.error).toBe('no key')
    expect(result.answer).toMatch(/Primero busca o identifica/i)
  })

  it('falls back to local-fallback when API returns a generic error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'rate limited' }),
    }))

    const result = await askPokemonAssistant('¿qué movimiento le enseño?', null)
    expect(result.source).toBe('local-fallback')
    expect(result.error).toBe('rate limited')
  })

  it('uses default fallback error message when API !ok and no error field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }))

    const result = await askPokemonAssistant('¿qué le doy?', null)
    expect(result.source).toBe('local-fallback')
    expect(result.error).toBe('La IA real no respondió.')
  })

  // ── Network errors ───────────────────────────────────────────────────────

  it('falls back to local-fallback when fetch rejects (offline)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const result = await askPokemonAssistant('¿cómo aprende?', null)
    expect(result.source).toBe('local-fallback')
    expect(result.error).toBe('offline')
    expect(result.answer).toMatch(/Primero busca o identifica/i)
  })

  it('uses the timeout message when fetch is aborted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    ))

    const result = await askPokemonAssistant('¿cómo aprende?', null)
    expect(result.source).toBe('local-fallback')
    expect(result.error).toMatch(/tardó demasiado/)
  })

  it('uses local answer text as the body of the fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const result = await askPokemonAssistant('¿qué tipo es?', mkPokemon())
    expect(result.answer).toMatch(/Eléctrico/i)
  })

  it('uses local answer text from server payload.answer when provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ answer: 'desde IA', model: 'gpt-4o' }),
    }))

    const result = await askPokemonAssistant('¿qué hace?', mkPokemon())
    expect(result.answer).toBe('desde IA')
  })

  it('falls back to local answer when server.ok but answer is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ model: 'gpt-4o' }),
    }))

    const result = await askPokemonAssistant('¿qué hace?', mkPokemon())
    // Falls back to local answer for "qué hace" → catch-all description
    expect(result.answer).toMatch(/Pikachu/)
  })

  it('handles JSON parse errors gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error('Unexpected token')),
    }))

    const result = await askPokemonAssistant('test', null)
    expect(result.source).toBe('local-fallback')
    expect(result.error).toBe('La IA real no respondió.')
  })

  it('handles non-Error throws (string)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('plain string error'))

    const result = await askPokemonAssistant('test', null)
    expect(result.source).toBe('local-fallback')
    expect(result.error).toBe('Error desconocido')
  })
})
