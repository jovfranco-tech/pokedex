import { getTypeMeta } from '../data/typeColors.js'
import {
  legendaryPokemonByGeneration,
  mythicalPokemonByGeneration,
} from '../data/pokemonCategories.js'

const normalize = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const typeLabel = (type) => getTypeMeta(type).label

const categoryListIntents = ['lista', 'listar', 'listame', 'cuales', 'todos', 'enumera', 'enumerame', 'nombra', 'menciona']
const categoryPluralPrompts = ['dime', 'muestra', 'muestrame']

function asksForCategoryList(text, categoryStem) {
  if (!text.includes(categoryStem)) return false
  if (categoryListIntents.some((intent) => text.includes(intent))) return true
  if (categoryPluralPrompts.some((intent) => text.includes(intent)) && /\b(los|todos)\b/.test(text)) return true
  return text.includes('pokemon') && /\b(son|hay)\b/.test(text)
}

function asksForLegendaryList(text) {
  return asksForCategoryList(text, 'legend')
}

function asksForMythicalList(text) {
  return asksForCategoryList(text, 'mitic')
}

function asksForLegendaryMythicalDifference(text) {
  if (!text.includes('legend') || !text.includes('mitic')) return false
  return text.includes('difer') || text.includes('compar') || text.includes('distin') || text.includes('entre')
}

function categoryListAnswer(groupsByGeneration, categoryLabel, note) {
  const total = groupsByGeneration.reduce((count, group) => count + group.pokemon.length, 0)
  const groups = groupsByGeneration
    .map((group) => `Gen ${group.generation}: ${group.pokemon.join(', ')}`)
    .join('. ')

  return `Claro. Estos son los ${total} Pokémon ${categoryLabel} registrados hasta la generación IX: ${groups}. ${note}`
}

function legendaryListAnswer() {
  return categoryListAnswer(
    legendaryPokemonByGeneration,
    'legendarios principales',
    'No incluí Pokémon míticos como Mew, Celebi, Jirachi o Arceus, porque esa es otra categoría.',
  )
}

function mythicalListAnswer() {
  return categoryListAnswer(
    mythicalPokemonByGeneration,
    'míticos',
    'Los separo de los legendarios porque PokéAPI y la Pokédex los marcan como una categoría distinta.',
  )
}

function legendaryMythicalDifferenceAnswer() {
  return 'La diferencia principal es que un Pokémon legendario suele formar parte de mitos importantes del mundo Pokémon y normalmente está asociado a fuerzas, lugares o historias grandes, como Mewtwo, Lugia, Rayquaza o Zacian. Un Pokémon mítico es una categoría todavía más rara y especial: normalmente está ligado a eventos, distribuciones especiales o historias secretas, como Mew, Celebi, Jirachi, Darkrai, Arceus o Pecharunt. En esta app los separo como PokéAPI: legendario usa la marca isLegendary y mítico usa isMythical, por eso Mew aparece como mítico y no como legendario.'
}

function formatMatchup(entry) {
  return `${typeLabel(entry.type)} x${entry.multiplier}`
}

function weaknessAnswer(pokemon) {
  const weaknesses = pokemon.matchups?.vulnerabilities?.map(formatMatchup) ?? []
  if (!weaknesses.length) return `No tengo debilidades cargadas para ${pokemon.name}.`
  return `${pokemon.name} puede tener problemas contra ataques de tipo ${weaknesses.join(', ')}.`
}

function resistanceAnswer(pokemon) {
  const resistances = pokemon.matchups?.resistances?.map(formatMatchup) ?? []
  const immunities = pokemon.matchups?.immunities?.map((entry) => `${typeLabel(entry.type)} x0`) ?? []
  const combined = [...resistances, ...immunities]
  if (!combined.length) return `${pokemon.name} no tiene resistencias registradas con sus tipos actuales.`
  return `${pokemon.name} resiste o ignora estos tipos: ${combined.join(', ')}.`
}

function effectiveAnswer(pokemon) {
  const effective = pokemon.matchups?.effectiveAgainst?.map((entry) => typeLabel(entry.type)) ?? []
  if (!effective.length) return `${pokemon.name} no tiene fortalezas ofensivas registradas con sus tipos actuales.`
  return `Por sus tipos, ${pokemon.name} suele ser efectivo contra: ${effective.join(', ')}.`
}

function legendaryAnswer(pokemon) {
  if (pokemon.isLegendary) return `Sí, ${pokemon.name} está registrado como Pokémon legendario.`
  if (pokemon.isMythical) return `${pokemon.name} no está registrado como legendario; está registrado como Pokémon mítico.`
  return `No, ${pokemon.name} no está registrado como Pokémon legendario.`
}

