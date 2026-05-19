import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import { formatPokemonNumber } from '../formatPokemonNumber.ts'

describe('formatPokemonNumber', () => {
  it('pads single-digit IDs to three digits', () => {
    assert.equal(formatPokemonNumber(1), '#001')
  })

  it('pads two-digit IDs to three digits', () => {
    assert.equal(formatPokemonNumber(25), '#025')
  })

  it('does not pad three-digit IDs', () => {
    assert.equal(formatPokemonNumber(151), '#151')
  })

  it('handles four-digit IDs without truncating', () => {
    assert.equal(formatPokemonNumber(1025), '#1025')
  })

  it('handles string input', () => {
    assert.equal(formatPokemonNumber('7'), '#007')
  })
})
