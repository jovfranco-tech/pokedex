import { AnimatePresence, motion } from 'framer-motion'
import { Bot, CircleDot, Download, Sparkles, Volume2, X } from 'lucide-react'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { CollectionStrip } from './components/CollectionStrip.jsx'
import { DeviceShell } from './components/DeviceShell.jsx'
import { FavoritesStrip } from './components/FavoritesStrip.jsx'
import { ImageScanner } from './components/ImageScanner.jsx'
import { PokemonCompare } from './components/PokemonCompare.jsx'
import { PokemonSearch } from './components/PokemonSearch.jsx'
import { ResultCard } from './components/ResultCard.jsx'
import { ScanCandidateStrip } from './components/ScanCandidateStrip.jsx'
import { ScanHistoryStrip } from './components/ScanHistoryStrip.jsx'
import pokemonCatalog from './data/pokemonFullCatalog.json'
import { useImagePreview } from './hooks/useImagePreview.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { usePwaInstall } from './hooks/usePwaInstall.js'
import {
  DEFAULT_POKEMON_SPECIES_COUNT,
  POKEMON_DETAIL_SCHEMA_VERSION,
  fetchPokemonDetails,
  loadPokemonIndex,
} from './services/pokeApi.js'
import { identifyPokemonFromImage } from './services/visionSimulator.js'
import { playPokemonCry } from './utils/playPokemonCry.js'
import { buildPokedexAnnouncement, speakPokedexLine } from './utils/pokedexVoice.js'

const PokemonAssistant = lazy(() => import('./components/PokemonAssistant.jsx').then((module) => ({ default: module.PokemonAssistant })))

const LAST_RESULT_KEY = 'pokedex-visual-gen1:last-result'
const SCAN_HISTORY_KEY = 'pokedex-visual-gen1:scan-history'
const FAVORITES_KEY = 'pokedex-visual-gen1:favorites'
const KIDS_MODE_KEY = 'pokedex-visual-gen1:kids-mode'
const COLLECTION_KEY = 'pokedex-visual-gen1:collection'

