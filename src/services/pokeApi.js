import { pokemonAliases } from '../data/pokemonAliases.js'
import { getPokemonCategoryFlags } from '../data/pokemonCategories.js'
import { buildTypeMatchups } from '../data/typeChart.js'
import { normalizePokemonText, searchPokemonIndex } from '../utils/pokemonSearch.js'

export { normalizePokemonText, searchPokemonIndex }

export const DEFAULT_POKEMON_SPECIES_COUNT = 1025
export const MAX_POKEMON_ID = DEFAULT_POKEMON_SPECIES_COUNT
export const POKEMON_DETAIL_SCHEMA_VERSION = 'spanish-localized-stage-v6'

const API_BASE = 'https://pokeapi.co/api/v2'
const INDEX_CACHE_KEY = 'pokedex-visual-latest-species:index:v2-mega'
const INDEX_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7
const DETAIL_CACHE_PREFIX = 'pokedex-detail-v1:'
const DETAIL_CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours
const DETAIL_CACHE_MAX = 25

let indexPromise
const detailsCache = new Map()
const resourceNameCache = new Map()

function readCachedDetail(key) {
  try {
    const raw = localStorage.getItem(DETAIL_CACHE_PREFIX + key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (!cached?.savedAt || Date.now() - cached.savedAt > DETAIL_CACHE_TTL_MS) return null
    if (cached.dataVersion !== POKEMON_DETAIL_SCHEMA_VERSION) return null
    return cached.detail
  } catch { return null }
}

function writeCachedDetail(key, detail) {
  try {
    const allKeys = Object.keys(localStorage).filter((k) => k.startsWith(DETAIL_CACHE_PREFIX))
    if (allKeys.length >= DETAIL_CACHE_MAX) {
      const oldest = allKeys
        .map((k) => {
          try { return { k, t: JSON.parse(localStorage.getItem(k))?.savedAt ?? 0 } } catch { return { k, t: 0 } }
        })
        .sort((a, b) => a.t - b.t)[0]
      if (oldest) localStorage.removeItem(oldest.k)
    }
    localStorage.setItem(
      DETAIL_CACHE_PREFIX + key,
      JSON.stringify({ savedAt: Date.now(), dataVersion: POKEMON_DETAIL_SCHEMA_VERSION, detail }),
    )
  } catch {
    // localStorage is optional; storage quota or private mode should not break the app
  }
}

const generationRanges = [
  [1, 151, 1],
  [152, 251, 2],
  [252, 386, 3],
  [387, 493, 4],
  [494, 649, 5],
  [650, 721, 6],
  [722, 809, 7],
  [810, 905, 8],
  [906, 1025, 9],
]

const typeTranslations = {
  bug: 'Bug',
  dark: 'Dark',
  dragon: 'Dragon',
  electric: 'Electric',
  fairy: 'Fairy',
  fighting: 'Fighting',
  fire: 'Fire',
  flying: 'Flying',
  ghost: 'Ghost',
  grass: 'Grass',
  ground: 'Ground',
  ice: 'Ice',
  normal: 'Normal',
  poison: 'Poison',
  psychic: 'Psychic',
  rock: 'Rock',
  steel: 'Steel',
  water: 'Water',
}

const statTranslations = {
  attack: 'Ataque',
  defense: 'Defensa',
  hp: 'PS',
  'special-attack': 'At. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidad',
}

const generationNameNumbers = {
  'generation-i': 1,
  'generation-ii': 2,
  'generation-iii': 3,
  'generation-iv': 4,
  'generation-v': 5,
  'generation-vi': 6,
  'generation-vii': 7,
  'generation-viii': 8,
  'generation-ix': 9,
}

const versionTranslations = {
  'alpha-sapphire': 'Alpha Sapphire',
  black: 'Black',
  'black-2': 'Black 2',
  blue: 'Blue',
  crystal: 'Crystal',
  diamond: 'Diamond',
  emerald: 'Emerald',
  firered: 'FireRed',
  gold: 'Gold',
  heartgold: 'HeartGold',
  leafgreen: 'LeafGreen',
  'legends-arceus': 'Legends Arceus',
  moon: 'Moon',
  'omega-ruby': 'Omega Ruby',
  pearl: 'Pearl',
  platinum: 'Platinum',
  red: 'Red',
  ruby: 'Ruby',
  sapphire: 'Sapphire',
  shield: 'Shield',
  silver: 'Silver',
  soulsilver: 'SoulSilver',
  scarlet: 'Scarlet',
  sun: 'Sun',
  sword: 'Sword',
  'ultra-moon': 'Ultra Moon',
  'ultra-sun': 'Ultra Sun',
  white: 'White',
  'white-2': 'White 2',
  violet: 'Violet',
  yellow: 'Yellow',
  x: 'X',
  y: 'Y',
}

const moveTranslations = {
  absorb: 'Absorber',
  acid: 'Ácido',
  agility: 'Agilidad',
  amnesia: 'Amnesia',
  'aurora-beam': 'Rayo Aurora',
  barrage: 'Presa',
  barrier: 'Barrera',
  bite: 'Mordisco',
  blizzard: 'Ventisca',
  'body-slam': 'Golpe Cuerpo',
  bonemerang: 'Huesomerang',
  bubble: 'Burbuja',
  'bubble-beam': 'Rayo Burbuja',
  clamp: 'Tenaza',
  'comet-punch': 'Puño Cometa',
  confusion: 'Confusión',
  constrict: 'Restricción',
  counter: 'Contraataque',
  cut: 'Corte',
  'defense-curl': 'Rizo Defensa',
  dig: 'Excavar',
  disable: 'Anulación',
  'double-kick': 'Doble Patada',
  'double-slap': 'Doble Bofetón',
  'double-team': 'Doble Equipo',
  'dragon-rage': 'Furia Dragón',
  'dream-eater': 'Come Sueños',
  'drill-peck': 'Pico Taladro',
  earthquake: 'Terremoto',
  ember: 'Ascuas',
  explosion: 'Explosión',
  'fire-blast': 'Llamarada',
  'fire-punch': 'Puño Fuego',
  fissure: 'Fisura',
  flamethrower: 'Lanzallamas',
  flash: 'Destello',
  fly: 'Vuelo',
  'focus-energy': 'Foco Energía',
  'fury-attack': 'Ataque Furia',
  'fury-swipes': 'Golpes Furia',
  glare: 'Deslumbrar',
  growl: 'Gruñido',
  growth: 'Desarrollo',
  guillotine: 'Guillotina',
  gust: 'Tornado',
  harden: 'Fortaleza',
  haze: 'Niebla',
  headbutt: 'Golpe Cabeza',
  'high-jump-kick': 'Patada Salto Alta',
  'horn-attack': 'Cornada',
  'horn-drill': 'Perforador',
  'hydro-pump': 'Hidrobomba',
  'hyper-beam': 'Hiperrayo',
  'hyper-fang': 'Hipercolmillo',
  hypnosis: 'Hipnosis',
  'ice-beam': 'Rayo Hielo',
  'ice-punch': 'Puño Hielo',
  'karate-chop': 'Golpe Karate',
  kinesis: 'Kinético',
  'leech-life': 'Chupavidas',
  'leech-seed': 'Drenadoras',
  leer: 'Malicioso',
  lick: 'Lengüetazo',
  'light-screen': 'Pantalla Luz',
  'lovely-kiss': 'Beso Amoroso',
  'low-kick': 'Patada Baja',
  meditate: 'Meditación',
  'mega-drain': 'Megaagotar',
  'mega-kick': 'Mega Patada',
  'mega-punch': 'Mega Puño',
  metronome: 'Metrónomo',
  mimic: 'Mimético',
  minimize: 'Reducción',
  'mirror-move': 'Mov. Espejo',
  mist: 'Neblina',
  'night-shade': 'Tinieblas',
  'pay-day': 'Día de Pago',
  peck: 'Picotazo',
  'poison-gas': 'Gas Venenoso',
  'poison-powder': 'Polvo Veneno',
  'poison-sting': 'Picotazo Veneno',
  pound: 'Destructor',
  psybeam: 'Psicorrayo',
  psychic: 'Psíquico',
  psywave: 'Psicoonda',
  'quick-attack': 'Ataque Rápido',
  rage: 'Furia',
  'razor-leaf': 'Hoja Afilada',
  'razor-wind': 'Viento Cortante',
  recover: 'Recuperación',
  reflect: 'Reflejo',
  rest: 'Descanso',
  roar: 'Rugido',
  'rock-slide': 'Avalancha',
  'rock-throw': 'Lanzarrocas',
  'rolling-kick': 'Patada Giro',
  'sand-attack': 'Ataque Arena',
  scratch: 'Arañazo',
  screech: 'Chirrido',
  'seismic-toss': 'Movimiento Sísmico',
  'self-destruct': 'Autodestrucción',
  sharpen: 'Afilar',
  sing: 'Canto',
  'skull-bash': 'Cabezazo',
  'sky-attack': 'Ataque Aéreo',
  slam: 'Portazo',
  slash: 'Cuchillada',
  'sleep-powder': 'Somnífero',
  sludge: 'Residuos',
  smog: 'Polución',
  smokescreen: 'Pantalla de Humo',
  'soft-boiled': 'Amortiguador',
  'solar-beam': 'Rayo Solar',
  'sonic-boom': 'Bomba Sónica',
  'spike-cannon': 'Clavo Cañón',
  splash: 'Salpicadura',
  spore: 'Espora',
  stomp: 'Pisotón',
  strength: 'Fuerza',
  'string-shot': 'Disparo Demora',
  struggle: 'Combate',
  'stun-spore': 'Paralizador',
  submission: 'Sumisión',
  substitute: 'Sustituto',
  surf: 'Surf',
  swift: 'Rapidez',
  'swords-dance': 'Danza Espada',
  tackle: 'Placaje',
  'tail-whip': 'Látigo',
  'take-down': 'Derribo',
  teleport: 'Teletransporte',
  thrash: 'Golpe',
  thunder: 'Trueno',
  'thunder-punch': 'Puño Trueno',
  'thunder-shock': 'Impactrueno',
  'thunder-wave': 'Onda Trueno',
  thunderbolt: 'Rayo',
  toxic: 'Tóxico',
  transform: 'Transformación',
  'tri-attack': 'Triataque',
  'vine-whip': 'Látigo Cepa',
  'vise-grip': 'Agarre',
  'water-gun': 'Pistola Agua',
  waterfall: 'Cascada',
  whirlwind: 'Remolino',
  'wing-attack': 'Ataque Ala',
  withdraw: 'Refugio',
  wrap: 'Constricción',
}

const abilityTranslations = {
  adaptability: 'Adaptable',
  anticipation: 'Anticipación',
  blaze: 'Mar Llamas',
  chlorophyll: 'Clorofila',
  'cloud-nine': 'Aclimatación',
  competitive: 'Tenacidad',
  'cute-charm': 'Gran Encanto',
  'cursed-body': 'Cuerpo Maldito',
  damp: 'Humedad',
  'early-bird': 'Madrugar',
  'flash-fire': 'Absorbe Fuego',
  forewarn: 'Alerta',
  frisk: 'Cacheo',
  immunity: 'Inmunidad',
  insomnia: 'Insomnio',
  'inner-focus': 'Foco Interno',
  'lightning-rod': 'Pararrayos',
  levitate: 'Levitación',
  'own-tempo': 'Ritmo Propio',
  overgrow: 'Espesura',
  pressure: 'Presión',
  'rain-dish': 'Cura Lluvia',
  runaway: 'Fuga',
  'shell-armor': 'Caparazón',
  'solar-power': 'Poder Solar',
  static: 'Electricidad Estática',
  'synchronize': 'Sincronía',
  'thick-fat': 'Sebo',
  torrent: 'Torrente',
  unnerve: 'Nerviosismo',
}

export function getGenerationFromId(id) {
  return generationRanges.find(([start, end]) => id >= start && id <= end)?.[2] ?? 9
}

export function formatPokemonName(name = '') {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace('Mr Mime', 'Mr. Mime')
    .replace('Mime Jr', 'Mime Jr.')
    .replace('Ho Oh', 'Ho-Oh')
    .replace('Porygon Z', 'Porygon-Z')
}

function formatSpecialFormName(name = '') {
  const parts = name.split('-')
  const megaIndex = parts.indexOf('mega')
  const primalIndex = parts.indexOf('primal')

  if (megaIndex >= 0) {
    const baseName = formatPokemonName(parts.slice(0, megaIndex).join('-'))
    const suffix = parts.slice(megaIndex + 1).map((part) => part.toUpperCase()).join(' ')
    return `Mega ${baseName}${suffix ? ` ${suffix}` : ''}`
  }

  if (primalIndex >= 0) {
    return `Primal ${formatPokemonName(parts.slice(0, primalIndex).join('-'))}`
  }

  return formatPokemonName(name)
}

function isMegaPokemonName(name = '') {
  return name.includes('-mega') || name.includes('-primal')
}

function formatSpecialFormNumber(speciesId, name = '') {
  const parts = name.split('-')
  const megaIndex = parts.indexOf('mega')

  if (megaIndex >= 0) {
    const suffix = parts.slice(megaIndex + 1).join('').toUpperCase()
    return `#${String(speciesId).padStart(3, '0')}-M${suffix}`
  }

  if (parts.includes('primal')) return `#${String(speciesId).padStart(3, '0')}-P`

  return `#${String(speciesId).padStart(3, '0')}`
}

const artworkUrl = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

function idFromResourceUrl(url) {
  return Number(url.match(/\/(\d+)\/?$/)?.[1])
}

function getAnimatedSprite(pokemon) {
  return (
    pokemon.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default ??
    pokemon.sprites.other?.showdown?.front_default ??
    pokemon.sprites.versions?.['generation-v']?.['black-white']?.front_default ??
    pokemon.sprites.front_default ??
    ''
  )
}

function formatMoveName(name = '') {
  return moveTranslations[name] ?? formatPokemonName(name)
}

function formatAbilityName(name = '') {
  return abilityTranslations[name] ?? formatPokemonName(name)
}

/** Timeout in ms for individual PokéAPI fetch calls */
const FETCH_TIMEOUT_MS = 8000

/**
 * Fetch with one automatic retry on transient 5xx errors (500, 502, 503, 504).
 * Client errors (4xx) and network failures throw immediately.
 * Each attempt has an 8-second AbortController timeout.
 */
async function apiFetch(url, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timerId = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (response.ok) return response
      const isTransient = response.status >= 500
      if (!isTransient || attempt === retries) throw new Error(`HTTP ${response.status}`)
    } catch (err) {
      if (err.name === 'AbortError') throw new Error(`Timeout fetching ${url}`, { cause: err })
      if (attempt === retries) throw err
    } finally {
      globalThis.clearTimeout(timerId)
    }
    await new Promise((r) => globalThis.setTimeout(r, 400 * (attempt + 1)))
  }
}

