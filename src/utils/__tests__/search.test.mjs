import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Import the REAL shipped functions (no JSON catalog dependency)
const { normalizePokemonText, searchPokemonIndex } = await import('../../utils/pokemonSearch.ts')

function makeEntry(id, name, displayName, aliases = []) {
  return {
    id,
    name,
    displayName,
    generation: 1,
    isMega: false,
    isPrimal: false,
    aliases,
    searchText: [normalizePokemonText(name), normalizePokemonText(displayName), ...aliases.map(normalizePokemonText)].join(' '),
  }
}

const sampleIndex = [
  makeEntry(1,   'bulbasaur',  'Bulbasaur'),
  makeEntry(6,   'charizard',  'Charizard'),
  makeEntry(25,  'pikachu',    'Pikachu'),
  makeEntry(150, 'mewtwo',     'Mewtwo'),
  makeEntry(131, 'lapras',     'Lapras'),
]

describe('normalizePokemonText', () => {
  it('lowercases and removes accents', () => {
    assert.equal(normalizePokemonText('Pokémon'), 'pokemon')
    assert.equal(normalizePokemonText('Mítico'), 'mitico')
  })

  it('replaces gender symbols', () => {
    assert.ok(normalizePokemonText('Mr. Mime♂').includes('m'))
    assert.ok(normalizePokemonText('Nidoran♀').includes('f'))
  })

  it('collapses non-alphanumeric to spaces and trims', () => {
    assert.equal(normalizePokemonText('  Ho-Oh  '), 'ho oh')
  })

  it('returns empty string for empty input', () => {
    assert.equal(normalizePokemonText(''), '')
  })
})

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

  it('finds partial prefix match', () => {
    const results = searchPokemonIndex(sampleIndex, 'char')
    assert.ok(results.some((p) => p.name === 'charizard'))
  })

  it('returns empty for unknown query', () => {
    assert.deepEqual(searchPokemonIndex(sampleIndex, 'zzzzunknown'), [])
  })

  it('ranks exact match above prefix match', () => {
    const extended = [...sampleIndex, makeEntry(999, 'laprasite', 'Laprasite')]
    const results = searchPokemonIndex(extended, 'lapras')
    assert.equal(results[0].name, 'lapras')
  })

  it('respects limit parameter', () => {
    const results = searchPokemonIndex(sampleIndex, 'a', 2)
    assert.ok(results.length <= 2)
  })

  it('finds by alias', () => {
    const withAlias = [...sampleIndex, makeEntry(39, 'jigglypuff', 'Jigglypuff', ['globo', 'balloon'])]
    const results = searchPokemonIndex(withAlias, 'globo')
    assert.ok(results.some((p) => p.name === 'jigglypuff'))
  })
})

// --- buildTypeMatchups (typeChart.js has no JSON deps) ---------------
const { buildTypeMatchups } = await import('../../data/typeChart.ts')

describe('buildTypeMatchups', () => {
  it('returns vulnerabilities, resistances, immunities arrays', () => {
    const matchups = buildTypeMatchups(['Fire'])
    assert.ok(Array.isArray(matchups.vulnerabilities))
    assert.ok(Array.isArray(matchups.resistances))
    assert.ok(Array.isArray(matchups.immunities))
  })

  it('Fire is vulnerable to Water, Ground, Rock', () => {
    const types = buildTypeMatchups(['Fire']).vulnerabilities.map((e) => e.type)
    assert.ok(types.includes('Water'))
    assert.ok(types.includes('Ground'))
    assert.ok(types.includes('Rock'))
  })

  it('Fire resists Bug, Steel, Fire, Grass', () => {
    const types = buildTypeMatchups(['Fire']).resistances.map((e) => e.type)
    assert.ok(types.includes('Bug'))
    assert.ok(types.includes('Steel'))
    assert.ok(types.includes('Fire'))
    assert.ok(types.includes('Grass'))
  })

  it('Ghost is immune to Normal and Fighting', () => {
    const types = buildTypeMatchups(['Ghost']).immunities.map((e) => e.type)
    assert.ok(types.includes('Normal'))
    assert.ok(types.includes('Fighting'))
  })

  it('Water+Ground is immune to Electric', () => {
    const types = buildTypeMatchups(['Water', 'Ground']).immunities.map((e) => e.type)
    assert.ok(types.includes('Electric'))
  })

  it('Steel+Fairy has many resistances', () => {
    assert.ok(buildTypeMatchups(['Steel', 'Fairy']).resistances.length > 5)
  })
})
