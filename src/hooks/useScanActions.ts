import { useCallback } from 'react'
import type { PokemonDetail, PokemonIndexItem } from '../services/pokeApi.ts'
import type { UsePokemonFetchResult } from './usePokemonFetch.ts'

/**
 * Inputs needed by useScanActions to orchestrate the post-fetch side effects
 * (state, history, collection, narration) and the various entry points users
 * can take to load a Pokémon (image scan, text search, history, favorites, AI
 * candidates).
 */
export interface UseScanActionsParams {
  isAutoNarrate: boolean
  setResult: (value: PokemonDetail | null) => void
  rememberScan: (pokemon: PokemonDetail) => void
  updateCollection: (pokemon: PokemonDetail, kind: 'seen' | 'captured') => void
  narratePokemon: (pokemon: PokemonDetail) => void
  fetchAndDisplay: UsePokemonFetchResult['fetchAndDisplay']
  handleAnalyze: UsePokemonFetchResult['handleAnalyze']
  setImageFile: (file: File | null) => void
  clearImage: () => void
  setError: UsePokemonFetchResult['setError']
  setScanCandidates: UsePokemonFetchResult['setScanCandidates']
}

export interface UseScanActionsResult {
  /** Picks a fresh PokemonDetail and runs all post-fetch side effects in one place. */
  onFetchSuccess: (details: PokemonDetail) => void
  /** Validate, preview and analyze a file dropped from camera/gallery. */
  handleImageSelected: (file: File | null) => void
  /** Load by index entry (autocomplete result). */
  handlePokemonSelected: (pokemon: PokemonIndexItem) => Promise<void>
  /** Re-open a Pokémon from the scan history strip. */
  handleHistorySelected: (pokemon: { apiName?: string; id: number; confidenceScore?: number }) => Promise<void>
  /** Re-open a Pokémon from the favorites strip. */
  handleFavoriteSelected: (pokemon: { apiName?: string; id: number }) => Promise<void>
  /** Re-open a Pokémon from the Pokédex collection strip. */
  handleCollectionSelected: (pokemon: { apiName?: string; id: number }) => Promise<void>
  /** User picked an alternate AI candidate from the scan result. */
  handleScanCandidateSelected: (
    pokemon: { apiName?: string; id: number; confidenceScore?: number; reason?: string },
  ) => Promise<void>
  /** Reset the preview and any pending scan state. */
  handleReset: () => void
}

/**
 * Orchestrates every "load a Pokémon" entry point (image, search, history,
 * favorites, collection, AI candidate) and wires the shared post-fetch side
 * effects (persist result, append to history, mark as seen, narrate).
 *
 * Extracted from App.tsx so the orchestration logic is testable in isolation
 * and App.tsx stays close to a thin shell + render tree.
 */
export function useScanActions({
  isAutoNarrate,
  setResult,
  rememberScan,
  updateCollection,
  narratePokemon,
  fetchAndDisplay,
  handleAnalyze,
  setImageFile,
  clearImage,
  setError,
  setScanCandidates,
}: UseScanActionsParams): UseScanActionsResult {
  const onFetchSuccess = useCallback(
    (details: PokemonDetail) => {
      setResult(details)
      rememberScan(details)
      updateCollection(details, 'seen')
      if (isAutoNarrate) narratePokemon(details)
    },
    [isAutoNarrate, setResult, rememberScan, updateCollection, narratePokemon],
  )

  const handleImageSelected = useCallback(
    (file: File | null) => {
      setError('')
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setError('Ese archivo no parece una imagen. Prueba con una foto o captura.')
        return
      }
      setImageFile(file)
      void handleAnalyze(file, {
        onSuccess: onFetchSuccess,
        onNotFound: () => setResult(null),
      })
    },
    [setError, setImageFile, handleAnalyze, onFetchSuccess, setResult],
  )

  const handlePokemonSelected = useCallback(
    (pokemon: PokemonIndexItem) =>
      fetchAndDisplay(
        pokemon.id ?? pokemon.name,
        { confidenceScore: 100, scannedAt: new Date().toISOString(), scanMode: 'búsqueda por texto Gen 1-9' },
        'No encontré ese Pokémon. 🤔 Prueba con el nombre en inglés o el número de Pokédex.',
        { onSuccess: onFetchSuccess },
      ),
    [fetchAndDisplay, onFetchSuccess],
  )

  const handleHistorySelected = useCallback(
    (pokemon: { apiName?: string; id: number; confidenceScore?: number }) =>
      fetchAndDisplay(
        pokemon.apiName ?? pokemon.id,
        { confidenceScore: pokemon.confidenceScore ?? 100, scannedAt: new Date().toISOString(), scanMode: 'historial familiar' },
        'No pude abrir ese escaneo. 📋 Búscalo por nombre.',
        { onSuccess: onFetchSuccess },
      ),
    [fetchAndDisplay, onFetchSuccess],
  )

  const handleFavoriteSelected = useCallback(
    (pokemon: { apiName?: string; id: number }) =>
      fetchAndDisplay(
        pokemon.apiName ?? pokemon.id,
        { confidenceScore: 100, scannedAt: new Date().toISOString(), scanMode: 'favorito familiar' },
        'No pude abrir ese favorito. ⭐ Búscalo por nombre.',
        { onSuccess: onFetchSuccess },
      ),
    [fetchAndDisplay, onFetchSuccess],
  )

  const handleScanCandidateSelected = useCallback(
    (pokemon: { apiName?: string; id: number; confidenceScore?: number; reason?: string }) =>
      fetchAndDisplay(
        pokemon.apiName ?? pokemon.id,
        {
          confidenceScore: pokemon.confidenceScore ?? 100,
          scannedAt: new Date().toISOString(),
          scanMode: 'corrección del usuario',
          visualReason: pokemon.reason,
        },
        'No pude abrir ese Pokémon. Búscalo por nombre.',
        { onSuccess: onFetchSuccess, keepCandidates: true },
      ),
    [fetchAndDisplay, onFetchSuccess],
  )

  const handleReset = useCallback(() => {
    clearImage()
    setError('')
    setScanCandidates([])
  }, [clearImage, setError, setScanCandidates])

  return {
    onFetchSuccess,
    handleImageSelected,
    handlePokemonSelected,
    handleHistorySelected,
    handleFavoriteSelected,
    handleCollectionSelected: handleFavoriteSelected,
    handleScanCandidateSelected,
    handleReset,
  }
}