async function fetchLocalizedResourceName(resource, fallbackName) {
  const cacheKey = resource?.url ?? resource?.name ?? fallbackName
  if (resourceNameCache.has(cacheKey)) return resourceNameCache.get(cacheKey)

  try {
    const response = await fetch(resource.url)
    if (!response.ok) throw new Error('No se pudo traducir recurso')
    const data = await response.json()
    const translatedName =
      data.names?.find((entry) => entry.language.name === 'es')?.name ??
      data.names?.find((entry) => entry.language.name === 'en')?.name ??
      fallbackName

    resourceNameCache.set(cacheKey, translatedName)
    return translatedName
  } catch {
    resourceNameCache.set(cacheKey, fallbackName)
    return fallbackName
  }
}

function getLocalizedMoveName(resource) {
  const fallbackName = formatMoveName(resource.name)
  if (moveTranslations[resource.name]) return fallbackName
  return fetchLocalizedResourceName(resource, fallbackName)
}

function getLocalizedAbilityName(resource) {
  const fallbackName = formatAbilityName(resource.name)
  if (abilityTranslations[resource.name]) return fallbackName
  return fetchLocalizedResourceName(resource, fallbackName)
}

function withSearchFields(item) {
  const aliases = [
    ...(pokemonAliases[item.id] ?? []),
    ...(item.aliases ?? []),
  ]
  const normalizedName = normalizePokemonText(item.name)
  const normalizedDisplayName = normalizePokemonText(item.displayName)

  return {
    ...item,
    aliases,
    searchText: [normalizedName, normalizedDisplayName, ...aliases.map(normalizePokemonText)].join(' '),
  }
}

