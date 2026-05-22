import { AnimatePresence, LazyMotion, m, useReducedMotion } from 'framer-motion'

const loadMotionFeatures = () => import('framer-motion').then((mod) => mod.domAnimation)
import { Bot, CircleDot, Download, Gamepad2, Mic, Sparkles, Volume2, X } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { CollectionStrip } from './components/CollectionStrip.js'
import { DeviceShell } from './components/DeviceShell.js'
import { ErrorBoundary } from './components/ErrorBoundary.js'
import { FavoritesStrip } from './components/FavoritesStrip.js'
import { ImageScanner } from './components/ImageScanner.js'
import { PokemonCatalog } from './components/PokemonCatalog.js'
import { PokemonCompare } from './components/PokemonCompare.js'
import { PokemonQuiz } from './components/PokemonQuiz.js'
import { PokemonSearch } from './components/PokemonSearch.js'
import { ResultCard } from './components/ResultCard.js'
import { ScanCandidateStrip } from './components/ScanCandidateStrip.js'
import { ScanHistoryStrip } from './components/ScanHistoryStrip.js'
import { useAchievements } from './hooks/useAchievements.js'
import { useCollection } from './hooks/useCollection.js'
import { useFocusTrap } from './hooks/useFocusTrap.js'
import { useImagePreview } from './hooks/useImagePreview.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { usePokemonFetch } from './hooks/usePokemonFetch.js'
import { usePwaInstall } from './hooks/usePwaInstall.js'
import { useScanActions } from './hooks/useScanActions.js'
import {
  DEFAULT_POKEMON_SPECIES_COUNT,
  POKEMON_DETAIL_SCHEMA_VERSION,
  fetchPokemonDetails,
  loadPokemonIndex,
} from './services/pokeApi.js'
import { buildPokedexAnnouncement, speakPokedexLine } from './utils/pokedexVoice.js'
import { applySwUpdate, onSwUpdate } from './utils/registerServiceWorker.js'
import type { PokemonDetail, PokemonIndexItem } from './services/pokeApi.js'

const PokemonAssistant = lazy(() => import('./components/PokemonAssistant.js').then((module) => ({ default: module.PokemonAssistant })))

const LAST_RESULT_KEY = 'pokedex-visual-gen1:last-result'
const SCAN_HISTORY_KEY = 'pokedex-visual-gen1:scan-history'
const FAVORITES_KEY = 'pokedex-visual-gen1:favorites'
const KIDS_MODE_KEY = 'pokedex-visual-gen1:kids-mode'
const COLLECTION_KEY = 'pokedex-visual-gen1:collection'
const AUTO_NARRATE_KEY = 'pokedex-visual-gen1:auto-narrate'
const SCAN_FEEDBACK_KEY = 'pokedex-visual-gen1:scan-feedback'

