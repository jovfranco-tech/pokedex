import pokemonCatalog from '../data/pokemonFullCatalog.json'
import { getTypeMeta, typeMeta } from '../data/typeColors.js'
import { fetchPokemonDetails, normalizePokemonText, searchPokemonIndex } from './pokeApi.js'

const API_BASE = 'https://pokeapi.co/api/v2'
const LIST_INTENTS = ['lista', 'listar', 'listame', 'cuales', 'todos', 'muestra', 'muestrame', 'dime']

const typeAliases = {
  acero: 'Steel',
  agua: 'Water',
  bicho: 'Bug',
  dragon: 'Dragon',
  electrico: 'Electric',
  fantasma: 'Ghost',
  fuego: 'Fire',
  hada: 'Fairy',
  hielo: 'Ice',
  lucha: 'Fighting',
  normal: 'Normal',
  planta: 'Grass',
  psiquico: 'Psychic',
  roca: 'Rock',
  siniestro: 'Dark',
  tierra: 'Ground',
  veneno: 'Poison',
  volador: 'Flying',
}

Object.keys(typeMeta).forEach((type) => {
  typeAliases[normalizePokemonText(type)] = type
  typeAliases[normalizePokemonText(typeMeta[type].label)] = type
})

const stoneEvolutionSummary = [
  'Piedra Trueno: Pikachu, Eevee, Eelektrik, Charjabug, Tadbulb',
  'Piedra Fuego: Vulpix, Growlithe, Eevee, Pansear, Capsakid',
  'Piedra Agua: Poliwhirl, Shellder, Staryu, Eevee, Lombre, Panpour',
  'Piedra Hoja: Gloom, Weepinbell, Exeggcute, Eevee, Nuzleaf, Pansage',
  'Piedra Lunar: Nidorina, Nidorino, Clefairy, Jigglypuff, Skitty, Munna',
  'Piedra Solar: Gloom, Sunkern, Cottonee, Petilil, Helioptile',
  'Piedra Noche: Murkrow, Misdreavus, Lampent, Doublade',
  'Piedra Día: Togetic, Roselia, Minccino, Floette',
  'Piedra Alba: Kirlia macho, Snorunt hembra',
  'Piedra Hielo: Alolan Sandshrew, Alolan Vulpix, Eevee, Galarian Darumaka, Crabrawler, Cetoddle',
]

function hasListIntent(text) {
  return LIST_INTENTS.some((intent) => text.includes(intent)) || text.includes('que pokemon') || text.includes('pokemon son')
}

function detectType(text) {
  return Object.entries(typeAliases).find(([alias]) => new RegExp(`\\b${alias}\\b`).test(text))?.[1] ?? null
}

function detectGeneration(text) {
  const match = text.match(/\b(?:gen|generacion)\s*(\d|i{1,3}|iv|v|vi|vii|viii|ix)\b/)
  if (!match) return null

  const value = match[1]
  const roman = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 }
  const generation = Number(value) || roman[value]
  return generation >= 1 && generation <= 9 ? generation : null
}

function formatPokemonList(items, limit = 30) {
  const names = items.slice(0, limit).map((pokemon) => pokemon.displayName ?? pokemon.name)
  const suffix = items.length > limit ? ` y ${items.length - limit} más` : ''
  return `${names.join(', ')}${suffix}`
}

async function answerTypeListQuestion(type) {
  const response = await fetch(`${API_BASE}/type/${type.toLowerCase()}`)
  if (!response.ok) return null

  const byName = new Map(pokemonCatalog.map((pokemon) => [pokemon.apiName ?? pokemon.name, pokemon]))
  const data = await response.json()
  const seen = new Set()
  const matches = data.pokemon
    .map((entry) => byName.get(entry.pokemon.name))
    .filter((pokemon) => pokemon && Number.isInteger(pokemon.generation) && !seen.has(pokemon.id) && seen.add(pokemon.id))
    .sort((a, b) => a.id - b.id)

  const label = getTypeMeta(type).label
  return `Encontré ${matches.length} Pokémon de tipo ${label} en la Pokédex principal. Algunos son: ${formatPokemonList(matches)}.`
}

function answerGenerationListQuestion(generation) {
  const matches = pokemonCatalog
    .filter((pokemon) => pokemon.generation === generation)
    .sort((a, b) => a.id - b.id)

  return `La Gen ${generation} tiene ${matches.length} Pokémon en la Pokédex principal. Algunos son: ${formatPokemonList(matches)}.`
}

function answerStoneEvolutionQuestion() {
  return `Estos son Pokémon conocidos que evolucionan con piedras: ${stoneEvolutionSummary.join('. ')}. Algunas formas regionales cambian la piedra o el método según el juego.`
}

