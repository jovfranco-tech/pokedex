import { describe, it, expect } from 'vitest'
import { answerPokemonQuestion, shouldUseLocalPokemonAnswer } from '../pokemonAssistant.ts'
import type { PokemonDetail } from '../pokeApi.ts'

const mkPokemon = (overrides: Partial<PokemonDetail> = {}): PokemonDetail => ({
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: '', type: ['Electric'],
  stats: [
    { key: 'hp', name: 'PS', value: 35 },
    { key: 'attack', name: 'Ataque', value: 55 },
    { key: 'speed', name: 'Velocidad', value: 90 },
  ],
  matchups: {
    vulnerabilities: [{ type: 'Ground', multiplier: 2 }],
    resistances: [{ type: 'Flying', multiplier: 0.5 }, { type: 'Steel', multiplier: 0.5 }],
    immunities: [],
    effectiveAgainst: [{ type: 'Water', multiplier: 2 }],
    weakAgainst: [{ type: 'Electric', multiplier: 0.5 }],
  },
  gameAppearances: ['Red', 'Blue', 'Yellow'],
  evolution: 'Pichu → Pikachu → Raichu',
  evolutionChain: [],
  attacks: ['Impactrueno', 'Rayo', 'Trueno'],
  abilities: ['Estática', 'Pararrayos'],
  weight: '6 kg', height: '0.4 m', generation: 1,
  description: 'Pokémon ratón eléctrico.',
  cryUrl: 'https://cries/25.ogg', animatedSprite: '', baseExperience: 112,
  confidenceScore: 100, scannedAt: '', scanMode: 'búsqueda por texto',
  visualReason: '', dataVersion: 'v4',
  isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
  isRegional: false, isStarter: false, isUltraBeast: false,
  isParadox: false, isBaby: false,
  ...overrides,
})

describe('shouldUseLocalPokemonAnswer', () => {
  it('returns true for legendary list questions', () => {
    expect(shouldUseLocalPokemonAnswer('cuáles son los legendarios', null)).toBe(true)
  })

  it('returns true for mythical list questions', () => {
    expect(shouldUseLocalPokemonAnswer('lista de míticos', null)).toBe(true)
  })

  it('returns true for legendary/mythical difference questions', () => {
    expect(shouldUseLocalPokemonAnswer('diferencia entre legendario y mítico', null)).toBe(true)
  })

  it('returns true when pokémon is selected and question mentions legend', () => {
    expect(shouldUseLocalPokemonAnswer('¿es legendario este pokémon?', mkPokemon())).toBe(true)
  })

  it('returns true when pokémon is selected and question mentions mitic', () => {
    expect(shouldUseLocalPokemonAnswer('¿es mítico?', mkPokemon())).toBe(true)
  })

  it('returns false for arbitrary questions without pokémon context', () => {
    expect(shouldUseLocalPokemonAnswer('¿qué hora es?', null)).toBe(false)
  })
})

describe('answerPokemonQuestion — no pokémon selected', () => {
  it('returns category difference for "diferencia entre legendario y mítico"', () => {
    const answer = answerPokemonQuestion('diferencia entre legendario y mítico', null)
    expect(answer).toMatch(/legendario/i)
    expect(answer).toMatch(/mítico/i)
  })

  it('returns legendary list when asked', () => {
    const answer = answerPokemonQuestion('lista de pokémon legendarios', null)
    expect(answer).toMatch(/legendarios/i)
    expect(answer).toMatch(/Gen/)
  })

  it('returns mythical list when asked', () => {
    const answer = answerPokemonQuestion('cuáles son los pokémon míticos', null)
    expect(answer).toMatch(/míticos/i)
    expect(answer).toMatch(/Gen/)
  })

  it('returns a friendly placeholder when no pokémon and not a list question', () => {
    const answer = answerPokemonQuestion('¿es muy fuerte?', null)
    expect(answer).toMatch(/Primero busca o identifica/i)
  })
})

