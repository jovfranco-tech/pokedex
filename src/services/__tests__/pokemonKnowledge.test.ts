import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tryAnswerStructuredPokemonQuestion } from '../pokemonKnowledge.ts'
import type { PokemonDetail } from '../pokeApi.ts'

const mkPokemon = (overrides: Partial<PokemonDetail> = {}): PokemonDetail => ({
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: '', type: ['Electric'],
  stats: [
    { key: 'hp', name: 'PS', value: 35 },
    { key: 'speed', name: 'Velocidad', value: 90 },
  ],
  matchups: {
    vulnerabilities: [{ type: 'Ground', multiplier: 2 }],
    resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [],
  },
  gameAppearances: [], evolution: '', evolutionChain: [], attacks: [], abilities: [],
  weight: '6 kg', height: '0.4 m', generation: 1, description: 'Pokémon ratón eléctrico.',
  cryUrl: '', animatedSprite: '', baseExperience: 112,
  confidenceScore: 100, scannedAt: '', scanMode: 'búsqueda por texto',
  visualReason: '', dataVersion: 'v4',
  isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
  isRegional: false, isStarter: false, isUltraBeast: false,
  isParadox: false, isBaby: false,
  ...overrides,
})

describe('tryAnswerStructuredPokemonQuestion', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.restoreAllMocks())

  // ── Stone evolution path (no fetch needed) ────────────────────────────────

  it('returns the stone-evolution summary for "piedra evolución" questions', async () => {
    const answer = await tryAnswerStructuredPokemonQuestion('qué pokémon evolucionan con piedra', null)
    expect(answer).toMatch(/Piedra Trueno/i)
    expect(answer).toMatch(/Piedra Fuego/i)
    expect(answer).toMatch(/Piedra Agua/i)
  })

  // ── Generation list path (no fetch needed) ────────────────────────────────

  it('returns a generation list when asking for gen 1', async () => {
    const answer = await tryAnswerStructuredPokemonQuestion('lista de pokémon de gen 1', null)
    expect(answer).toMatch(/Gen 1/i)
    expect(answer).toMatch(/Pokémon en la Pokédex/i)
  })

  it('returns a generation list using roman numerals (gen iii)', async () => {
    const answer = await tryAnswerStructuredPokemonQuestion('lista pokemon de gen iii', null)
    expect(answer).toMatch(/Gen 3/i)
  })

  it('handles "generacion" spelled out', async () => {
    const answer = await tryAnswerStructuredPokemonQuestion('cuáles son los pokémon de generación 2', null)
    expect(answer).toMatch(/Gen 2/i)
  })

  // ── Type list path (needs fetch) ──────────────────────────────────────────

  it('fetches and returns type list when asked', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        pokemon: [
          { pokemon: { name: 'charmander' } },
          { pokemon: { name: 'charizard' } },
        ],
      }),
    })
    vi.stubGlobal('fetch', fakeFetch)

    const answer = await tryAnswerStructuredPokemonQuestion('lista de pokémon tipo fuego', null)
    expect(fakeFetch).toHaveBeenCalledWith(expect.stringContaining('/type/fire'))
    expect(answer).toMatch(/tipo Fuego/i)
  })

  it('returns null when the type API responds with !ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const answer = await tryAnswerStructuredPokemonQuestion('listame todos los pokemon tipo agua', null)
    expect(answer).toBeNull()
  })

  // ── Counter / "contra X qué es fuerte" path ───────────────────────────────

  it('returns counter advice when matchups are present and selected pokémon given', async () => {
    const answer = await tryAnswerStructuredPokemonQuestion(
      'qué es fuerte contra esto',
      mkPokemon(),
    )
    expect(answer).toMatch(/Pikachu/)
    expect(answer).toMatch(/Tierra/i)
  })

  it('returns null for counter question when matchups missing', async () => {
    const emptyMatchups = mkPokemon({ matchups: {
      vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [],
    }})
    const answer = await tryAnswerStructuredPokemonQuestion(
      'contra qué es fuerte',
      emptyMatchups,
    )
    expect(answer).toBeNull()
  })

  it('returns null when counter question keywords are missing', async () => {
    const answer = await tryAnswerStructuredPokemonQuestion('cuéntame sobre esto', mkPokemon())
    expect(answer).toBeNull()
  })

  // ── No-match path ─────────────────────────────────────────────────────────

  it('returns null for arbitrary chit-chat', async () => {
    const answer = await tryAnswerStructuredPokemonQuestion('hola, ¿cómo estás?', null)
    expect(answer).toBeNull()
  })

  it('returns null for invalid generation number (e.g. gen 99)', async () => {
    const answer = await tryAnswerStructuredPokemonQuestion('lista de gen 99', null)
    expect(answer).toBeNull()
  })
})
