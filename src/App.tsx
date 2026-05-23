import { AnimatePresence, LazyMotion, m, useReducedMotion } from 'framer-motion'

const loadMotionFeatures = () => import('framer-motion').then((mod) => mod.domAnimation)
import { Bot, CircleDot, Download, Gamepad2, Gauge, Languages, Mic, Palette, Sparkles, Tv, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CollectionStrip } from './components/CollectionStrip.js'
import { DeviceShell } from './components/DeviceShell.js'
import { ErrorBoundary } from './components/ErrorBoundary.js'
import { FavoritesStrip } from './components/FavoritesStrip.js'
import { ImageScanner } from './components/ImageScanner.js'
import { PokemonCatalog } from './components/PokemonCatalog.js'
import { PokemonCompare } from './components/PokemonCompare.js'
import { PokemonSearch } from './components/PokemonSearch.js'
import { ResultCard } from './components/ResultCard.js'
import { ScanCandidateStrip } from './components/ScanCandidateStrip.js'
import { ScanHistoryStrip } from './components/ScanHistoryStrip.js'
import { PwaUpdateBanner } from './components/PwaUpdateBanner.js'
import { QuizModal } from './components/QuizModal.js'
import { AssistantModal } from './components/AssistantModal.js'
import { useAchievements } from './hooks/useAchievements.js'
import { useCollection } from './hooks/useCollection.js'
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
import { buildPokedexAnnouncement, speakPokedexLine, isPokedexMuted, setPokedexMuted, playUiClick, playUiSlideOpen, playUiPowerOn } from './utils/pokedexVoice.js'
import { onSwUpdate } from './utils/registerServiceWorker.js'
import { getPokemonTypeTheme } from './data/typeColors.js'
import { shareAchievement } from './utils/shareCard.js'
import type { PokemonDetail, PokemonIndexItem } from './services/pokeApi.js'



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
  const [pokemonIndex, setPokemonIndex] = useState<PokemonIndexItem[]>([])
  const [isIndexLoading, setIsIndexLoading] = useState(true)
  const pokemonTotal = pokemonIndex.length || DEFAULT_POKEMON_SPECIES_COUNT
  const { canInstall, isInstalled, promptInstall } = usePwaInstall()
  const [swUpdateReady, setSwUpdateReady] = useState(false)
  const [crtMode, setCrtMode] = useLocalStorage<'active' | 'dimmed' | 'off'>('pokedex-visual-gen1:crt-mode', 'active')
  const [consoleSkin, setConsoleSkin] = useLocalStorage<'red' | 'stealth' | 'sinnoh' | 'emerald' | 'purple' | 'yellow'>('pokedex-visual-gen1:console-skin', 'red')
  const [voiceRate, setVoiceRate] = useLocalStorage<number>('pokedex-visual-gen1:voice-rate', 1.0)
  const [voiceAccent, setVoiceAccent] = useLocalStorage<'mx' | 'es'>('pokedex-visual-gen1:voice-accent', 'mx')
  const [pokedexVolume, setPokedexVolume] = useLocalStorage<number>('pokedex-visual-gen1:volume', 80)
  const [voicePitch, setVoicePitch] = useLocalStorage<number>('pokedex-visual-gen1:voice-pitch', 0.55)
  const [isMuted, setIsMuted] = useState(isPokedexMuted())
  const [isConsoleOpened, setIsConsoleOpened] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return sessionStorage.getItem('pokedex-visual-gen1:is-opened') === 'true'
  })
  const [isRebooting, setIsRebooting] = useState(false)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [stickersEnabled, setStickersEnabled] = useState(() => {
    try {
      return localStorage.getItem('pokedex-visual-gen1:stickers-enabled') !== 'false'
    } catch {
      return true
    }
  })
  const [sfxPack, setSfxPack] = useState<'8bit' | 'synth'>(() => {
    try {
      return (localStorage.getItem('pokedex-visual-gen1:sfx-pack') as '8bit' | 'synth') || '8bit'
    } catch {
      return '8bit'
    }
  })
  const consoleRef = useRef<HTMLDivElement>(null)

  const handleOpenConsole = useCallback(() => {
    setIsConsoleOpened(true)
    sessionStorage.setItem('pokedex-visual-gen1:is-opened', 'true')
    playUiSlideOpen()
  }, [])

  const handleSkinChange = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (audioCtx && !isPokedexMuted()) {
        const osc = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        osc.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(800, audioCtx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3)
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.3)
      }
    } catch (e) {}

    setIsRebooting(true)
    playUiPowerOn()
    setConsoleSkin((prev) => {
      if (prev === 'red') return 'stealth'
      if (prev === 'stealth') return 'sinnoh'
      if (prev === 'sinnoh') return 'emerald'
      if (prev === 'emerald') return 'purple'
      if (prev === 'purple') return 'yellow'
      return 'red'
    })
    setTimeout(() => {
      setIsRebooting(false)
    }, 450)
  }, [setConsoleSkin])



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
      rate: voiceRate, pitch: voicePitch, volume: pokedexVolume / 100, withBeep: true,
      lang: voiceAccent === 'mx' ? 'es-MX' : 'es-ES',
      onEnd: () => setIsSpeaking(false),
    })
  }, [voiceRate, voiceAccent, voicePitch, pokedexVolume])

  // ── Effects ────────────────────────────────────────────────────────────────

  // Subscribe to SW update notifications
  useEffect(() => onSwUpdate(() => setSwUpdateReady(true)), [])

  // Trigger CRT screen phosphor reboot flicker on initial mount
  useEffect(() => {
    setIsRebooting(true)
    playUiPowerOn()
    const t = setTimeout(() => {
      setIsRebooting(false)
    }, 450)
    return () => clearTimeout(t)
  }, [])

  // Synchronize CRT screen styling classes on body
  useEffect(() => {
    document.body.classList.remove('crt-active', 'crt-dimmed', 'crt-off')
    document.body.classList.add(`crt-${crtMode}`)
  }, [crtMode])

  // 3D Parallax and Glare Sheen dynamic tracking on physical card element
  useEffect(() => {
    const card = consoleRef.current
    if (!card) return
    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const xc = rect.width / 2
      const yc = rect.height / 2
      const angleX = (yc - y) / 80 // Max tilt ~4 degrees
      const angleY = (x - xc) / 80 // Max tilt ~5 degrees
      card.style.setProperty('--mouse-x', `${x}px`)
      card.style.setProperty('--mouse-y', `${y}px`)
      card.style.setProperty('--rx', `${angleX}deg`)
      card.style.setProperty('--ry', `${angleY}deg`)
    }
    const handleMouseLeave = () => {
      card.style.setProperty('--mouse-x', '50%')
      card.style.setProperty('--mouse-y', '50%')
      card.style.setProperty('--rx', '0deg')
      card.style.setProperty('--ry', '0deg')
    }
    card.addEventListener('mousemove', handleMouseMove)
    card.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      card.removeEventListener('mousemove', handleMouseMove)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])


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

  useEffect(() => {
    try {
      localStorage.setItem('pokedex-visual-gen1:stickers-enabled', String(stickersEnabled))
    } catch {}
  }, [stickersEnabled])

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

  async function handleShareAchievement(a: any) {
    try {
      await shareAchievement(a)
    } catch (err) {
      console.error('Error al compartir logro:', err)
    }
  }


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <LazyMotion features={loadMotionFeatures}>
    <a href="#main-result" className="skip-to-content">Saltar al resultado</a>
    {swUpdateReady && (
      <PwaUpdateBanner onDismiss={() => setSwUpdateReady(false)} />
    )}
    <main className={`pokedex-stage min-h-svh px-2 py-2 text-dex-ink sm:px-5 sm:py-4 ${isKidsMode ? 'kids-mode' : ''}`}>
      <div 
        className="pokedex-ambilight-glow" 
        style={result ? (getPokemonTypeTheme(result.type) as React.CSSProperties) : undefined}
        aria-hidden="true"
      />
      <DeviceShell>
        <section
          ref={consoleRef}
          className={`pokedex-console-card skin-${consoleSkin}`}
          style={result ? (getPokemonTypeTheme(result.type) as React.CSSProperties) : undefined}
        >
          {stickersEnabled && (
            <>
              <div className="pokedex-chassis-sticker sticker-pikachu" aria-hidden="true" title="Calcomanía Retro Pikachu">
                ⚡️
              </div>
              <div className="pokedex-chassis-sticker sticker-pokeball" aria-hidden="true" title="Calcomanía Retro Pokéball">
                🔴
              </div>
              <div className="pokedex-chassis-sticker sticker-badge" aria-hidden="true" title="Calcomanía Insignia de Liga">
                ✨
              </div>
            </>
          )}
          {isRebooting && (
            <div className="pokedex-crt-reboot-overlay" aria-hidden="true">
              <div className="pokedex-reboot-line" />
            </div>
          )}
          <AnimatePresence>
            {!isConsoleOpened && (
              <m.div
                className="pokedex-closed-cover-overlay"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.4, delay: 0.2 } }}
              >
                {/* Left Panel */}
                <m.div
                  className="pokedex-cover-panel-left"
                  initial={{ x: 0 }}
                  exit={{ x: '-100%', transition: { duration: 0.5, ease: [0.77, 0, 0.175, 1] } }}
                >
                  <div className="pokedex-cover-detail-line" />
                </m.div>

                {/* Right Panel */}
                <m.div
                  className="pokedex-cover-panel-right"
                  initial={{ x: 0 }}
                  exit={{ x: '100%', transition: { duration: 0.5, ease: [0.77, 0, 0.175, 1] } }}
                >
                  <div className="pokedex-cover-detail-line" />
                </m.div>

                {/* Sensor glowing button */}
                <m.div
                  className="pokedex-sensor-container"
                  initial={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0, transition: { duration: 0.3 } }}
                >
                  <button
                    type="button"
                    className="pokedex-blue-sensor"
                    onClick={handleOpenConsole}
                    aria-label="Abrir Pokédex"
                  >
                    <span className="pokedex-sensor-core" />
                  </button>
                </m.div>
              </m.div>
            )}
          </AnimatePresence>

          <header className="console-title-row">
            <div className="flex min-w-0 items-center gap-3">
              <div className="pokedex-logo-mark" aria-hidden="true" />
              <span 
                className={`pokedex-hardware-led ${isSpeaking ? 'speaking' : isAiThinking ? 'thinking' : isKidsMode ? 'kids' : 'active'}`} 
                aria-hidden="true"
                title={isSpeaking ? "Narración activa" : isAiThinking ? "Pensando..." : isKidsMode ? "Modo Niños" : "Pokédex Encendida"}
              />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black uppercase tracking-[0.05em] text-white">Pokédex IA</h1>
              </div>
            </div>
            <div className="console-count-pill">{pokemonTotal} Pokémon</div>
          </header>

          <div className="console-quick-actions" aria-label="Controles rápidos">
            {canInstall && !isInstalled && (
              <m.button
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 450, damping: 15 }}
                type="button"
                className="console-mini-button"
                aria-label="Instalar aplicación"
                onClick={() => { playUiClick(); promptInstall(); }}
              >
                <Download className="size-4" aria-hidden="true" />
                Instalar
              </m.button>
            )}
            <m.button
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              type="button"
              className={`console-mini-button ${crtMode !== 'off' ? 'console-mini-button-active' : ''}`}
              aria-label={`Cambiar modo de pantalla CRT (actual: ${crtMode})`}
              aria-pressed={crtMode !== 'off'}
              onClick={() => {
                playUiClick()
                setCrtMode((prev) => {
                  if (prev === 'active') return 'dimmed'
                  if (prev === 'dimmed') return 'off'
                  return 'active'
                })
              }}
            >
              <Tv className="size-4" aria-hidden="true" />
              CRT: {crtMode === 'active' ? 'Sí' : crtMode === 'dimmed' ? 'Tenue' : 'No'}
            </m.button>
            <m.button
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              type="button"
              className="console-mini-button"
              aria-label={`Cambiar carcasa de la Pokédex (actual: ${
                consoleSkin === 'red' ? 'Roja' : consoleSkin === 'stealth' ? 'Sigilo' : consoleSkin === 'sinnoh' ? 'Sinnoh' : consoleSkin === 'emerald' ? 'Esmeralda' : consoleSkin === 'purple' ? 'Uva Retro' : 'Amarillo Pika'
              })`}
              onClick={handleSkinChange}
            >
              <Palette className="size-4" aria-hidden="true" />
              Carcasa: {
                consoleSkin === 'red' ? 'Roja' : consoleSkin === 'stealth' ? 'Sigilo' : consoleSkin === 'sinnoh' ? 'Sinnoh' : consoleSkin === 'emerald' ? 'Esmeralda' : consoleSkin === 'purple' ? 'Uva Retro' : 'Amarillo Pika'
              }
            </m.button>
            <m.button
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              type="button"
              className={`console-mini-button ${sfxPack === 'synth' ? 'console-mini-button-active' : ''}`}
              aria-label={`Cambiar pack de sonido (actual: ${sfxPack === 'synth' ? 'Moderno Synth' : 'Retro 8-bits'})`}
              onClick={() => {
                playUiClick()
                setSfxPack((prev) => {
                  const next = prev === '8bit' ? 'synth' : '8bit'
                  try {
                    localStorage.setItem('pokedex-visual-gen1:sfx-pack', next)
                  } catch {}
                  return next
                })
              }}
            >
              <Volume2 className="size-4" aria-hidden="true" />
              Sonido: {sfxPack === 'synth' ? 'Synth' : 'Retro'}
            </m.button>
            <m.button
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              type="button"
              className={`console-mini-button ${isMuted ? 'console-mini-button-active' : ''}`}
              aria-label={isMuted ? 'Activar sonido de voz' : 'Silenciar sonido de voz'}
              aria-pressed={isMuted}
              onClick={() => {
                const nextMuted = !isMuted
                if (!nextMuted) {
                  setPokedexMuted(false)
                  setIsMuted(false)
                  playUiClick()
                } else {
                  playUiClick()
                  setPokedexMuted(true)
                  setIsMuted(true)
                }
              }}
            >
              {isMuted ? (
                <>
                  <VolumeX className="size-4" aria-hidden="true" />
                  Mudo
                </>
              ) : (
                <>
                  <Volume2 className="size-4" aria-hidden="true" />
                  Sonido
                </>
              )}
            </m.button>
            <m.button
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              type="button"
              className={`console-mini-button ${isAutoNarrate ? 'console-mini-button-active' : ''}`}
              onClick={() => { playUiClick(); setIsAutoNarrate((value) => !value); }}
              aria-label={isAutoNarrate ? 'Desactivar narración automática' : 'Activar narración automática'}
            >
              <Mic className="size-4" />
              Auto
            </m.button>
            <m.button
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              type="button"
              className={`console-mini-button ${isKidsMode ? 'console-mini-button-active' : ''}`}
              aria-label={isKidsMode ? 'Desactivar modo niños' : 'Activar modo niños'}
              aria-pressed={isKidsMode}
              onClick={() => { playUiClick(); setIsKidsMode((value) => !value); }}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Niños
            </m.button>
            <m.button
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              type="button"
              className={`console-mini-button ${stickersEnabled ? 'console-mini-button-active' : ''}`}
              aria-label="Alternar calcomanías retro en la carcasa"
              onClick={() => {
                playUiClick()
                setStickersEnabled(prev => !prev)
              }}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Stickers
            </m.button>
            <m.button
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              type="button"
              className={`console-mini-button ${voiceRate !== 1.0 ? 'console-mini-button-active' : ''}`}
              aria-label={`Cambiar velocidad de voz (actual: ${voiceRate}x)`}
              onClick={() => {
                playUiClick()
                setVoiceRate((prev) => {
                  const next = prev === 0.8 ? 1.0 : prev === 1.0 ? 1.2 : 0.8
                  const text = next === 0.8 ? "Velocidad lenta" : next === 1.0 ? "Velocidad normal" : "Velocidad rápida"
                  setTimeout(() => {
                    speakPokedexLine(text, {
                      rate: next, pitch: 0.1, volume: 1, withBeep: true,
                      lang: voiceAccent === 'mx' ? 'es-MX' : 'es-ES'
                    })
                  }, 150)
                  return next
                })
              }}
            >
              <Gauge className="size-4" aria-hidden="true" />
              Voz: {voiceRate === 0.8 ? 'Lenta' : voiceRate === 1.0 ? 'Normal' : 'Rápida'}
            </m.button>
            <m.button
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              type="button"
              className={`console-mini-button ${voiceAccent !== 'mx' ? 'console-mini-button-active' : ''}`}
              aria-label={`Cambiar acento de voz (actual: ${voiceAccent === 'mx' ? 'México' : 'España'})`}
              onClick={() => {
                playUiClick()
                setVoiceAccent((prev) => {
                  const next = prev === 'mx' ? 'es' : 'mx'
                  const text = next === 'mx' ? "Acento latino" : "Acento castellano"
                  setTimeout(() => {
                    speakPokedexLine(text, {
                      rate: voiceRate, pitch: voicePitch, volume: pokedexVolume / 100, withBeep: true,
                      lang: next === 'mx' ? 'es-MX' : 'es-ES'
                    })
                  }, 150)
                  return next
                })
              }}
            >
              <Languages className="size-4" aria-hidden="true" />
              Acento: {voiceAccent === 'mx' ? 'MX' : 'ES'}
            </m.button>
            <m.button
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              type="button"
              className={`console-mini-button ${voicePitch !== 0.55 ? 'console-mini-button-active' : ''}`}
              aria-label={`Cambiar tono de voz (actual: ${voicePitch === 0.2 ? 'Profundo' : voicePitch === 0.55 ? 'Normal' : 'Agudo'})`}
              onClick={() => {
                playUiClick()
                setVoicePitch((prev) => {
                  const next = prev === 0.2 ? 0.55 : prev === 0.55 ? 1.0 : 0.2
                  const text = next === 0.2 ? "Tono profundo" : next === 0.55 ? "Tono normal" : "Tono agudo"
                  setTimeout(() => {
                    speakPokedexLine(text, {
                      rate: voiceRate, pitch: next, volume: pokedexVolume / 100, withBeep: true,
                      lang: voiceAccent === 'mx' ? 'es-MX' : 'es-ES'
                    })
                  }, 150)
                  return next
                })
              }}
            >
              <Bot className="size-4" aria-hidden="true" />
              Tono: {voicePitch === 0.2 ? 'Bajo' : voicePitch === 0.55 ? 'Medio' : 'Alto'}
            </m.button>

            {/* Dynamic Hardware Volume Fader & LED Meter */}
            <div className="console-volume-controller" title="Volumen de Hardware">
              <button
                type="button"
                onClick={() => {
                  playUiClick()
                  const nextMuted = !isMuted
                  setPokedexMuted(nextMuted)
                  setIsMuted(nextMuted)
                }}
                className={`console-mute-switch-hardware ${isMuted ? 'mute-on' : 'mute-off'}`}
                title={isMuted ? "Activar Sonido (Unmute)" : "Silenciar Sonido (Mute)"}
                aria-label="Interruptor de silencio físico"
              >
                <span className="mute-switch-knob" />
              </button>
              <input 
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : pokedexVolume}
                onChange={(e) => {
                  const vol = Number(e.target.value)
                  setPokedexVolume(vol)
                  if (vol === 0) {
                    setPokedexMuted(true)
                    setIsMuted(true)
                  } else {
                    setPokedexMuted(false)
                    setIsMuted(false)
                  }
                }}
                className="console-volume-slider"
                aria-label="Volumen de hardware"
              />
              <div className="console-volume-leds" aria-hidden="true">
                <span className={`volume-led ${(!isMuted && pokedexVolume >= 20) ? 'led-on' : ''}`} />
                <span className={`volume-led ${(!isMuted && pokedexVolume >= 40) ? 'led-on' : ''}`} />
                <span className={`volume-led ${(!isMuted && pokedexVolume >= 60) ? 'led-on' : ''}`} />
                <span className={`volume-led ${(!isMuted && pokedexVolume >= 80) ? 'led-on' : ''}`} />
                <span className={`volume-led ${(!isMuted && pokedexVolume >= 95) ? 'led-on' : ''}`} />
              </div>
            </div>
          </div>

          <div className="console-status-bar" role="status" aria-live="polite" aria-atomic="true">
            <span
              className={`console-led console-led-red ${error || (!result && !isScanning) ? 'console-led-active' : ''}`}
              aria-hidden="true"
            />
            <span
              className={`console-led console-led-yellow ${isScanning ? 'console-led-active' : ''}`}
              aria-hidden="true"
            />
            <span
              className={`console-led console-led-green ${result && !isScanning && !error ? 'console-led-active' : ''}`}
              aria-hidden="true"
            />
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
                <summary onClick={() => playUiClick()}>
                  <Sparkles className="size-4" />
                  Recientes
                </summary>
                <ScanHistoryStrip history={scanHistory} onSelect={handleHistorySelected} />
              </details>
            )}

            <div className="flex gap-2">
              <m.button
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 15 }}
                type="button"
                className="console-ai-button flex-1"
                onClick={() => { playUiClick(); setIsAssistantOpen(true); }}
              >
                <Bot className="size-5" />
                Pokédex IA
              </m.button>
              <m.button
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 15 }}
                type="button"
                className="console-ai-button flex-1"
                onClick={() => { playUiClick(); setIsQuizOpen(true); }}
              >
                <Gamepad2 className="size-5" />
                Quiz
              </m.button>
            </div>

            {/* Retro Gaming Controller Footer: D-Pad and Action Buttons A & B */}
            <div className="console-retro-controls" aria-hidden="true">
              <div className="retro-dpad">
                <span className="dpad-axis dpad-x" />
                <span className="dpad-axis dpad-y" />
                <span className="dpad-center" />
              </div>
              
              <div className="retro-action-buttons">
                <m.button
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                  type="button"
                  onClick={() => {
                    playUiClick()
                    setIsRebooting(true)
                    playUiPowerOn()
                    handleReset()
                    setTimeout(() => {
                      setIsRebooting(false)
                    }, 450)
                  }}
                  className="retro-button button-b"
                  title="Botón B — Reiniciar"
                >
                  B
                </m.button>
                <m.button
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                  type="button"
                  onClick={() => {
                    playUiClick()
                    setIsAssistantOpen(true)
                  }}
                  className="retro-button button-a"
                  title="Botón A — Asistente IA"
                >
                  A
                </m.button>
              </div>
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
                collection={collection}
                favorites={favorites}
              />
            </ErrorBoundary>
          )}
        </div>

        {achievements.some((a) => a.unlocked) && (
          <section className="achievements-strip" aria-label="Logros">
            {achievements.filter((a) => a.unlocked).map((a) => (
              <button
                key={a.id}
                type="button"
                className="achievement-chip"
                title={`${a.desc} — ¡Haz clic para compartir!`}
                onClick={() => handleShareAchievement(a)}
              >
                <span>{a.emoji}</span>
                <span>{a.label}</span>
              </button>
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

        <QuizModal
          isOpen={isQuizOpen}
          onClose={() => setIsQuizOpen(false)}
          pokemonIndex={pokemonIndex}
          prefersReducedMotion={prefersReducedMotion}
        />

        <AssistantModal
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          result={result}
          prefersReducedMotion={prefersReducedMotion}
          history={scanHistory.slice(0, 3).map(x => `${x.displayName} (tipo ${x.type})`)}
          voicePitch={voicePitch}
          voiceAccent={voiceAccent}
          onThinkingChange={setIsAiThinking}
        />
      </DeviceShell>
    </main>
    </LazyMotion>
  )
}

export default App
