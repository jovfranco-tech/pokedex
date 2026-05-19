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
import { fetchPokemonDetails } from '../services/pokeApi.js'
import { identifyPokemonFromImage } from '../services/visionSimulator.js'
import { playPokemonCry, unlockAudio } from '../utils/playPokemonCry.js'

export function usePokemonFetch({ pokemonIndex }) {
  const [error, setError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanCandidates, setScanCandidates] = useState([])

  /**
   * Fetch a Pokémon by name/id and display it.
   *
   * @param {string|number} id          - Name or numeric id
   * @param {object}        meta        - Scan metadata (scanMode, confidenceScore, …)
   * @param {string}        errorMsg    - User-facing message shown on failure
   * @param {object}        [options]
   * @param {function}      [options.onSuccess]      - Called with the details on success
   * @param {boolean}       [options.keepCandidates] - Keep the candidates strip visible
   */
  async function fetchAndDisplay(id, meta, errorMsg, options = {}) {
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
   *
   * @param {File}     file       - Image file from the scanner
   * @param {object}   [options]
   * @param {function} [options.onSuccess]  - Called with details on success
   * @param {function} [options.onNotFound] - Called when image yields no match
   */
  async function handleAnalyze(file, options = {}) {
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
      setError(scanError?.message || '¡Ups! Algo salió mal. 😅 Prueba con otra foto o usa el buscador.')
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
