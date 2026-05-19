/**
 * useCollection — manages scan history, favorites and Pokédex collection state.
 *
 * All three lists live in localStorage via useLocalStorage.
 * Pure data operations (no fetch, no audio, no narration).
 */
import type { PokemonDetail } from '../services/pokeApi.js'
import { useLocalStorage } from './useLocalStorage.js'

// ── Domain types ──────────────────────────────────────────────────────────────

export interface ScanHistoryEntry {
  id: number
  speciesId: number
  apiName: string
  name: string
  displayNumber: string
  sprite: string
  type: string
  confidenceScore: number
  scannedAt: string
  scanMode: string
}

export interface CollectionEntry {
  id: number
  speciesId: number
  apiName: string
  name: string
  displayNumber: string
  sprite: string
  type: string
  seenAt?: string
  capturedAt?: string
}

export interface FavoriteEntry {
  id: number
  speciesId: number
  apiName: string
  name: string
  displayNumber: string
  sprite: string
  type: string
  formLabel: string
  savedAt: string
}

interface UseCollectionKeys {
  historyKey: string
  favoritesKey: string
  collectionKey: string
}

export interface UseCollectionResult {
  scanHistory: ScanHistoryEntry[]
  favorites: FavoriteEntry[]
  collection: CollectionEntry[]
  rememberScan: (pokemon: PokemonDetail) => void
  updateCollection: (pokemon: PokemonDetail, action?: 'seen' | 'captured') => void
  toggleFavorite: (result: PokemonDetail) => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCollection({
  historyKey,
  favoritesKey,
  collectionKey,
}: UseCollectionKeys): UseCollectionResult {
  const [scanHistory, setScanHistory] = useLocalStorage<ScanHistoryEntry[]>(historyKey, [])
  const [favorites, setFavorites] = useLocalStorage<FavoriteEntry[]>(favoritesKey, [])
  const [collection, setCollection] = useLocalStorage<CollectionEntry[]>(collectionKey, [])

  // ── Internal helpers ──────────────────────────────────────────────────────

  function historyEntry(pokemon: PokemonDetail): ScanHistoryEntry {
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

  function collectionEntryFromPokemon(
    pokemon: PokemonDetail,
    existing: Partial<CollectionEntry> = {},
  ): CollectionEntry {
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

  function favoriteEntry(pokemon: PokemonDetail): FavoriteEntry {
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

  function rememberScan(pokemon: PokemonDetail): void {
    if (!pokemon?.id) return
    setScanHistory((current) => {
      const safe = Array.isArray(current) ? current : []
      const entry = historyEntry(pokemon)
      return [entry, ...safe.filter((item) => item.id !== entry.id)].slice(0, 8)
    })
  }

  function updateCollection(pokemon: PokemonDetail, action: 'seen' | 'captured' = 'seen'): void {
    if (!pokemon?.id) return
    setCollection((current) => {
      const safe = Array.isArray(current) ? current : []
      const existing: Partial<CollectionEntry> = safe.find((item) => item.apiName === pokemon.apiName || item.id === pokemon.id) ?? {}
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

  function toggleFavorite(result: PokemonDetail): void {
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
