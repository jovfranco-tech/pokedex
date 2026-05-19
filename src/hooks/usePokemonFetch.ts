/**
 * usePokemonFetch — encapsulates all "fetch a Pokémon and show it" logic.
 *
 * Handles: loading state, error state, scan candidates, cry playback,
 * AudioContext unlock, and image-based vision scanning.
 *
 * Usage:
 *   const { error, isScanning, scanCandidates, fetchAndDisplay, handleAnalyze } =
 *     usePokemonFetch({ pokemonIndex })
 */
import { useState } from 'react'
import {
  type FetchPokemonOptions,
  type PokemonDetail,
  type PokemonIndexItem,
  fetchPokemonDetails,
} from '../services/pokeApi.js'
import { type ScanCandidate, identifyPokemonFromImage } from '../services/visionSimulator.js'
import { playPokemonCry, unlockAudio } from '../utils/playPokemonCry.js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FetchAndDisplayOptions {
  onSuccess?: (details: PokemonDetail) => void
  keepCandidates?: boolean
}

interface HandleAnalyzeOptions {
  onSuccess?: (result: PokemonDetail & { scanCandidates?: ScanCandidate[] }) => void
  onNotFound?: () => void
}

export interface UsePokemonFetchResult {
  error: string
  setError: React.Dispatch<React.SetStateAction<string>>
  isScanning: boolean
  scanCandidates: ScanCandidate[]
  setScanCandidates: React.Dispatch<React.SetStateAction<ScanCandidate[]>>
  fetchAndDisplay: (
    id: string | number,
    meta: FetchPokemonOptions,
    errorMsg: string,
    options?: FetchAndDisplayOptions,
  ) => Promise<void>
  handleAnalyze: (file: File | null, options?: HandleAnalyzeOptions) => Promise<void>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePokemonFetch({
  pokemonIndex,
}: {
  pokemonIndex: PokemonIndexItem[]
}): UsePokemonFetchResult {
  const [error, setError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanCandidates, setScanCandidates] = useState<ScanCandidate[]>([])

  /**
   * Fetch a Pokémon by name/id and display it.
   */
  async function fetchAndDisplay(
    id: string | number,
    meta: FetchPokemonOptions,
    errorMsg: string,
    options: FetchAndDisplayOptions = {},
  ): Promise<void> {
    const { onSuccess, keepCandidates = false } = options

    unlockAudio() // unlock AudioContext synchronously while gesture is still active
    setError('')
    if (!keepCandidates) setScanCandidates([])
    setIsScanning(true)

    try {
      const details = await fetchPokemonDetails(id, meta)
      onSuccess?.(details)
      // Play cry after onSuccess — AudioContext was unlocked before the first await
      if (details.cryUrl) playPokemonCry(details.cryUrl, 0.42)
    } catch {
      setError(errorMsg)
    } finally {
      setIsScanning(false)
    }
  }

  /**
   * Identify a Pokémon from an image file and display it.
   */
  async function handleAnalyze(
    file: File | null,
    options: HandleAnalyzeOptions = {},
  ): Promise<void> {
    if (!file) {
      setError('Elige una imagen o toma una foto para empezar.')
      return
    }

    const { onSuccess, onNotFound } = options

    unlockAudio()
    setError('')
    setIsScanning(true)

    try {
      const detected = await identifyPokemonFromImage(file, pokemonIndex)

      if (!detected) {
        setError('No pude reconocerlo. 🔍 Prueba con otra foto o búscalo por nombre en el buscador.')
        setScanCandidates([])
        onNotFound?.()
        return
      }

      setScanCandidates(detected.scanCandidates ?? [])
      onSuccess?.(detected)
      if (detected.cryUrl) playPokemonCry(detected.cryUrl, 0.42)
    } catch (scanError) {
      const msg = scanError instanceof Error ? scanError.message : '¡Ups! Algo salió mal. 😅 Prueba con otra foto o usa el buscador.'
      setError(msg)
    } finally {
      setIsScanning(false)
    }
  }

  return {
    error,
    setError,
    isScanning,
    scanCandidates,
    setScanCandidates,
    fetchAndDisplay,
    handleAnalyze,
  }
}
