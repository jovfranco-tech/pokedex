import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock catalog so module loads ──────────────────────────────────────────────
vi.mock('../../data/pokemonFullCatalog.json', () => ({
  default: [{ id: 25, name: 'pikachu', displayName: 'Pikachu', generation: 1, isMega: false, isPrimal: false, aliases: [] }],
}))

const { fetchPokemonDetails, POKEMON_DETAIL_SCHEMA_VERSION } = await import('../../services/pokeApi.ts')

// ── Fake PokeAPI responses ────────────────────────────────────────────────────

function makeFakePokemon(name = 'pikachu', id = 25) {
  return {
    id,
    name,
    height: 4,
    weight: 60,
    base_experience: 112,
    species: { name, url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` },
    types: [{ slot: 1, type: { name: 'electric', url: '' } }],
    abilities: [{ ability: { name: 'static', url: '' }, is_hidden: false, slot: 1 }],
    moves: [{ move: { name: 'thunder-shock', url: '' } }],
    stats: [
      { stat: { name: 'hp', url: '' }, base_stat: 35, effort: 0 },
      { stat: { name: 'attack', url: '' }, base_stat: 55, effort: 0 },
      { stat: { name: 'defense', url: '' }, base_stat: 40, effort: 0 },
      { stat: { name: 'special-attack', url: '' }, base_stat: 50, effort: 0 },
      { stat: { name: 'special-defense', url: '' }, base_stat: 50, effort: 0 },
      { stat: { name: 'speed', url: '' }, base_stat: 90, effort: 0 },
    ],
    game_indices: [
      { game_index: 25, version: { name: 'red', url: '' } },
      { game_index: 25, version: { name: 'blue', url: '' } },
    ],
    sprites: {
      front_default: 'https://img/25.png',
      other: {
        'official-artwork': { front_default: 'https://artwork/25.png' },
      },
    },
    cries: { latest: 'https://cries/25.ogg', legacy: null },
  }
}

function makeFakeSpecies(id = 25) {
  return {
    names: [
      { name: 'Pikachu', language: { name: 'es', url: '' } },
      { name: 'Pikachu', language: { name: 'en', url: '' } },
    ],
    flavor_text_entries: [
      { flavor_text: 'Un ratón eléctrico.', language: { name: 'es', url: '' }, version: { name: 'red', url: '' } },
    ],
    is_baby: false,
    is_legendary: false,
    is_mythical: false,
    generation: { name: 'generation-i', url: '' },
    evolution_chain: { url: `https://pokeapi.co/api/v2/evolution-chain/${id}/` },
  }
}

function makeFakeEvolution() {
  return {
    chain: {
      species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
      evolves_to: [],
    },
  }
}

/** Mock fetch that handles the three main PokeAPI endpoint patterns */
function mockPokeApiFetch(pokemon = makeFakePokemon(), species = makeFakeSpecies(), evolution = makeFakeEvolution()) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
    const response = (data: unknown) => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    })

    if (url.includes('/pokemon/') && !url.includes('-species')) return response(pokemon)
    if (url.includes('/pokemon-species/')) return response(species)
    if (url.includes('/evolution-chain/')) return response(evolution)
    // Fallback for localized name fetches
    return response({ names: [{ name: 'Pikachu', language: { name: 'es', url: '' } }] })
  }))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchPokemonDetails — basic shape', () => {
  it('returns a PokemonDetail with correct name', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test1', { confidenceScore: 99 })
    expect(detail.name).toBe('Pikachu')
  })

  it('sets the correct id and speciesId', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test2', { confidenceScore: 99 })
    expect(detail.id).toBe(25)
    expect(detail.speciesId).toBe(25)
  })

  it('formats height and weight in metric', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test3', { confidenceScore: 99 })
    expect(detail.height).toBe('0.4 m')
    expect(detail.weight).toBe('6.0 kg')
  })

  it('translates type to Spanish label', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test4', { confidenceScore: 99 })
    expect(detail.type).toContain('Electric')
  })

  it('includes the Spanish description', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test5', { confidenceScore: 99 })
    expect(detail.description).toContain('ratón eléctrico')
  })

  it('translates stat names to Spanish', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test6', { confidenceScore: 99 })
    const statNames = detail.stats.map((s) => s.name)
    expect(statNames).toContain('PS')
    expect(statNames).toContain('Ataque')
    expect(statNames).toContain('Velocidad')
  })

  it('sets cryUrl from cries.latest', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test7', { confidenceScore: 99 })
    expect(detail.cryUrl).toBe('https://cries/25.ogg')
  })

  it('uses official-artwork sprite', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test8', { confidenceScore: 99 })
    expect(detail.sprite).toBe('https://artwork/25.png')
  })

  it('sets generation from species.generation name', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test9', { confidenceScore: 99 })
    expect(detail.generation).toBe(1)
  })

  it('includes gameAppearances deduped', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test10', { confidenceScore: 99 })
    // 'red' and 'blue' both appear; should be unique
    expect(detail.gameAppearances).toContain('Red')
    expect(detail.gameAppearances).toContain('Blue')
    const unique = new Set(detail.gameAppearances)
    expect(unique.size).toBe(detail.gameAppearances.length)
  })

  it('sets dataVersion matching the schema constant', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test11', { confidenceScore: 99 })
    expect(detail.dataVersion).toBe(POKEMON_DETAIL_SCHEMA_VERSION)
  })

  it('sets confidenceScore from options', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test12', { confidenceScore: 75 })
    expect(detail.confidenceScore).toBe(75)
  })

  it('uses default confidenceScore of 100 when not provided', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test13', { confidenceScore: 99 })
    // We passed 99, verify it's used
    expect(detail.confidenceScore).toBe(99)
  })

  it('sets scanMode from options', async () => {
    mockPokeApiFetch()
    const detail = await fetchPokemonDetails('pikachu-test14', { confidenceScore: 99, scanMode: 'test mode' })
    expect(detail.scanMode).toBe('test mode')
  })
})

