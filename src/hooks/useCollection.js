/**
 * useCollection — manages scan history, favorites and Pokédex collection state.
 *
 * All three lists live in localStorage via useLocalStorage.
 * Pure data operations (no fetch, no audio, no narration).
 */
import { useLocalStorage } from './useLocalStorage.js'

export function useCollection({ historyKey, favoritesKey, collectionKey }) {
  const [scanHistory, setScanHistory] = useLocalStorage(historyKey, [])
  const [favorites, setFavorites] = useLocalStorage(favoritesKey, [])
  const [collection, setCollection] = useLocalStorage(collectionKey, [])

  // ── Internal helpers ──────────────────────────────────────────────────────

  function historyEntry(pokemon) {
    return {
      id: pokemon.id,
      speciesId: pokemon.speciesId,
      apiName: pokemon.apiName,
      name: pokemon.name,
      displayNumber: pokemon.displayNumber,
      sprite: pokemon.sprite,
      type: pokemon.type?.[0] ?? '',
      confidenceScore: pokemon.confidenceScore,
      scannedAt: pokemon.scannedAt ?? new Date().toISOString(),
      scanMode: pokemon.scanMode,
    }
  }

  function collectionEntryFromPokemon(pokemon, existing = {}) {
    return {
      ...existing,
      id: pokemon.id,
      speciesId: pokemon.speciesId,
      apiName: pokemon.apiName,
      name: pokemon.name,
      displayNumber: pokemon.displayNumber,
      sprite: pokemon.sprite,
      type: pokemon.type?.[0] ?? existing.type ?? '',
    }
  }

  function favoriteEntry(pokemon) {
    return {
      id: pokemon.id,
      speciesId: pokemon.speciesId,
      apiName: pokemon.apiName,
      name: pokemon.name,
      displayNumber: pokemon.displayNumber,
      sprite: pokemon.sprite,
      type: pokemon.type?.[0] ?? '',
      formLabel: pokemon.formLabel,
      savedAt: new Date().toISOString(),
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function rememberScan(pokemon) {
    if (!pokemon?.id) return
    setScanHistory((current) => {
      const safe = Array.isArray(current) ? current : []
      const entry = historyEntry(pokemon)
      return [entry, ...safe.filter((item) => item.id !== entry.id)].slice(0, 8)
    })
  }

  function updateCollection(pokemon, action = 'seen') {
    if (!pokemon?.id) return
    setCollection((current) => {
      const safe = Array.isArray(current) ? current : []
      const existing = safe.find((item) => item.apiName === pokemon.apiName || item.id === pokemon.id) ?? {}
      const entry = collectionEntryFromPokemon(pokemon, existing)

      if (action === 'captured') {
        entry.seenAt = entry.seenAt ?? new Date().toISOString()
        entry.capturedAt = existing.capturedAt ? '' : new Date().toISOString()
      } else {
        entry.seenAt = entry.seenAt ?? new Date().toISOString()
      }

      return [entry, ...safe.filter((item) => item.apiName !== entry.apiName && item.id !== entry.id)].slice(0, 60)
    })
  }

  /**
   * Toggle a Pokémon in/out of favorites.
   * @param {object} result - the currently displayed Pokémon
   */
  function toggleFavorite(result) {
    if (!result?.id) return
    setFavorites((current) => {
      const safe = Array.isArray(current) ? current : []
      const exists = safe.some((p) => p.apiName === result.apiName || p.id === result.id)
      if (exists) return safe.filter((p) => p.apiName !== result.apiName && p.id !== result.id)
      return [favoriteEntry(result), ...safe].slice(0, 18)
    })
  }

  return {
    scanHistory,
    favorites,
    collection,
    rememberScan,
    updateCollection,
    toggleFavorite,
  }
}