let _catalogCache = null
async function fallbackIndex() {
  if (!_catalogCache) {
    const mod = await import('../data/pokemonFullCatalog.json')
    _catalogCache = mod.default
  }
  return _catalogCache
}

function readCachedIndex(expectedSignature) {
  try {
    const cached = JSON.parse(localStorage.getItem(INDEX_CACHE_KEY))
    if (!cached?.savedAt || !Array.isArray(cached.items)) return null
    if (Date.now() - cached.savedAt > INDEX_CACHE_TTL_MS) return null
    if (expectedSignature && cached.signature !== expectedSignature) return null
    return cached.items
  } catch {
    return null
  }
}

function writeCachedIndex(items, signature) {
  try {
    localStorage.setItem(INDEX_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), signature, items }))
  } catch {
    // Cache is optional; private browsing or storage limits should not break the app.
  }
}

export async function fetchLatestPokemonSpeciesCount() {
  const response = await apiFetch(`${API_BASE}/pokemon-species?limit=1`)
  const data = await response.json()
  return Number.isInteger(data.count) && data.count > 0 ? data.count : DEFAULT_POKEMON_SPECIES_COUNT
}

async function fetchLatestPokemonCount() {
  const response = await apiFetch(`${API_BASE}/pokemon?limit=1`)
  const data = await response.json()
  return Number.isInteger(data.count) && data.count > 0 ? data.count : DEFAULT_POKEMON_SPECIES_COUNT
}