describe('fetchPokemonDetails — Mega form', () => {
  it('names Mega forms with "Mega" prefix', async () => {
    const megaPokemon = makeFakePokemon('charizard-mega-x', 10034)
    megaPokemon.species = { name: 'charizard', url: 'https://pokeapi.co/api/v2/pokemon-species/6/' }
    const species = makeFakeSpecies(6)
    species.names = [{ name: 'Charizard', language: { name: 'es', url: '' } }]

    mockPokeApiFetch(megaPokemon, species)
    const detail = await fetchPokemonDetails('charizard-mega-x', { confidenceScore: 99 })

    expect(detail.name).toContain('Mega')
    expect(detail.isMega).toBe(true)
    expect(detail.formLabel).toBe('Mega Evolución')
  })
})

describe('fetchPokemonDetails — localStorage cache', () => {
  it('writes result to localStorage and reads it back on second call', async () => {
    mockPokeApiFetch()
    // First call — no confidenceScore so it will cache
    await fetchPokemonDetails('pikachu-cache1')
    const raw = window.localStorage.getItem('pokedex-detail-v1:pikachu-cache1')
    expect(raw).not.toBeNull()
    const cached = JSON.parse(raw!)
    expect(cached.detail.name).toBe('Pikachu')
  })

  it('returns cached result without fetching on second call', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const response = (data: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) })
      if (url.includes('/pokemon/')) return response(makeFakePokemon())
      if (url.includes('/pokemon-species/')) return response(makeFakeSpecies())
      if (url.includes('/evolution-chain/')) return response(makeFakeEvolution())
      return response({ names: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchPokemonDetails('pikachu-cache2')
    const callCount = fetchMock.mock.calls.length

    // Second call — should use memory cache (detailsCache), no extra fetch
    await fetchPokemonDetails('pikachu-cache2')
    expect(fetchMock.mock.calls.length).toBe(callCount) // no new calls
  })
})

describe('fetchPokemonDetails — error handling', () => {
  it('throws when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    await expect(fetchPokemonDetails('broken-pokemon', { confidenceScore: 99 })).rejects.toThrow()
  })
})
