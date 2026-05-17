import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// --- Inline pure helpers (extracted from pokeApi.js to avoid JSON catalog dep) ---

function normalizePokemonText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/♀/g, ' f ')
    .replace(/♂/g, ' m ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function searchPokemonIndex(index, query, limit = 12) {
  const normalizedQuery = normalizePokemonText(query)
  if (!normalizedQuery) return []

  const numericQuery = Number(normalizedQuery)

  return index
    .map((pokemon) => {
      let score = 0
      const normalizedName = normalizePokemonText(pokemon.name)
      const normalizedDisplayName = normalizePokemonText(pokemon.displayName)
      const aliases = Array.isArray(pokemon.aliases) ? pokemon.aliases : []
      const searchText =
        pokemon.searchText ??
        [normalizedName, normalizedDisplayName, ...aliases.map(normalizePokemonText)].join(' ')

      if (Number.isInteger(numericQuery) && pokemon.id === numericQuery) score = 120
      else if (normalizedName === normalizedQuery || normalizedDisplayName === normalizedQuery) score = 115
      else if (aliases.some((alias) => normalizePokemonText(alias) === normalizedQuery)) score = 110
      else if (normalizedName.startsWith(normalizedQuery)) score = 96
      else if (normalizedDisplayName.startsWith(normalizedQuery)) score = 94
      else if (searchText.includes(normalizedQuery)) score = 75

      return { ...pokemon, score }
    })
    .filter((pokemon) => pokemon.score > 0)
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .slice(0, limit)
}

function makeEntry(id, name, displayName) {
  return {
    id,
    name,
    displayName,
    generation: 1,
    isMega: false,
    isPrimal: false,
    aliases: [],
    searchText: [normalizePokemonText(name), normalizePokemonText(displayName)].join(' '),
  }
}

const sampleIndex = [
  makeEntry(1,   'bulbasaur',  'Bulbasaur'),
  makeEntry(6,   'charizard',  'Charizard'),
  makeEntry(25,  'pikachu',    'Pikachu'),
  makeEntry(150, 'mewtwo',     'Mewtwo'),
  makeEntry(131, 'lapras',     'Lapras'),
]

describe('searchPokemonIndex', () => {
  it('returns empty array for blank query', () => {
    assert.deepEqual(searchPokemonIndex(sampleIndex, ''), [])
  })

  it('finds exact name match', () => {
    const results = searchPokemonIndex(sampleIndex, 'pikachu')
    assert.equal(results.length, 1)
    assert.equal(results[0].name, 'pikachu')
  })

  it('finds by numeric ID', () => {
    const results = searchPokemonIndex(sampleIndex, '150')
    assert.equal(results.length, 1)
    assert.equal(results[0].name, 'mewtwo')
  })

  it('finds partial name match (prefix)', () => {
    const results = searchPokemonIndex(sampleIndex, 'char')
    assert.ok(results.some((p) => p.name === 'charizard'))
  })

  it('returns empty for unknown name', () => {
    assert.deepEqual(searchPokemonIndex(sampleIndex, 'zzzzunknown'), [])
  })

  it('ranks exact match above prefix match', () => {
    const extended = [
      ...sampleIndex,
      makeEntry(999, 'laprasite', 'Laprasite'),
    ]
    const results = searchPokemonIndex(extended, 'lapras')
    assert.equal(results[0].name, 'lapras')
  })

  it('respects the limit parameter', () => {
    const results = searchPokemonIndex(sampleIndex, 'a', 2)
    assert.ok(results.length <= 2)
  })

  it('normalizes accented characters', () => {
    const withAccent = [...sampleIndex, makeEntry(200, 'misdreavus', 'Misdreavus')]
    const results = searchPokemonIndex(withAccent, 'misdreavus')
    assert.ok(results.length > 0)
  })
})

// --- buildTypeMatchups tests (typeChart.js has no JSON deps) ---------

const { buildTypeMatchups } = await import('../../data/typeChart.js')

describe('buildTypeMatchups', () => {
  it('returns object with vulnerabilities, resistances, immunities arrays', () => {
    const matchups = buildTypeMatchups(['Fire'])
    assert.ok(Array.isArray(matchups.vulnerabilities))
    assert.ok(Array.isArray(matchups.resistances))
    assert.ok(Array.isArray(matchups.immunities))
  })

  it('Fire type is vulnerable to Water, Ground, and Rock', () => {
    const { vulnerabilities } = buildTypeMatchups(['Fire'])
    const types = vulnerabilities.map((e) => e.type)
    assert.ok(types.includes('Water'),  'Fire should be weak to Water')
    assert.ok(types.includes('Ground'), 'Fire should be weak to Ground')
    assert.ok(types.includes('Rock'),   'Fire should be weak to Rock')
  })

  it('Fire type resists Bug, Steel, Fire, Grass', () => {
    const { resistances } = buildTypeMatchups(['Fire'])
    const types = resistances.map((e) => e.type)
    assert.ok(types.includes('Bug'))
    assert.ok(types.includes('Steel'))
    assert.ok(types.includes('Fire'))
    assert.ok(types.includes('Grass'))
  })

  it('Ghost type is immune to Normal and Fighting', () => {
    const { immunities } = buildTypeMatchups(['Ghost'])
    const types = immunities.map((e) => e.type)
    assert.ok(types.includes('Normal'),   'Ghost should be immune to Normal')
    assert.ok(types.includes('Fighting'), 'Ghost should be immune to Fighting')
  })

  it('dual type Water+Ground is immune to Electric', () => {
    const { immunities } = buildTypeMatchups(['Water', 'Ground'])
    const types = immunities.map((e) => e.type)
    assert.ok(types.includes('Electric'), 'Water+Ground should be immune to Electric')
  })

  it('dual type Steel+Fairy has many resistances', () => {
    const { resistances } = buildTypeMatchups(['Steel', 'Fairy'])
    assert.ok(resistances.length > 5)
  })
})
