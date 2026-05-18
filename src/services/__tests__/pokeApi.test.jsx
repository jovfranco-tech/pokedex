import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// Mock the JSON catalog so the module loads without a real file
vi.mock('../../data/pokemonFullCatalog.json', () => ({
  default: [
    { id: 1,  name: 'bulbasaur',  displayName: 'Bulbasaur',  generation: 1, isMega: false, isPrimal: false, aliases: [] },
    { id: 25, name: 'pikachu',   displayName: 'Pikachu',    generation: 1, isMega: false, isPrimal: false, aliases: [] },
    { id: 150, name: 'mewtwo',   displayName: 'Mewtwo',     generation: 1, isMega: false, isPrimal: false, aliases: [] },
  ],
}))

const { getGenerationFromId, formatPokemonName, loadPokemonIndex, POKEMON_DETAIL_SCHEMA_VERSION } =
  await import('../../services/pokeApi.js')

// ── Pure helpers ──────────────────────────────────────────────────────────────

describe('getGenerationFromId', () => {
  it('returns Gen 1 for ids 1-151', () => {
    expect(getGenerationFromId(1)).toBe(1)
    expect(getGenerationFromId(151)).toBe(1)
  })

  it('returns Gen 2 for ids 152-251', () => {
    expect(getGenerationFromId(152)).toBe(2)
    expect(getGenerationFromId(251)).toBe(2)
  })

  it('returns Gen 9 for very large ids (unknown → fallback)', () => {
    expect(getGenerationFromId(9999)).toBe(9)
  })

  it('covers all 9 generations without gaps', () => {
    const genSamples = [1, 152, 252, 387, 494, 650, 722, 810, 906]
    genSamples.forEach((id, idx) => {
      expect(getGenerationFromId(id)).toBe(idx + 1)
    })
  })
})

describe('formatPokemonName', () => {
  it('capitalises each hyphen-separated part', () => {
    expect(formatPokemonName('bulbasaur')).toBe('Bulbasaur')
    expect(formatPokemonName('mr-mime')).toBe('Mr. Mime')
    expect(formatPokemonName('ho-oh')).toBe('Ho-Oh')
    expect(formatPokemonName('porygon-z')).toBe('Porygon-Z')
  })

  it('handles empty string gracefully', () => {
    expect(formatPokemonName('')).toBe('')
  })

  it('applies special-case replacements correctly', () => {
    expect(formatPokemonName('mime-jr')).toBe('Mime Jr.')
  })
})

describe('POKEMON_DETAIL_SCHEMA_VERSION', () => {
  it('is a non-empty string', () => {
    expect(typeof POKEMON_DETAIL_SCHEMA_VERSION).toBe('string')
    expect(POKEMON_DETAIL_SCHEMA_VERSION.length).toBeGreaterThan(0)
  })
})

// ── loadPokemonIndex with mocked fetch ────────────────────────────────────────

describe('loadPokemonIndex — network fallback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to the bundled catalog when network fails and cache is empty', async () => {
    // The top-level vi.mock for pokemonFullCatalog.json already applies;
    // loadPokemonIndex catches fetch errors and returns the catalog.
    const index = await loadPokemonIndex()
    expect(Array.isArray(index)).toBe(true)
    // The mock catalog has 3 entries; real or cached result will also be non-empty
    expect(index.length).toBeGreaterThan(0)
  })
})
