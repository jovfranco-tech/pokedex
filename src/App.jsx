import { AnimatePresence, LazyMotion, m, useReducedMotion } from 'framer-motion'

const loadMotionFeatures = () => import('framer-motion').then((mod) => mod.domAnimation)
import { Bot, CircleDot, Download, Gamepad2, Mic, Sparkles, Volume2, X } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { CollectionStrip } from './components/CollectionStrip.jsx'
import { DeviceShell } from './components/DeviceShell.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { FavoritesStrip } from './components/FavoritesStrip.jsx'
import { ImageScanner } from './components/ImageScanner.jsx'
import { PokemonCompare } from './components/PokemonCompare.jsx'
import { PokemonQuiz } from './components/PokemonQuiz.jsx'
import { PokemonSearch } from './components/PokemonSearch.jsx'
import { ResultCard } from './components/ResultCard.jsx'
import { ScanCandidateStrip } from './components/ScanCandidateStrip.jsx'
import { ScanHistoryStrip } from './components/ScanHistoryStrip.jsx'
import { useAchievements } from './hooks/useAchievements.js'
import { useCollection } from './hooks/useCollection.js'
import { useFocusTrap } from './hooks/useFocusTrap.js'
import { useImagePreview } from './hooks/useImagePreview.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { usePokemonFetch } from './hooks/usePokemonFetch.js'
import { usePwaInstall } from './hooks/usePwaInstall.js'
import {
  DEFAULT_POKEMON_SPECIES_COUNT,
  POKEMON_DETAIL_SCHEMA_VERSION,
  fetchPokemonDetails,
  loadPokemonIndex,
} from './services/pokeApi.js'
import { buildPokedexAnnouncement, speakPokedexLine } from './utils/pokedexVoice.js'

const PokemonAssistant = lazy(() => import('./components/PokemonAssistant.jsx').then((module) => ({ default: module.PokemonAssistant })))

const LAST_RESULT_KEY = 'pokedex-visual-gen1:last-result'
const SCAN_HISTORY_KEY = 'pokedex-visual-gen1:scan-history'
const FAVORITES_KEY = 'pokedex-visual-gen1:favorites'
const KIDS_MODE_KEY = 'pokedex-visual-gen1:kids-mode'
const COLLECTION_KEY = 'pokedex-visual-gen1:collection'
const AUTO_NARRATE_KEY = 'pokedex-visual-gen1:auto-narrate'
const SCAN_FEEDBACK_KEY = 'pokedex-visual-gen1:scan-feedback'

