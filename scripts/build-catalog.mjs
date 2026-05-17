import fs from 'fs'

const API_BASE = 'https://pokeapi.co/api/v2'

const generationRanges = [
  [1, 151, 1], [152, 251, 2], [252, 386, 3], [387, 493, 4],
  [494, 649, 5], [650, 721, 6], [722, 809, 7], [810, 905, 8],
  [906, 1025, 9],
]

function getGenerationFromId(id) {
  return generationRanges.find(([start, end]) => id >= start && id <= end)?.[2] ?? 9
}

function formatPokemonName(name = '') {
  return name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
    .replace('Mr Mime', 'Mr. Mime').replace('Mime Jr', 'Mime Jr.')
    .replace('Ho Oh', 'Ho-Oh').replace('Porygon Z', 'Porygon-Z')
}

const artworkUrl = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
function idFromResourceUrl(url) { return Number(url.match(/\/(\d+)\/?$/)?.[1]) }

export function normalizePokemonText(value = '') {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/♀/g, ' f ').replace(/♂/g, ' m ').replace(/[^a-z0-9]+/g, ' ').trim()
}

async function build() {
  console.log('Fetching species...')
  const speciesRes = await fetch(`${API_BASE}/pokemon-species?limit=1025`)
  const speciesData = await speciesRes.json()
  
  const items = speciesData.results.map((entry) => {
    const id = idFromResourceUrl(entry.url)
    const displayName = formatPokemonName(entry.name)
    const normalizedName = normalizePokemonText(entry.name)
    const normalizedDisplayName = normalizePokemonText(displayName)
    return {
      id,
      name: entry.name,
      apiName: entry.name,
      displayName,
      displayNumber: `#${String(id).padStart(3, '0')}`,
      generation: getGenerationFromId(id),
      isMega: false,
      isPrimal: false,
      sprite: artworkUrl(id),
      aliases: [],
      searchText: [normalizedName, normalizedDisplayName].join(' ')
    }
  })
  
  console.log('Fetching forms...')
  const formsRes = await fetch(`${API_BASE}/pokemon?limit=1302`)
  const formsData = await formsRes.json()
  const megaItems = formsData.results
    .filter((entry) => entry.name.includes('-mega') || entry.name.includes('-primal'))
    .map((entry) => {
      const id = idFromResourceUrl(entry.url)
      const isMega = entry.name.includes('-mega')
      const isPrimal = entry.name.includes('-primal')
      
      const parts = entry.name.split('-')
      let displayName = formatPokemonName(entry.name)
      if (isMega) {
         const megaIndex = parts.indexOf('mega')
         const baseName = formatPokemonName(parts.slice(0, megaIndex).join('-'))
         const suffix = parts.slice(megaIndex + 1).map((part) => part.toUpperCase()).join(' ')
         displayName = "Mega " + baseName + (suffix ? " " + suffix : "")
      } else if (isPrimal) {
         const primalIndex = parts.indexOf('primal')
         displayName = `Primal ${formatPokemonName(parts.slice(0, primalIndex).join('-'))}`
      }

      const normalizedName = normalizePokemonText(entry.name)
      const normalizedDisplayName = normalizePokemonText(displayName)
      const aliases = [
          displayName.replace(/^Mega /, ''),
          displayName.replace(/^Mega /, '').replace(/ ([A-Z])$/, ' mega $1'),
          displayName.replace(/^Primal /, ''),
      ]

      return {
        id,
        name: entry.name,
        apiName: entry.name,
        displayName,
        displayNumber: 'MEGA',
        generation: 'Mega',
        isMega,
        isPrimal,
        sprite: artworkUrl(id),
        aliases,
        searchText: [normalizedName, normalizedDisplayName, ...aliases.map(normalizePokemonText)].join(' ')
      }
    })

  const fullCatalog = [...items, ...megaItems]
  fs.writeFileSync('src/data/pokemonFullCatalog.json', JSON.stringify(fullCatalog, null, 2))
  console.log('Catalog built! Total:', fullCatalog.length)
}

build()