async function fetchMegaPokemonIndex() {
  const latestPokemonCount = await fetchLatestPokemonCount()
  const response = await apiFetch(`${API_BASE}/pokemon?limit=${latestPokemonCount}`)

  const data = await response.json()
  const megaItems = data.results
    .filter((entry) => isMegaPokemonName(entry.name))
    .map((entry) => {
      const id = idFromResourceUrl(entry.url)
      const displayName = formatSpecialFormName(entry.name)

      return withSearchFields({
        id,
        name: entry.name,
        apiName: entry.name,
        displayName,
        displayNumber: 'MEGA',
        generation: 'Mega',
        isMega: entry.name.includes('-mega'),
        isPrimal: entry.name.includes('-primal'),
        sprite: artworkUrl(id),
        aliases: [
          displayName.replace(/^Mega /, ''),
          displayName.replace(/^Mega /, '').replace(/ ([A-Z])$/, ' mega $1'),
          displayName.replace(/^Primal /, ''),
        ],
      })
    })

  return {
    count: latestPokemonCount,
    items: megaItems,
  }
}

export async function loadPokemonIndex() {
  if (indexPromise) return indexPromise

  indexPromise = (async () => {
    try {
      const [latestSpeciesCount, megaIndex] = await Promise.all([
        fetchLatestPokemonSpeciesCount(),
        fetchMegaPokemonIndex(),
      ])
      const cacheSignature = `${latestSpeciesCount}:${megaIndex.count}:${megaIndex.items.length}`
      const cached = readCachedIndex(cacheSignature)
      if (cached) return cached

      const response = await apiFetch(`${API_BASE}/pokemon-species?limit=${latestSpeciesCount}`)

      const data = await response.json()
      const items = data.results
        .map((entry) => {
          const id = idFromResourceUrl(entry.url)
          return {
            id,
            name: entry.name,
            apiName: entry.name,
            displayName: formatPokemonName(entry.name),
            displayNumber: `#${String(id).padStart(3, '0')}`,
            generation: getGenerationFromId(id),
            isMega: false,
            isPrimal: false,
            sprite: artworkUrl(id),
          }
        })
        .filter((entry) => Number.isInteger(entry.id) && entry.id <= latestSpeciesCount)
        .map(withSearchFields)

      const indexItems = [...items, ...megaIndex.items]
      writeCachedIndex(indexItems, cacheSignature)
      return indexItems
    } catch {
      return readCachedIndex() ?? await fallbackIndex()
    }
  })()

  return indexPromise
}