function App() {
  const { imageFile, previewUrl, setImageFile, clearImage } = useImagePreview()
  const [result, setResult] = useLocalStorage(LAST_RESULT_KEY, null)
  const [isKidsMode, setIsKidsMode] = useLocalStorage(KIDS_MODE_KEY, false)
  const [isAutoNarrate, setIsAutoNarrate] = useLocalStorage(AUTO_NARRATE_KEY, true)
  const [scanFeedback, setScanFeedback] = useLocalStorage(SCAN_FEEDBACK_KEY, {})
  const [isSpeaking, setIsSpeaking] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [isQuizOpen, setIsQuizOpen] = useState(false)
  const quizTrapRef = useFocusTrap(isQuizOpen)
  const assistantTrapRef = useFocusTrap(isAssistantOpen)
  const [pokemonIndex, setPokemonIndex] = useState([])
  const [isIndexLoading, setIsIndexLoading] = useState(true)
  const pokemonTotal = pokemonIndex.length || DEFAULT_POKEMON_SPECIES_COUNT
  const { canInstall, isInstalled, promptInstall } = usePwaInstall()

  // ── Collection (history, favorites, Pokédex) ───────────────────────────────
  const {
    scanHistory,
    favorites,
    collection,
    rememberScan,
    updateCollection,
    toggleFavorite,
  } = useCollection({
    historyKey: SCAN_HISTORY_KEY,
    favoritesKey: FAVORITES_KEY,
    collectionKey: COLLECTION_KEY,
  })

  // ── Fetch state ────────────────────────────────────────────────────────────
  const {
    error,
    setError,
    isScanning,
    scanCandidates,
    setScanCandidates,
    fetchAndDisplay,
    handleAnalyze: runAnalyze,
  } = usePokemonFetch({ pokemonIndex })

  // ── Derived ────────────────────────────────────────────────────────────────
  const achievements = useAchievements({ collection, favorites })

  const isCurrentFavorite = Boolean(
    result && Array.isArray(favorites) && favorites.some((p) => p.apiName === result.apiName || p.id === result.id),
  )
  const collectionEntry = result && Array.isArray(collection)
    ? collection.find((p) => p.apiName === result.apiName || p.id === result.id)
    : null

  const lastScanLabel = result?.scannedAt
    ? new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(result.scannedAt))
    : 'Listo para escanear'

  // ── Narration ──────────────────────────────────────────────────────────────
  const narratePokemon = useCallback((pokemon) => {
    const announcement = buildPokedexAnnouncement(pokemon)
    if (!announcement) return
    setIsSpeaking(true)
    // Not awaited: speak() must fire synchronously from the gesture call stack (iOS Safari).
    speakPokedexLine(announcement, {
      rate: 1.0, pitch: 0.1, volume: 1, withBeep: true,
      onEnd: () => setIsSpeaking(false),
    })
  }, [])

  // ── Effects ────────────────────────────────────────────────────────────────

  // Load Pokémon index on mount
  useEffect(() => {
    let isActive = true
    loadPokemonIndex()
      .then((index) => { if (isActive) setPokemonIndex(index) })
      .finally(() => { if (isActive) setIsIndexLoading(false) })
    return () => { isActive = false }
  }, [])

  // Re-fetch stale results that are missing schema fields
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
      .then((details) => { if (isActive) setResult(details) })
      .catch(() => {})
    return () => { isActive = false }
  }, [result, setResult])

  // ── Handlers ───────────────────────────────────────────────────────────────

  /**
   * Common onSuccess callback for all fetch actions.
   * Narration fires here — in the same call stack as the user gesture that
   * triggered the fetch — so no reactive effect or setTimeout hack needed.
   */
  function onFetchSuccess(details) {
    setResult(details)
    rememberScan(details)
    updateCollection(details, 'seen')
    if (isAutoNarrate) narratePokemon(details)
  }

  function handleImageSelected(file) {
    setError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Ese archivo no parece una imagen. Prueba con una foto o captura.')
      return
    }
    setImageFile(file)
    runAnalyze(file, {
      onSuccess: onFetchSuccess,
      onNotFound: () => setResult(null),
    })
  }

  function handlePokemonSelected(pokemon) {
    return fetchAndDisplay(
      pokemon.id ?? pokemon.name,
      { confidenceScore: 100, scannedAt: new Date().toISOString(), scanMode: 'búsqueda por texto Gen 1-9' },
      'No encontré ese Pokémon. 🤔 Prueba con el nombre en inglés o el número de Pokédex.',
      { onSuccess: onFetchSuccess },
    )
  }

  function handleHistorySelected(pokemon) {
    return fetchAndDisplay(
      pokemon.apiName ?? pokemon.id,
      { confidenceScore: pokemon.confidenceScore ?? 100, scannedAt: new Date().toISOString(), scanMode: 'historial familiar' },
      'No pude abrir ese escaneo. 📋 Búscalo por nombre.',
      { onSuccess: onFetchSuccess },
    )
  }

  function handleFavoriteSelected(pokemon) {
    return fetchAndDisplay(
      pokemon.apiName ?? pokemon.id,
      { confidenceScore: 100, scannedAt: new Date().toISOString(), scanMode: 'favorito familiar' },
      'No pude abrir ese favorito. ⭐ Búscalo por nombre.',
      { onSuccess: onFetchSuccess },
    )
  }

  function handleScanCandidateSelected(pokemon) {
    return fetchAndDisplay(
      pokemon.apiName ?? pokemon.id,
      {
        confidenceScore: pokemon.confidenceScore ?? 100,
        scannedAt: new Date().toISOString(),
        scanMode: 'corrección del usuario',
        visualReason: pokemon.reason,
      },
      'No pude abrir ese Pokémon. Búscalo por nombre.',
      { onSuccess: onFetchSuccess, keepCandidates: true },
    )
  }

  const handleCollectionSelected = handleFavoriteSelected

  function handleReset() {
    clearImage()
    setError('')
    setScanCandidates([])
  }

  function handleScanFeedback(vote) {
    if (!result?.id) return
    setScanFeedback((prev) => ({ ...prev, [result.id]: vote }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <LazyMotion features={loadMotionFeatures}>
    <a href="#main-result" className="skip-to-content">Saltar al resultado</a>
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
              <button type="button" className="console-mini-button" aria-label="Instalar aplicación" onClick={promptInstall}>
                <Download className="size-4" aria-hidden="true" />
                Instalar
              </button>
            )}
            <button
              type="button"
              className={`console-mini-button ${isAutoNarrate ? 'console-mini-button-active' : ''}`}
              onClick={() => setIsAutoNarrate((value) => !value)}
              aria-label={isAutoNarrate ? 'Desactivar narración automática' : 'Activar narración automática'}
            >
              <Mic className="size-4" />
              Auto
            </button>
            <button
              type="button"
              className={`console-mini-button ${isKidsMode ? 'console-mini-button-active' : ''}`}
              aria-label={isKidsMode ? 'Desactivar modo niños' : 'Activar modo niños'}
              aria-pressed={isKidsMode}
              onClick={() => setIsKidsMode((value) => !value)}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Niños
            </button>
          </div>

          <div className="console-status-bar" role="status" aria-live="polite" aria-atomic="true">
            <span className={`console-led console-led-red ${isScanning ? 'console-led-active' : ''}`} aria-hidden="true" />
            <span className={`console-led console-led-yellow ${isScanning ? 'console-led-active' : ''}`} aria-hidden="true" />
            <span className={`console-led console-led-green ${isScanning ? 'console-led-active' : ''}`} aria-hidden="true" />
            <span className="ml-auto flex items-center gap-2">
              <CircleDot className="size-3 fill-white/70 text-white/70" aria-hidden="true" />
              {isScanning ? 'Analizando...' : result ? 'Identificado' : lastScanLabel}
            </span>
          </div>

          <div className="console-stack">
            <ErrorBoundary message="El buscador tuvo un problema. Recarga la página.">
              <PokemonSearch
                index={pokemonIndex}
                isLoading={isIndexLoading}
                onSelect={handlePokemonSelected}
                variant="console"
              />
            </ErrorBoundary>

            <ErrorBoundary message="El escáner tuvo un problema. Recarga la página.">
              <ImageScanner
                error={error}
                imageFile={imageFile}
                isScanning={isScanning}
                onImageSelected={handleImageSelected}
                onReset={handleReset}
                previewUrl={previewUrl}
              />
            </ErrorBoundary>

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

            <div className="flex gap-2">
              <button type="button" className="console-ai-button flex-1" onClick={() => setIsAssistantOpen(true)}>
                <Bot className="size-5" />
                Pokédex IA
              </button>
              <button type="button" className="console-ai-button flex-1" onClick={() => setIsQuizOpen(true)}>
                <Gamepad2 className="size-5" />
                Quiz
              </button>
            </div>

          </div>
        </section>

        {/* Column 2: skip-link target + result card — wrapped so both share one grid cell */}
        <div style={{ minWidth: 0 }}>
          <div id="main-result" tabIndex={-1} style={{ outline: 'none' }} />
          <AnimatePresence mode="wait">
            <ErrorBoundary message="No se pudo mostrar el Pokémon. Prueba buscando otro.">
              <ResultCard
                collectionEntry={collectionEntry}
                feedback={result?.id ? scanFeedback[result.id] : null}
                key={result?.apiName ?? result?.id ?? (isScanning ? 'scanning' : 'empty')}
                isFavorite={isCurrentFavorite}
                isKidsMode={isKidsMode}
                isSpeaking={isSpeaking}
                isScanning={isScanning}
                onFeedback={handleScanFeedback}
                onMarkCaptured={(pokemon) => updateCollection(pokemon, 'captured')}
                onMarkSeen={(pokemon) => updateCollection(pokemon, 'seen')}
                onSpeakPokedex={narratePokemon}
                onToggleFavorite={() => toggleFavorite(result)}
                pokemonTotal={pokemonTotal}
                result={result}
              />
            </ErrorBoundary>
          </AnimatePresence>
        </div>

        {achievements.some((a) => a.unlocked) && (
          <section className="achievements-strip" aria-label="Logros">
            {achievements.filter((a) => a.unlocked).map((a) => (
              <div key={a.id} className="achievement-chip" title={a.desc}>
                <span>{a.emoji}</span>
                <span>{a.label}</span>
              </div>
            ))}
          </section>
        )}

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
              <ErrorBoundary message="El comparador tuvo un problema.">
                <PokemonCompare
                  key={result?.apiName ?? result?.id ?? 'compare-empty'}
                  index={pokemonIndex}
                  initialPokemon={result}
                />
              </ErrorBoundary>
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
          {isQuizOpen && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="assistant-modal-backdrop"
              role="presentation"
            >
              <m.section
                ref={quizTrapRef}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.9 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
                transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', bounce: 0.25 }}
                className="assistant-modal quiz-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Quiz Pokémon"
                onTrapEscape={() => setIsQuizOpen(false)}
                onKeyDown={(e) => e.key === 'Escape' && setIsQuizOpen(false)}
              >
                <ErrorBoundary message="El quiz tuvo un problema. Prueba cerrándolo y volviéndolo a abrir.">
                  <PokemonQuiz
                    index={pokemonIndex.length ? pokemonIndex : []}
                    onClose={() => setIsQuizOpen(false)}
                  />
                </ErrorBoundary>
              </m.section>
            </m.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAssistantOpen && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="assistant-modal-backdrop"
              role="presentation"
            >
              <m.section
                ref={assistantTrapRef}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.9 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
                transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', bounce: 0.25 }}
                className="assistant-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Pokédex IA"
                onKeyDown={(e) => e.key === 'Escape' && setIsAssistantOpen(false)}
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
                        { rate: 1.0, pitch: 0.1, withBeep: true },
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
                  <ErrorBoundary message="El asistente tuvo un problema. Prueba recargando.">
                    <PokemonAssistant pokemon={result} />
                  </ErrorBoundary>
                </Suspense>
              </m.section>
            </m.div>
          )}
        </AnimatePresence>
      </DeviceShell>
    </main>
    </LazyMotion>
  )
}

export default App