function App() {
  const { imageFile, previewUrl, setImageFile, clearImage } = useImagePreview()
  const [result, setResult] = useLocalStorage(LAST_RESULT_KEY, null)
  const [scanHistory, setScanHistory] = useLocalStorage(SCAN_HISTORY_KEY, [])
  const [favorites, setFavorites] = useLocalStorage(FAVORITES_KEY, [])
  const [collection, setCollection] = useLocalStorage(COLLECTION_KEY, [])
  const [isKidsMode, setIsKidsMode] = useLocalStorage(KIDS_MODE_KEY, false)
  const [error, setError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [scanCandidates, setScanCandidates] = useState([])
  const [pokemonIndex, setPokemonIndex] = useState([])
  const [isIndexLoading, setIsIndexLoading] = useState(true)
  const pokemonTotal = pokemonIndex.length || DEFAULT_POKEMON_SPECIES_COUNT
  const lastAutoCryKey = useRef('')
  const lastAutoSpeechKey = useRef('')
  const { canInstall, isInstalled, promptInstall } = usePwaInstall()
  const isCurrentFavorite = Boolean(
    result && Array.isArray(favorites) && favorites.some((pokemon) => pokemon.apiName === result.apiName || pokemon.id === result.id),
  )
  const collectionEntry = result && Array.isArray(collection)
    ? collection.find((pokemon) => pokemon.apiName === result.apiName || pokemon.id === result.id)
    : null

  async function narratePokemon(pokemon) {
    const announcement = buildPokedexAnnouncement(pokemon)
    if (!announcement) return
    await speakPokedexLine(announcement, { rate: 0.82, pitch: 0.08, volume: 1, withBeep: true })
  }

  const lastScanLabel = result?.scannedAt
    ? new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(result.scannedAt))
    : 'Listo para escanear'

  useEffect(() => {
    let isActive = true

    loadPokemonIndex()
      .then((index) => {
        if (isActive) setPokemonIndex(index)
      })
      .finally(() => {
        if (isActive) setIsIndexLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (
      !result?.id ||
      (
        result.stats?.length &&
        result.matchups &&
        Array.isArray(result.gameAppearances) &&
        'animatedSprite' in result &&
        'baseExperience' in result &&
        result.dataVersion === POKEMON_DETAIL_SCHEMA_VERSION
      )
    ) return

    let isActive = true
    fetchPokemonDetails(result.apiName ?? result.id, {
      confidenceScore: result.confidenceScore ?? 100,
      scannedAt: result.scannedAt,
      scanMode: result.scanMode ?? 'datos actualizados PokéAPI',
    })
      .then((details) => {
        if (isActive) setResult(details)
      })
      .catch(() => {})

    return () => {
      isActive = false
    }
  }, [result, setResult])

  useEffect(() => {
    if (!result?.cryUrl || isScanning) return

    const cryKey = `${result.id}-${result.scannedAt ?? result.cryUrl}`
    if (lastAutoCryKey.current === cryKey) return
    lastAutoCryKey.current = cryKey

    const timeoutId = window.setTimeout(() => {
      playPokemonCry(result.cryUrl, 0.42)
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [isScanning, result?.cryUrl, result?.id, result?.scannedAt])

  useEffect(() => {
    if (!result?.id || isScanning) return

    const speechKey = `${result.id}-${result.scannedAt ?? 'scan'}`
    if (lastAutoSpeechKey.current === speechKey) return
    lastAutoSpeechKey.current = speechKey

    const timeoutId = window.setTimeout(() => {
      narratePokemon(result)
    }, 760)

    return () => window.clearTimeout(timeoutId)
  }, [isScanning, result])

  function handleImageSelected(file) {
    setError('')

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Ese archivo no parece una imagen. Prueba con una foto o captura.')
      return
    }

    setImageFile(file)
    handleAnalyze(file)
  }

  function rememberScan(pokemon) {
    if (!pokemon?.id) return

    const entry = {
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

    setScanHistory((currentHistory) => {
      const safeHistory = Array.isArray(currentHistory) ? currentHistory : []
      return [entry, ...safeHistory.filter((item) => item.id !== entry.id)].slice(0, 8)
    })
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

  function updateCollection(pokemon, action = 'seen') {
    if (!pokemon?.id) return

    setCollection((currentCollection) => {
      const safeCollection = Array.isArray(currentCollection) ? currentCollection : []
      const existing = safeCollection.find((item) => item.apiName === pokemon.apiName || item.id === pokemon.id) ?? {}
      const entry = collectionEntryFromPokemon(pokemon, existing)

      if (action === 'captured') {
        entry.seenAt = entry.seenAt ?? new Date().toISOString()
        entry.capturedAt = existing.capturedAt ? '' : new Date().toISOString()
      } else {
        entry.seenAt = entry.seenAt ?? new Date().toISOString()
      }

      return [entry, ...safeCollection.filter((item) => item.apiName !== entry.apiName && item.id !== entry.id)].slice(0, 60)
    })
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

  function handleToggleFavorite() {
    if (!result?.id) return

    setFavorites((currentFavorites) => {
      const safeFavorites = Array.isArray(currentFavorites) ? currentFavorites : []
      const exists = safeFavorites.some((pokemon) => pokemon.apiName === result.apiName || pokemon.id === result.id)

      if (exists) {
        return safeFavorites.filter((pokemon) => pokemon.apiName !== result.apiName && pokemon.id !== result.id)
      }

      return [favoriteEntry(result), ...safeFavorites].slice(0, 18)
    })
  }

  async function handleAnalyze(fileOverride = imageFile) {
    if (!fileOverride) {
      setError('Elige una imagen o toma una foto para empezar.')
      return
    }

    setError('')
    setIsScanning(true)

    try {
      const detectedPokemon = await identifyPokemonFromImage(fileOverride, pokemonIndex)

      if (!detectedPokemon) {
        setError('No pude reconocerlo con seguridad. Escribe el nombre en el buscador para elegirlo manualmente.')
        setResult(null)
        setScanCandidates([])
        return
      }

      setScanCandidates(detectedPokemon.scanCandidates ?? [])
      setResult(detectedPokemon)
      rememberScan(detectedPokemon)
      updateCollection(detectedPokemon, 'seen')
    } catch (scanError) {
      setError(scanError?.message || 'No pude terminar el escaneo. Intenta con otra imagen o usa la búsqueda por texto.')
    } finally {
      setIsScanning(false)
    }
  }

  async function handlePokemonSelected(pokemon) {
    setError('')
    setScanCandidates([])
    setIsScanning(true)

    try {
      const details = await fetchPokemonDetails(pokemon.id ?? pokemon.name, {
        confidenceScore: 100,
        scannedAt: new Date().toISOString(),
        scanMode: 'búsqueda por texto Gen 1-9',
      })
      setResult(details)
      rememberScan(details)
      updateCollection(details, 'seen')
    } catch {
      setError('No pude cargar ese Pokémon desde PokéAPI. Prueba con otro nombre.')
    } finally {
      setIsScanning(false)
    }
  }

  async function handleHistorySelected(pokemon) {
    setError('')
    setScanCandidates([])
    setIsScanning(true)

    try {
      const details = await fetchPokemonDetails(pokemon.apiName ?? pokemon.id, {
        confidenceScore: pokemon.confidenceScore ?? 100,
        scannedAt: new Date().toISOString(),
        scanMode: 'historial familiar',
      })
      setResult(details)
      rememberScan(details)
      updateCollection(details, 'seen')
    } catch {
      setError('No pude reabrir ese escaneo. Prueba buscándolo por nombre.')
    } finally {
      setIsScanning(false)
    }
  }

  async function handleFavoriteSelected(pokemon) {
    setError('')
    setScanCandidates([])
    setIsScanning(true)

    try {
      const details = await fetchPokemonDetails(pokemon.apiName ?? pokemon.id, {
        confidenceScore: 100,
        scannedAt: new Date().toISOString(),
        scanMode: 'favorito familiar',
      })
      setResult(details)
      rememberScan(details)
      updateCollection(details, 'seen')
    } catch {
      setError('No pude abrir ese favorito. Prueba buscándolo por nombre.')
    } finally {
      setIsScanning(false)
    }
  }

  async function handleScanCandidateSelected(pokemon) {
    setError('')
    setIsScanning(true)

    try {
      const details = await fetchPokemonDetails(pokemon.apiName ?? pokemon.id, {
        confidenceScore: pokemon.confidenceScore ?? 100,
        scannedAt: new Date().toISOString(),
        scanMode: 'corrección del usuario',
        visualReason: pokemon.reason,
      })
      setResult(details)
      rememberScan(details)
      updateCollection(details, 'seen')
    } catch {
      setError('No pude abrir ese candidato. Prueba buscándolo por nombre.')
    } finally {
      setIsScanning(false)
    }
  }

  function handleCollectionSelected(pokemon) {
    handleFavoriteSelected(pokemon)
  }

  function handleReset() {
    clearImage()
    setError('')
    setScanCandidates([])
  }

  return (
    <main className={`pokedex-stage min-h-svh px-2 py-2 text-dex-ink sm:px-5 sm:py-4 ${isKidsMode ? 'kids-mode' : ''}`}>
      <DeviceShell>
        <section className="pokedex-console-card">
          <header className="console-title-row">
            <div className="flex min-w-0 items-center gap-3">
              <div className="pokedex-logo-mark" aria-hidden="true" />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black uppercase tracking-[0.05em] text-white">Pokédex IA</h1>
              </div>
            </div>
            <div className="console-count-pill">{pokemonTotal} Pokémon</div>
          </header>

          <div className="console-quick-actions" aria-label="Controles rápidos">
            {canInstall && !isInstalled && (
              <button type="button" className="console-mini-button" onClick={promptInstall}>
                <Download className="size-4" />
                Instalar
              </button>
            )}
            <button
              type="button"
              className={`console-mini-button ${isKidsMode ? 'console-mini-button-active' : ''}`}
              onClick={() => setIsKidsMode((value) => !value)}
            >
              <Sparkles className="size-4" />
              Niños
            </button>
          </div>

          <div className="console-status-bar">
            <span className={`console-led console-led-red ${isScanning ? 'console-led-active' : ''}`} />
            <span className={`console-led console-led-yellow ${isScanning ? 'console-led-active' : ''}`} />
            <span className={`console-led console-led-green ${isScanning ? 'console-led-active' : ''}`} />
            <span className="ml-auto flex items-center gap-2">
              <CircleDot className="size-3 fill-white/70 text-white/70" />
              {isScanning ? 'Analizando...' : result ? 'Identificado' : lastScanLabel}
            </span>
          </div>

          <div className="console-stack">
            <PokemonSearch
              index={pokemonIndex.length ? pokemonIndex : pokemonCatalog}
              isLoading={isIndexLoading}
              onSelect={handlePokemonSelected}
              variant="console"
            />

            <ImageScanner
              error={error}
              imageFile={imageFile}
              isScanning={isScanning}
              onImageSelected={handleImageSelected}
              onReset={handleReset}
              previewUrl={previewUrl}
            />

            <ScanCandidateStrip candidates={scanCandidates} onSelect={handleScanCandidateSelected} />

            {result && (
              <div className="console-scanned-strip">
                <p className="console-label">Escaneado</p>
                <div className="console-scanned-card">
                  <img src={result.sprite} alt="" className="size-9 object-contain" />
                  <span>{result.name}</span>
                </div>
              </div>
            )}

            {scanHistory.length > 0 && (
              <details className="console-drawer console-drawer-soft">
                <summary>
                  <Sparkles className="size-4" />
                  Recientes
                </summary>
                <ScanHistoryStrip history={scanHistory} onSelect={handleHistorySelected} />
              </details>
            )}

            <button type="button" className="console-ai-button" onClick={() => setIsAssistantOpen(true)}>
              <Bot className="size-5" />
              Pokédex IA
            </button>

          </div>
        </section>

        <AnimatePresence mode="wait">
          <ResultCard
            collectionEntry={collectionEntry}
            key={result?.apiName ?? result?.id ?? (isScanning ? 'scanning' : 'empty')}
            isFavorite={isCurrentFavorite}
            isKidsMode={isKidsMode}
            isScanning={isScanning}
            onMarkCaptured={(pokemon) => updateCollection(pokemon, 'captured')}
            onMarkSeen={(pokemon) => updateCollection(pokemon, 'seen')}
            onSpeakPokedex={narratePokemon}
            onToggleFavorite={handleToggleFavorite}
            pokemonTotal={pokemonTotal}
            result={result}
          />
        </AnimatePresence>

        {(favorites.length > 0 || collection.length > 0 || result) && (
          <section className="utility-dock" aria-label="Herramientas de colección">
            <details className="below-options-drawer">
              <summary>
                <Sparkles className="size-5" />
                Colección
              </summary>
              <CollectionStrip collection={collection} onSelect={handleCollectionSelected} />
            </details>

            <details className="below-options-drawer">
              <summary>
                <Sparkles className="size-5" />
                Comparar
              </summary>
              <PokemonCompare
                key={result?.apiName ?? result?.id ?? 'compare-empty'}
                index={pokemonIndex.length ? pokemonIndex : pokemonCatalog}
                initialPokemon={result}
              />
            </details>

            {favorites.length > 0 && (
              <details className="below-options-drawer">
              <summary>
                <Sparkles className="size-5" />
                Favoritos
              </summary>
              <FavoritesStrip favorites={favorites} onSelect={handleFavoriteSelected} />
              </details>
            )}
          </section>
        )}

        <AnimatePresence>
          {isAssistantOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="assistant-modal-backdrop" 
              role="presentation"
            >
              <motion.section 
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: 'spring', bounce: 0.25 }}
                className="assistant-modal" 
                role="dialog" 
                aria-modal="true" 
                aria-label="Pokédex IA"
              >
                <header className="assistant-modal-header">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/18">
                      <Bot className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-black text-white">Pokédex IA</h2>
                      <p className="truncate text-sm font-bold text-white/75">
                        {result ? `Pregunta sobre ${result.name}` : 'Pregunta sobre un Pokémon'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="assistant-modal-close"
                    aria-label="Leer saludo de Pokédex IA"
                    onClick={() => {
                      speakPokedexLine(
                        result ? `Hola. Soy tu Pokédex IA. Pregúntame sobre ${result.name}.` : 'Hola. Soy tu Pokédex IA.',
                        { rate: 0.88, pitch: 0.08, withBeep: true },
                      )
                    }}
                  >
                    <Volume2 className="size-5" />
                  </button>
                  <button
                    type="button"
                    className="assistant-modal-close"
                    aria-label="Cerrar Pokédex IA"
                    onClick={() => setIsAssistantOpen(false)}
                  >
                    <X className="size-5" />
                  </button>
                </header>
                <Suspense fallback={<div className="assistant-loading">Cargando asistente...</div>}>
                  <PokemonAssistant pokemon={result} />
                </Suspense>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </DeviceShell>
    </main>
  )
}

export default App