function cleanFlavorText(text = '') {
  return text.replace(/\f/g, ' ').replace(/\s+/g, ' ').trim()
}

function pickDescription(species) {
  const entries = species.flavor_text_entries ?? []
  const spanish = entries.find((entry) => entry.language.name === 'es')
  const english = entries.find((entry) => entry.language.name === 'en')
  return cleanFlavorText(spanish?.flavor_text ?? english?.flavor_text ?? 'Descripción no disponible.')
}

function formatGameName(versionName) {
  return versionTranslations[versionName] ?? formatPokemonName(versionName)
}

async function parseEvolutionChain(chain) {
  const entries = []

  async function walk(node) {
    if (!node) return
    const name = await fetchLocalizedResourceName(node.species, formatPokemonName(node.species.name))
    const id = idFromResourceUrl(node.species.url)
    entries.push({ id, name, sprite: artworkUrl(id) })
    for (const child of node.evolves_to ?? []) {
      await walk(child)
    }
  }

  await walk(chain)
  if (!entries.length) return { text: 'No evoluciona', chain: [] }
  return { text: entries.map((e) => e.name).join(' -> '), chain: entries }
}

async function fetchEvolution(species) {
  try {
    const response = await apiFetch(species.evolution_chain.url)
    const data = await response.json()
    return parseEvolutionChain(data.chain)
  } catch {
    return { text: 'Evolución no disponible', chain: [] }
  }
}