function mythicalAnswer(pokemon) {
  if (pokemon.isMythical) return `Sí, ${pokemon.name} está registrado como Pokémon mítico.`
  if (pokemon.isLegendary) return `${pokemon.name} no está registrado como mítico; está registrado como Pokémon legendario.`
  return `No, ${pokemon.name} no está registrado como Pokémon mítico.`
}

export function shouldUseLocalPokemonAnswer(question, pokemon) {
  const text = normalize(question)
  return asksForLegendaryMythicalDifference(text) || asksForLegendaryList(text) || asksForMythicalList(text) || Boolean(pokemon && (text.includes('legend') || text.includes('mitic')))
}

export function answerPokemonQuestion(question, pokemon) {
  const text = normalize(question)

  if (asksForLegendaryMythicalDifference(text)) {
    return legendaryMythicalDifferenceAnswer()
  }

  if (asksForLegendaryList(text)) {
    return legendaryListAnswer()
  }

  if (asksForMythicalList(text)) {
    return mythicalListAnswer()
  }

  if (!pokemon) {
    return 'Primero busca o identifica un Pokémon. Después puedo responder sobre tipo, si es legendario o mítico, stats, juegos, ataques, habilidades, evolución, altura, peso, sonido, debilidades, resistencias y contra qué es efectivo.'
  }

  if (text.includes('legend')) {
    return legendaryAnswer(pokemon)
  }

  if (text.includes('mitic')) {
    return mythicalAnswer(pokemon)
  }

  if (text.includes('tipo') || text.includes('elemento')) {
    return `${pokemon.name} es de tipo ${pokemon.type.map(typeLabel).join(' / ')}.`
  }

  if (text.includes('ataque') || text.includes('movimiento')) {
    return `Algunos movimientos de ${pokemon.name} son: ${pokemon.attacks.join(', ')}.`
  }

  if (text.includes('stat') || text.includes('ps') || text.includes('defensa') || text.includes('velocidad')) {
    const stats = pokemon.stats?.map((stat) => `${stat.name}: ${stat.value}`).join(', ')
    return stats ? `Stats base de ${pokemon.name}: ${stats}.` : `No tengo stats cargados para ${pokemon.name}.`
  }

  if (text.includes('habilidad') || text.includes('ability')) {
    return `${pokemon.name} tiene estas habilidades registradas: ${pokemon.abilities.join(', ')}.`
  }

  if (text.includes('evol')) {
    return `La línea de evolución registrada es: ${pokemon.evolution}.`
  }

  if (text.includes('altura') || text.includes('mide')) {
    return `${pokemon.name} mide aproximadamente ${pokemon.height}.`
  }

  if (text.includes('peso') || text.includes('pesa')) {
    return `${pokemon.name} pesa aproximadamente ${pokemon.weight}.`
  }

  if (text.includes('resist') || text.includes('inmune')) {
    return resistanceAnswer(pokemon)
  }

  if (text.includes('efectivo') || text.includes('fuerte') || text.includes('fortaleza') || text.includes('vence')) {
    return effectiveAnswer(pokemon)
  }

  if (text.includes('debil') || text.includes('vulner')) {
    return weaknessAnswer(pokemon)
  }

  if (text.includes('sonido') || text.includes('cry') || text.includes('escuchar')) {
    return pokemon.cryUrl
      ? `Sí, ${pokemon.name} tiene sonido disponible. Usa el botón "Escuchar sonido" en su ficha.`
      : `No encontré sonido disponible para ${pokemon.name}.`
  }

  if (text.includes('generacion') || text.includes('gen')) {
    return `${pokemon.name} pertenece a la generación ${pokemon.generation}.`
  }

  if (text.includes('juego') || text.includes('version') || text.includes('aparece')) {
    const games = pokemon.gameAppearances?.slice(0, 12).join(', ')
    return games
      ? `${pokemon.name} aparece en estos juegos registrados por PokéAPI: ${games}${pokemon.gameAppearances.length > 12 ? ' y más.' : '.'}`
      : `PokéAPI no trae juegos registrados para ${pokemon.name}.`
  }

  return `${pokemon.name}: ${pokemon.description} Es de tipo ${pokemon.type.map(typeLabel).join(' / ')}. También puedo contarte si es legendario o mítico, stats, juegos, debilidades, resistencias y contra qué tipos es efectivo.`
}