function App() {
  // Capture the deep-link pokemon name synchronously at mount (before any effect fires).
  // deepLinkResolvedRef starts false when a deep-link URL is present and becomes true
  // once the fetch completes (success OR failure), releasing the URL-sync guard.
  const deepLinkNameRef = useRef<string | null>(
    (() => {
      const m = window.location.pathname.match(/^\/pokemon\/([^/]+)$/)
      return m ? decodeURIComponent(m[1]) : null
    })(),
  )
  const deepLinkResolvedRef = useRef(deepLinkNameRef.current === null)

  const { imageFile, previewUrl, setImageFile, clearImage } = useImagePreview()
  const [result, setResult] = useLocalStorage<PokemonDetail | null>(LAST_RESULT_KEY, null)
  const [isKidsMode, setIsKidsMode] = useLocalStorage<boolean>(KIDS_MODE_KEY, false)
  const [isAutoNarrate, setIsAutoNarrate] = useLocalStorage<boolean>(AUTO_NARRATE_KEY, false)
  const [scanFeedback, setScanFeedback] = useLocalStorage<Record<number, string>>(SCAN_FEEDBACK_KEY, {})
  const [isSpeaking, setIsSpeaking] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [isQuizOpen, setIsQuizOpen] = useState(false)
  const quizTrapRef = useFocusTrap(isQuizOpen)
  const assistantTrapRef = useFocusTrap(isAssistantOpen)
  const [pokemonIndex, setPokemonIndex] = useState<PokemonIndexItem[]>([])
  const [isIndexLoading, setIsIndexLoading] = useState(true)
  const pokemonTotal = pokemonIndex.length || DEFAULT_POKEMON_SPECIES_COUNT
  const { canInstall, isInstalled, promptInstall } = usePwaInstall()
  const [swUpdateReady, setSwUpdateReady] = useState(false)

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
  const narratePokemon = useCallback((pokemon: PokemonDetail) => {
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

  // Subscribe to SW update notifications
  useEffect(() => onSwUpdate(() => setSwUpdateReady(true)), [])

  // Load Pokémon index on mount; then handle deep-link URL (/pokemon/:name)
  useEffect(() => {
    let isActive = true
    loadPokemonIndex()
      .then((index) => {
        if (!isActive) return
        setPokemonIndex(index)
        // Honour shareable deep-link captured synchronously at mount time
        const apiName = deepLinkNameRef.current
        if (apiName) {
          fetchPokemonDetails(apiName, { confidenceScore: 100, scanMode: 'enlace directo' })
            .then((details) => {
              if (isActive) {
                setResult(details)
                deepLinkResolvedRef.current = true  // release URL-sync guard (success)
              }
            })
            .catch(() => {
              deepLinkResolvedRef.current = true    // release URL-sync guard (failure)
            })
        }
      })
      .finally(() => { if (isActive) setIsIndexLoading(false) })
    return () => { isActive = false }
  }, [setResult])

  // Keep URL in sync with current result (shareable deep-links).
  // Guard: while the deep-link fetch is still in flight, do not push the cached
  // result's URL over the incoming path. The guard is released once the fetch
  // resolves (success or failure) via deepLinkResolvedRef.
  useEffect(() => {
    if (!deepLinkResolvedRef.current) return
    const newPath = result?.apiName ? `/pokemon/${result.apiName}` : '/'
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath)
    }
  }, [result?.apiName])

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
    fetchPokemonDetails(result.apiName ?? String(result.id), {
      confidenceScore: result.confidenceScore ?? 100,
      scannedAt: result.scannedAt,
      scanMode: result.scanMode ?? 'datos actualizados PokéAPI',
    })
      .then((details) => { if (isActive) setResult(details) })
      .catch(() => {})
    return () => { isActive = false }
  }, [result, setResult])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const {
    handleImageSelected,
    handlePokemonSelected,
    handleHistorySelected,
    handleFavoriteSelected,
    handleCollectionSelected,
    handleScanCandidateSelected,
    handleReset,
  } = useScanActions({
    isAutoNarrate,
    setResult,
    rememberScan,
    updateCollection,
    narratePokemon,
    fetchAndDisplay,
    handleAnalyze: runAnalyze,
    setImageFile,
    clearImage,
    setError,
    setScanCandidates,
  })

  function handleScanFeedback(vote: 'correct' | 'wrong' | null) {
    if (!result?.id || !vote) return
    setScanFeedback((prev) => ({ ...prev, [result.id]: vote }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <LazyMotion features={loadMotionFeatures}>
    <a href="#main-result" className="skip-to-content">Saltar al resultado</a>
    {swUpdateReady && (
      <div className="sw-update-banner" role="alert">
        <span>🆕 Nueva versión disponible</span>
        <button
          type="button"
          className="sw-update-reload"
          onClick={() => { applySwUpdate(); window.location.reload() }}
        >
          Recargar
        </button>
        <button
          type="button"
          className="sw-update-dismiss"
          aria-label="Descartar"
          onClick={() => setSwUpdateReady(false)}
        >
          <X className="size-3" />
        </button>
      </div>
    )}
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
        <div style={{ minWidth: 0 }} className="result-column">
          <div id="main-result" tabIndex={-1} style={{ outline: 'none' }} />
          <AnimatePresence mode="wait">
            <ErrorBoundary message="No se pudo mostrar el Pokémon. Prueba buscando otro.">
              <ResultCard
                collectionEntry={collectionEntry}
                feedback={result?.id ? (scanFeedback[result.id] as 'correct' | 'wrong' | null ?? null) : null}
                key={result?.apiName ?? result?.id ?? (isScanning ? 'scanning' : 'empty')}
                isFavorite={isCurrentFavorite}
                isKidsMode={isKidsMode}
                isSpeaking={isSpeaking}
                isScanning={isScanning}
                onFeedback={handleScanFeedback}
                onMarkCaptured={(pokemon) => updateCollection(pokemon, 'captured')}
                onMarkSeen={(pokemon) => updateCollection(pokemon, 'seen')}
                onSpeakPokedex={narratePokemon}
                onToggleFavorite={() => { if (result) toggleFavorite(result) }}
                pokemonTotal={pokemonTotal}
                result={result}
              />
            </ErrorBoundary>
          </AnimatePresence>
          {!isScanning && (
            <ErrorBoundary message="El catálogo tuvo un problema.">
              <PokemonCatalog
                index={pokemonIndex}
                onSelect={handlePokemonSelected}
              />
            </ErrorBoundary>
          )}
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
                    <PokemonAssistant pokemon={result ?? null} />
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