export async function fetchPokemonDetails(nameOrId, options = {}) {
  const cacheKey = String(nameOrId).toLowerCase()
  if (detailsCache.has(cacheKey) && !options.confidenceScore) {
    const memory = detailsCache.get(cacheKey)
    return options.scannedAt ? { ...memory, scannedAt: options.scannedAt } : memory
  }

  if (!options.confidenceScore) {
    const persisted = readCachedDetail(cacheKey)
    if (persisted) {
      const detail = options.scannedAt ? { ...persisted, scannedAt: options.scannedAt } : persisted
      detailsCache.set(cacheKey, persisted)
      return detail
    }
  }

  const pokemonResponse = await apiFetch(`${API_BASE}/pokemon/${cacheKey}`)
  const pokemon = await pokemonResponse.json()

  const speciesResponse = await apiFetch(pokemon.species.url)
  const species = await speciesResponse.json()

  const isMega = pokemon.name.includes('-mega')
  const isPrimal = pokemon.name.includes('-primal')
  const isSpecialForm = isMega || isPrimal
  const speciesId = idFromResourceUrl(pokemon.species.url)
  const baseDisplayName =
    species.names?.find((name) => name.language.name === 'es')?.name ?? formatPokemonName(pokemon.name)
  const displayName = isSpecialForm ? formatSpecialFormName(pokemon.name) : baseDisplayName
  const [evolutionResult, abilities, attacks] = await Promise.all([
    fetchEvolution(species),
    Promise.all(pokemon.abilities.slice(0, 3).map((entry) => getLocalizedAbilityName(entry.ability))),
    Promise.all(pokemon.moves.slice(0, 4).map((entry) => getLocalizedMoveName(entry.move))),
  ])
  const evolution = evolutionResult.text
  const evolutionChain = evolutionResult.chain
  const types = pokemon.types.map((entry) => typeTranslations[entry.type.name] ?? formatPokemonName(entry.type.name))
  const gameAppearances = pokemon.game_indices
    .map((entry) => formatGameName(entry.version.name))
    .filter((name, index, list) => list.indexOf(name) === index)

  const categoryFlags = getPokemonCategoryFlags({
    apiName: pokemon.name,
    isBaby: species.is_baby,
    isLegendary: species.is_legendary,
    isMega,
    isMythical: species.is_mythical,
    isPrimal,
    speciesId,
  })

  const detail = {
    id: pokemon.id,
    speciesId,
    name: displayName,
    apiName: pokemon.name,
    baseName: baseDisplayName,
    displayNumber: isSpecialForm
      ? formatSpecialFormNumber(speciesId, pokemon.name)
      : `#${String(speciesId).padStart(3, '0')}`,
    isMega,
    isPrimal,
    formLabel: isMega ? 'Mega Evolución' : isPrimal ? 'Forma Primigenia' : '',
    ...categoryFlags,
    type: types,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    description: isSpecialForm
      ? `${displayName} es una ${isMega ? 'megaevolución' : 'forma primigenia'} de ${baseDisplayName}. ${pickDescription(species)}`
      : pickDescription(species),
    abilities,
    attacks,
    evolution: isSpecialForm ? `${baseDisplayName} -> ${displayName}` : evolution,
    evolutionChain: isSpecialForm ? [] : evolutionChain,
    baseExperience: pokemon.base_experience,
    stats: pokemon.stats.map((entry) => ({
      key: entry.stat.name,
      name: statTranslations[entry.stat.name] ?? formatPokemonName(entry.stat.name),
      value: entry.base_stat,
    })),
    matchups: buildTypeMatchups(types),
    gameAppearances,
    confidenceScore: options.confidenceScore ?? 100,
    sprite:
      pokemon.sprites.other?.['official-artwork']?.front_default ??
      pokemon.sprites.other?.dream_world?.front_default ??
      pokemon.sprites.front_default ??
      artworkUrl(pokemon.id),
    animatedSprite: getAnimatedSprite(pokemon),
    cryUrl: pokemon.cries?.latest ?? pokemon.cries?.legacy ?? '',
    generation: isSpecialForm ? 'Mega' : generationNameNumbers[species.generation?.name] ?? getGenerationFromId(speciesId),
    scannedAt: options.scannedAt ?? new Date().toISOString(),
    scanMode: options.scanMode ?? 'búsqueda PokéAPI Gen 1-9 + Megas',
    visualReason: options.visualReason ?? '',
    dataVersion: POKEMON_DETAIL_SCHEMA_VERSION,
  }

  if (!options.confidenceScore) {
    detailsCache.set(cacheKey, detail)
    writeCachedDetail(cacheKey, detail)
  }
  return detail
}