function findPokemonMentions(text, limit = 2) {
  const normalizedText = normalizePokemonText(text)
  const matches = []
  const seen = new Set()
  const candidates = pokemonCatalog
    .filter((pokemon) => Number.isInteger(pokemon.generation))
    .map((pokemon) => ({
      pokemon,
      terms: [
        normalizePokemonText(pokemon.name),
        normalizePokemonText(pokemon.displayName),
        ...(pokemon.aliases ?? []).map(normalizePokemonText),
      ].filter(Boolean),
    }))
    .sort((a, b) => Math.max(...b.terms.map((term) => term.length)) - Math.max(...a.terms.map((term) => term.length)))

  for (const candidate of candidates) {
    if (seen.has(candidate.pokemon.apiName)) continue
    if (!candidate.terms.some((term) => new RegExp(`\\b${term}\\b`).test(normalizedText))) continue

    matches.push(candidate.pokemon)
    seen.add(candidate.pokemon.apiName)
    if (matches.length >= limit) break
  }

  return matches
}

function findPokemonFromTextPart(part) {
  return searchPokemonIndex(pokemonCatalog, part, 1)[0] ?? null
}

function findPokemonPair(question, selectedPokemon) {
  const normalizedQuestion = normalizePokemonText(question)
  const parts = normalizedQuestion
    .replace(/\bcompara(?:r)?\b/g, '')
    .split(/\s+(?:vs|versus|contra|con|y)\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)

  const fromParts = parts.map(findPokemonFromTextPart).filter(Boolean)
  const pair = []
  const seen = new Set()

  if (selectedPokemon && normalizedQuestion.includes('con')) {
    pair.push(selectedPokemon)
    seen.add(selectedPokemon.apiName ?? selectedPokemon.name)
  }

  for (const pokemon of fromParts.length >= 2 ? fromParts : findPokemonMentions(question, 2)) {
    const key = pokemon.apiName ?? pokemon.name
    if (seen.has(key)) continue
    pair.push(pokemon)
    seen.add(key)
    if (pair.length >= 2) break
  }

  return pair.length >= 2 ? pair.slice(0, 2) : []
}

function statTotal(pokemon) {
  return pokemon.stats?.reduce((total, stat) => total + stat.value, 0) ?? 0
}

function topStat(pokemon) {
  return pokemon.stats?.slice().sort((a, b) => b.value - a.value)[0]
}

async function answerComparisonQuestion(question, selectedPokemon) {
  const pair = findPokemonPair(question, selectedPokemon)
  if (pair.length < 2) return null

  const [first, second] = await Promise.all(pair.map((pokemon) => fetchPokemonDetails(pokemon.apiName ?? pokemon.name)))
  const firstTop = topStat(first)
  const secondTop = topStat(second)

  return `${first.name} es tipo ${first.type.map((type) => getTypeMeta(type).label).join(' / ')} y suma ${statTotal(first)} stats base; su punto fuerte es ${firstTop?.name ?? 'stats'} (${firstTop?.value ?? '-'}). ${second.name} es tipo ${second.type.map((type) => getTypeMeta(type).label).join(' / ')} y suma ${statTotal(second)} stats base; destaca en ${secondTop?.name ?? 'stats'} (${secondTop?.value ?? '-'}). En números puros gana ${statTotal(first) >= statTotal(second) ? first.name : second.name}, pero por tipos y rol puede convenir uno u otro.`
}

async function answerCounterQuestion(question, selectedPokemon) {
  const text = normalizePokemonText(question)
  if (!text.includes('contra') && !text.includes('vencer') && !text.includes('ganar')) return null
  if (!text.includes('fuerte') && !text.includes('debil') && !text.includes('recomienda') && !text.includes('mejor')) return null

  const mentioned = findPokemonMentions(question, 1)[0]
  const target = mentioned ? await fetchPokemonDetails(mentioned.apiName ?? mentioned.name) : selectedPokemon
  if (!target?.matchups?.vulnerabilities?.length) return null

  const vulnerabilities = target.matchups.vulnerabilities
    .slice(0, 4)
    .map((entry) => `${getTypeMeta(entry.type).label} x${entry.multiplier}`)
    .join(', ')

  return `Para enfrentar a ${target.name}, prioriza ataques de tipo ${vulnerabilities}. También conviene mirar sus stats y habilidades antes de elegir equipo.`
}

export async function tryAnswerStructuredPokemonQuestion(question, selectedPokemon) {
  const text = normalizePokemonText(question)

  if ((text.includes('compara') || text.includes(' vs ') || text.includes(' versus ')) && findPokemonPair(question, selectedPokemon).length >= 2) {
    return answerComparisonQuestion(question, selectedPokemon)
  }

  const counterAnswer = await answerCounterQuestion(question, selectedPokemon)
  if (counterAnswer) return counterAnswer

  if (text.includes('piedra') && text.includes('evol')) {
    return answerStoneEvolutionQuestion()
  }

  const generation = detectGeneration(text)
  if (generation && hasListIntent(text)) {
    return answerGenerationListQuestion(generation)
  }

  const type = detectType(text)
  if (type && hasListIntent(text)) {
    return answerTypeListQuestion(type)
  }

  return null
}