describe('answerPokemonQuestion — with pokémon context', () => {
  it('answers legendary status correctly when not legendary', () => {
    expect(answerPokemonQuestion('¿es legendario?', mkPokemon())).toMatch(/no.*legendario/i)
  })

  it('answers legendary status correctly when legendary', () => {
    expect(answerPokemonQuestion('¿es legendario?', mkPokemon({ isLegendary: true })))
      .toMatch(/sí.*legendario/i)
  })

  it('answers that mythical pokémon are not legendary but mythical', () => {
    expect(answerPokemonQuestion('¿es legendario?', mkPokemon({ isMythical: true })))
      .toMatch(/mítico/i)
  })

  it('answers mythical status correctly', () => {
    expect(answerPokemonQuestion('¿es mítico?', mkPokemon({ isMythical: true })))
      .toMatch(/sí.*mítico/i)
  })

  it('answers mythical-not-but-legendary correctly', () => {
    expect(answerPokemonQuestion('¿es mítico?', mkPokemon({ isLegendary: true })))
      .toMatch(/legendario/i)
  })

  it('returns the type list', () => {
    expect(answerPokemonQuestion('¿de qué tipo es?', mkPokemon())).toMatch(/Eléctrico/i)
  })

  it('returns the attacks list', () => {
    const answer = answerPokemonQuestion('¿qué ataques tiene?', mkPokemon())
    expect(answer).toMatch(/Impactrueno/)
    expect(answer).toMatch(/Rayo/)
  })

  it('returns the stats list', () => {
    const answer = answerPokemonQuestion('¿cuáles son sus stats?', mkPokemon())
    expect(answer).toMatch(/PS: 35/)
    expect(answer).toMatch(/Velocidad: 90/)
  })

  it('returns "no stats" if stats array is empty', () => {
    const answer = answerPokemonQuestion('stats', mkPokemon({ stats: [] }))
    expect(answer).toMatch(/No tengo stats/i)
  })

  it('returns the abilities list', () => {
    const answer = answerPokemonQuestion('¿qué habilidades tiene?', mkPokemon())
    expect(answer).toMatch(/Estática/)
    expect(answer).toMatch(/Pararrayos/)
  })

  it('returns the evolution chain', () => {
    expect(answerPokemonQuestion('¿cómo evoluciona?', mkPokemon())).toMatch(/Pichu.*Raichu/)
  })

  it('returns the height when asked', () => {
    expect(answerPokemonQuestion('¿cuánto mide?', mkPokemon())).toMatch(/0\.4 m/)
  })

  it('returns the weight when asked', () => {
    expect(answerPokemonQuestion('¿cuánto pesa?', mkPokemon())).toMatch(/6 kg/)
  })

  it('returns resistances and immunities', () => {
    const answer = answerPokemonQuestion('¿qué resiste?', mkPokemon())
    expect(answer).toMatch(/Volador/i)
    expect(answer).toMatch(/Acero/i)
  })

  it('says "sin resistencias" when none', () => {
    const empty = { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] }
    expect(answerPokemonQuestion('¿qué resiste?', mkPokemon({ matchups: empty })))
      .toMatch(/no tiene resistencias/i)
  })

  it('returns offensive effectiveness', () => {
    expect(answerPokemonQuestion('¿contra qué es efectivo?', mkPokemon())).toMatch(/Agua/i)
  })

  it('says "sin fortalezas" when no effective types', () => {
    const empty = { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] }
    expect(answerPokemonQuestion('¿contra qué es efectivo?', mkPokemon({ matchups: empty })))
      .toMatch(/no tiene fortalezas/i)
  })

  it('returns weaknesses', () => {
    expect(answerPokemonQuestion('¿qué debilidades tiene?', mkPokemon())).toMatch(/Tierra/i)
  })

  it('says "no debilidades cargadas" when empty', () => {
    const empty = { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] }
    expect(answerPokemonQuestion('debilidades', mkPokemon({ matchups: empty })))
      .toMatch(/no tengo debilidades/i)
  })

  it('says sound is available when cryUrl present', () => {
    expect(answerPokemonQuestion('¿tiene sonido?', mkPokemon())).toMatch(/sí.*sonido/i)
  })

  it('says no sound when cryUrl empty', () => {
    expect(answerPokemonQuestion('¿tiene sonido?', mkPokemon({ cryUrl: '' })))
      .toMatch(/no encontré sonido/i)
  })

  it('returns the generation', () => {
    expect(answerPokemonQuestion('¿de qué generación es?', mkPokemon())).toMatch(/generación 1/i)
  })

  it('returns the game appearances', () => {
    const answer = answerPokemonQuestion('¿en qué juegos aparece?', mkPokemon())
    expect(answer).toMatch(/Red/)
    expect(answer).toMatch(/Blue/)
  })

  it('says "no juegos" when game appearances is empty', () => {
    expect(answerPokemonQuestion('juegos', mkPokemon({ gameAppearances: [] })))
      .toMatch(/no trae juegos/i)
  })

  it('returns the catch-all description for unknown questions', () => {
    const answer = answerPokemonQuestion('hola amigo cómo estás', mkPokemon())
    expect(answer).toMatch(/Pikachu/)
    expect(answer).toMatch(/Eléctrico/)
  })
})
