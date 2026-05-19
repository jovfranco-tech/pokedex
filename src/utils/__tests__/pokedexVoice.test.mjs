import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'

// Stub browser globals that pokedexVoice.js references at module load time.
globalThis.window = {
  addEventListener: () => {},
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
  speechSynthesis: { getVoices: () => [], addEventListener: () => {}, cancel: () => {}, speak: () => {} },
  AudioContext: undefined,
  webkitAudioContext: undefined,
}

const { buildPokedexAnnouncement } = await import('../pokedexVoice.ts')

describe('buildPokedexAnnouncement', () => {
  it('returns empty string for null', () => {
    assert.equal(buildPokedexAnnouncement(null), '')
  })

  it('returns empty string for undefined', () => {
    assert.equal(buildPokedexAnnouncement(undefined), '')
  })

  it('builds announcement with name, types in Spanish, and description', () => {
    const pokemon = {
      name: 'Charmander',
      type: ['Fire'],
      description: 'Un Pokémon llama.',
    }
    const result = buildPokedexAnnouncement(pokemon)
    assert.ok(result.startsWith('Charmander.'), `expected to start with "Charmander.", got: ${result}`)
    assert.ok(result.includes('Fuego'), `expected "Fuego" (Spanish type), got: ${result}`)
    assert.ok(result.includes('Un Pokémon llama.'), `expected description, got: ${result}`)
  })

  it('joins dual types with "y"', () => {
    const pokemon = { name: 'Charizard', type: ['Fire', 'Flying'], description: '' }
    const result = buildPokedexAnnouncement(pokemon)
    assert.ok(result.includes('Fuego y Volador'), `expected "Fuego y Volador", got: ${result}`)
  })

  it('handles missing type gracefully', () => {
    const pokemon = { name: 'MissingNo', description: 'Raro.' }
    const result = buildPokedexAnnouncement(pokemon)
    assert.ok(result.includes('MissingNo'), `expected name in result, got: ${result}`)
  })

  it('normalises extra whitespace', () => {
    const pokemon = { name: 'Bulbasaur', type: ['Grass'], description: '  Verde.  ' }
    const result = buildPokedexAnnouncement(pokemon)
    assert.ok(!result.startsWith(' '), 'result should not have leading space')
    assert.ok(!result.endsWith(' '), 'result should not have trailing space')
  })
})
