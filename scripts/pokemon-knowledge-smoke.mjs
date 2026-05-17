import assert from 'node:assert/strict'
import { legendaryPokemonByGeneration, mythicalPokemonByGeneration } from '../src/data/pokemonCategories.js'
import { answerPokemonQuestion, shouldUseLocalPokemonAnswer } from '../src/services/pokemonAssistant.js'

const legendaryCount = legendaryPokemonByGeneration.reduce((total, group) => total + group.pokemon.length, 0)
const mythicalCount = mythicalPokemonByGeneration.reduce((total, group) => total + group.pokemon.length, 0)

assert.equal(legendaryCount, 71)
assert.equal(mythicalCount, 23)

const mythicalQuestion = 'lístame los pokemon míticos'
const legendaryQuestion = 'qué pokemon legendarios hay'
const differenceQuestion = 'diferencia entre pokemon legendario y pokemon mitico'

assert.equal(shouldUseLocalPokemonAnswer(mythicalQuestion, null), true)
assert.equal(shouldUseLocalPokemonAnswer(legendaryQuestion, null), true)
assert.equal(shouldUseLocalPokemonAnswer(differenceQuestion, null), true)
assert.match(answerPokemonQuestion(mythicalQuestion, null), /Pecharunt/)
assert.match(answerPokemonQuestion(legendaryQuestion, null), /Mewtwo/)
assert.match(answerPokemonQuestion(differenceQuestion, null), /Mew.*mítico.*legendario/s)
assert.match(answerPokemonQuestion('¿es mítico?', { name: 'Mew', isMythical: true, isLegendary: false, type: ['Psychic'] }), /Sí/)
assert.match(answerPokemonQuestion('¿es legendario?', { name: 'Mew', isMythical: true, isLegendary: false, type: ['Psychic'] }), /mítico/)

console.log('pokemon knowledge smoke ok')
