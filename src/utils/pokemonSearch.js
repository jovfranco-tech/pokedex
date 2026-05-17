export function normalizePokemonText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/♀/g, ' f ')
    .replace(/♂/g, ' m ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function searchPokemonIndex(index, query, limit = 12) {
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
