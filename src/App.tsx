import { AnimatePresence, LazyMotion, m, useReducedMotion } from 'framer-motion'

const loadMotionFeatures = () => import('framer-motion').then((mod) => mod.domAnimation)
import { Bot, CircleDot, Download, Gamepad2, Mic, Palette, Sparkles, Volume2, VolumeX, User, MicOff } from 'lucide-react'
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
import { TrainerProfileModal } from './components/TrainerProfileModal.js'
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
import { buildPokedexAnnouncement, speakPokedexLine, isPokedexMuted, setPokedexMuted, playUiClick, playUiSlideOpen, playUiPowerOn, playLevelUpFanfare, startAnalogHum, stopAnalogHum, playThermalClick } from './utils/pokedexVoice.js'
import { onSwUpdate } from './utils/registerServiceWorker.js'
import { getPokemonTypeTheme } from './data/typeColors.js'
import { ChiptuneRadio } from './utils/chiptuneRadio.js'
import type { Station } from './utils/chiptuneRadio.js'
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
  const crtMode = 'active'
  const [consoleSkin, setConsoleSkin] = useLocalStorage<'red' | 'stealth' | 'sinnoh' | 'emerald' | 'purple' | 'yellow' | 'atomic-purple' | 'jungle-green'>('pokedex-visual-gen1:console-skin', 'red')
  const voiceRate = 1.0
  const voiceAccent = 'mx'
  const [pokedexVolume, setPokedexVolume] = useLocalStorage<number>('pokedex-visual-gen1:volume', 80)
  const voicePitch = 0.55
  const [isMuted, setIsMuted] = useState(isPokedexMuted())
  const [isHandsFreeActive, setIsHandsFreeActive] = useLocalStorage<boolean>('pokedex-visual-gen1:hands-free', false)
  const [isConsoleOpened, setIsConsoleOpened] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return sessionStorage.getItem('pokedex-visual-gen1:is-opened') === 'true'
  })
  const [isRebooting, setIsRebooting] = useState(false)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const stickersEnabled = false
  const wearTearEnabled = false
  const [radioStation, setRadioStation] = useState<Station>('off')
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('pokedex-visual-gen1:achievements')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [showAchievementBanner, setShowAchievementBanner] = useState<string | null>(null)
  const [sfxPack, setSfxPack] = useState<'8bit' | 'synth'>(() => {
    try {
      return (localStorage.getItem('pokedex-visual-gen1:sfx-pack') as '8bit' | 'synth') || '8bit'
    } catch {
      return '8bit'
    }
  })
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [crtGlitch, setCrtGlitch] = useState(false)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [isListening, setIsListening] = useState(false)

  // Trainer XP & Level state (v14)
  const [trainerProfile, setTrainerProfile] = useLocalStorage<{ level: number; xp: number }>(
    'pokedex-visual-gen1:trainer-profile-v14',
    { level: 1, xp: 0 }
  )
  const [crtPowerOn, setCrtPowerOn] = useState(false)

  const grantXP = useCallback((amount: number, reason?: string) => {
    setTrainerProfile((current) => {
      const safe = current || { level: 1, xp: 0 }
      let newXp = safe.xp + amount
      let newLevel = safe.level
      let nextLevelXp = newLevel * 200
      let leveledUp = false

      while (newXp >= nextLevelXp) {
        newXp -= nextLevelXp
        newLevel += 1
        nextLevelXp = newLevel * 200
        leveledUp = true
      }

      if (leveledUp) {
        // Retro 8-bit fanfare arpeggio audio
        setTimeout(() => {
          playLevelUpFanfare()
        }, 80)
        
        // Show achievement/level banner using native systems
        setShowAchievementBanner(`¡Nivel ${newLevel} alcanzado! 🏆`)
        setTimeout(() => setShowAchievementBanner(null), 5000)
      }

      return { level: newLevel, xp: newXp }
    })
  }, [setTrainerProfile])
  const consoleRef = useRef<HTMLDivElement>(null)

  const handleOpenConsole = useCallback(() => {
    setIsConsoleOpened(true)
    sessionStorage.setItem('pokedex-visual-gen1:is-opened', 'true')
    playUiSlideOpen()
    setCrtPowerOn(true)
    setTimeout(() => setCrtPowerOn(false), 350)
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
    playThermalClick()
    setCrtPowerOn(true)
    setTimeout(() => setCrtPowerOn(false), 350)
    setConsoleSkin((prev) => {
      if (prev === 'red') return 'stealth'
      if (prev === 'stealth') return 'sinnoh'
      if (prev === 'sinnoh') return 'emerald'
      if (prev === 'emerald') return 'purple'
      if (prev === 'purple') return 'yellow'
      if (prev === 'yellow') return 'atomic-purple'
      if (prev === 'atomic-purple') return 'jungle-green'
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
    releasePokemon,
    restoreCollectionData,
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

  // Analog warm transformer background hum (continuous audio synth)
  useEffect(() => {
    if (isConsoleOpened && !isMuted) {
      startAnalogHum()
    } else {
      stopAnalogHum()
    }
    return () => {
      stopAnalogHum()
    }
  }, [isConsoleOpened, isMuted, pokedexVolume])

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
      card.style.setProperty('--rx-num', `${angleX}`)
      card.style.setProperty('--ry-num', `${angleY}`)
    }
    const handleMouseLeave = () => {
      card.style.setProperty('--mouse-x', '50%')
      card.style.setProperty('--mouse-y', '50%')
      card.style.setProperty('--rx', '0deg')
      card.style.setProperty('--ry', '0deg')
      card.style.setProperty('--rx-num', '0')
      card.style.setProperty('--ry-num', '0')
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
    ChiptuneRadio.setVolume(isMuted ? 0 : pokedexVolume)
  }, [pokedexVolume, isMuted])

  useEffect(() => {
    ChiptuneRadio.selectStation(radioStation)
    return () => {
      ChiptuneRadio.selectStation('off')
    }
  }, [radioStation])



  const triggerAchievementUnlock = useCallback((name: string) => {
    setShowAchievementBanner(name)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (audioCtx && !isPokedexMuted()) {
        const osc = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        osc.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        
        osc.type = 'triangle'
        const now = audioCtx.currentTime
        osc.frequency.setValueAtTime(523.25, now) // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08) // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16) // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24) // C6
        
        gainNode.gain.setValueAtTime(0.06, now)
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
        
        osc.start()
        osc.stop(now + 0.5)
      }
    } catch {}
    setTimeout(() => {
      setShowAchievementBanner(null)
    }, 4500)
  }, [isMuted])

  useEffect(() => {
    if (!result) return
    
    const current = [...unlockedAchievements]
    const newUnlocks = [...current]

    // 1. Entrenador de Fuego
    if (!newUnlocks.includes('fire-master')) {
      const fireCount = scanHistory.filter(p => 
        p.type?.toLowerCase().includes('fire') || 
        p.type?.toLowerCase().includes('fuego')
      ).length
      
      const isNewFire = result.type?.some(t => 
        t.toLowerCase().includes('fire') || 
        t.toLowerCase().includes('fuego')
      )

      if (fireCount + (isNewFire ? 1 : 0) >= 3) {
        newUnlocks.push('fire-master')
        triggerAchievementUnlock('Entrenador de Fuego')
      }
    }

    // 2. Cazador Legendario
    if (!newUnlocks.includes('legend-hunter')) {
      if (result.isLegendary || result.isMythical) {
        newUnlocks.push('legend-hunter')
        triggerAchievementUnlock('Cazador Legendario')
      }
    }

    // 3. Gran Coleccionista
    if (!newUnlocks.includes('great-collector')) {
      if (collection.length >= 10) {
        newUnlocks.push('great-collector')
        triggerAchievementUnlock('Gran Coleccionista')
      }
    }

    if (newUnlocks.length > current.length) {
      setUnlockedAchievements(newUnlocks)
      try {
        localStorage.setItem('pokedex-visual-gen1:achievements', JSON.stringify(newUnlocks))
      } catch {}
    }
  }, [result, scanHistory, collection, unlockedAchievements, triggerAchievementUnlock])

  const handleChatSent = useCallback(() => {
    if (!unlockedAchievements.includes('ai-lover')) {
      const next = [...unlockedAchievements, 'ai-lover']
      setUnlockedAchievements(next)
      try {
        localStorage.setItem('pokedex-visual-gen1:achievements', JSON.stringify(next))
      } catch {}
      triggerAchievementUnlock('Amante de la IA')
    }
  }, [unlockedAchievements, triggerAchievementUnlock])

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

  const handleUpdateCollectionWithXP = useCallback((pokemon: PokemonDetail, action: 'seen' | 'captured' = 'seen') => {
    if (!pokemon?.id) return
    
    if (action === 'seen') {
      const alreadyInCollection = collection.some(p => p.id === pokemon.id)
      if (!alreadyInCollection) {
        grantXP(50)
      }
    } else if (action === 'captured') {
      const entry = collection.find(p => p.id === pokemon.id)
      const alreadyCaptured = entry && entry.capturedAt && entry.capturedAt !== ''
      if (!alreadyCaptured) {
        grantXP(150)
      }
    }
    
    updateCollection(pokemon, action)
  }, [collection, updateCollection, grantXP])

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
    updateCollection: handleUpdateCollectionWithXP,
    narratePokemon,
    fetchAndDisplay,
    handleAnalyze: runAnalyze,
    setImageFile,
    clearImage,
    setError,
    setScanCandidates,
  })

  // Continuous hands-free voice-activated hotword listener (v15)
  useEffect(() => {
    if (!isHandsFreeActive || !isConsoleOpened) return undefined

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return undefined

    let recognition: any = null
    let shouldRestart = true

    const startListening = () => {
      if (!shouldRestart) return
      try {
        recognition = new SpeechRecognition()
        recognition.lang = 'es-MX'
        recognition.interimResults = false
        try {
          recognition.continuous = true
        } catch {}

        recognition.onstart = () => {
          console.log('[Hands-Free] Escuchando comandos...')
        }
        recognition.onend = () => {
          if (shouldRestart) {
            setTimeout(startListening, 350)
          }
        }
        recognition.onerror = () => {
          // Silent automatic recovery
        }
        recognition.onresult = (event: any) => {
          const resultIndex = event.resultIndex ?? (event.results.length - 1)
          const transcript = event.results?.[resultIndex]?.[0]?.transcript?.toLowerCase()?.trim() ?? ''
          console.log('[Hands-Free] Detectado:', transcript)

          if (transcript.includes('pokédex') || transcript.includes('pokedex') || transcript.includes('ok dex')) {
            playUiClick()
            
            if (transcript.includes('inicia trivia') || transcript.includes('iniciar trivia') || transcript.includes('trivia') || transcript.includes('quiz') || transcript.includes('jugar')) {
              playUiSlideOpen()
              setIsQuizOpen(true)
            } else if (transcript.includes('busca a') || transcript.includes('quién es') || transcript.includes('quien es')) {
              const match = transcript.match(/(?:busca a|quién es|quien es)\s+([a-zñ0-9\-]+)/i)
              const pkmnName = match?.[1]
              if (pkmnName) {
                const found = pokemonIndex.find(
                  (p: any) => p.name.toLowerCase() === pkmnName.toLowerCase() || p.apiName.toLowerCase() === pkmnName.toLowerCase()
                )
                if (found) {
                  playUiSlideOpen()
                  handlePokemonSelected(found)
                }
              }
            } else if (transcript.includes('limpiar') || transcript.includes('reiniciar') || transcript.includes('reset')) {
              handleReset()
            } else if (transcript.includes('cierra') || transcript.includes('cerrar') || transcript.includes('apagar')) {
              playThermalClick()
              setIsConsoleOpened(false)
            }
          }
        }
        recognition.start()
      } catch (err) {
        console.error('[Hands-Free] Error en reconocimiento:', err)
      }
    }

    startListening()

    return () => {
      shouldRestart = false
      try {
        recognition?.stop()
      } catch {}
    }
  }, [isHandsFreeActive, isConsoleOpened, pokemonIndex, handlePokemonSelected, handleReset])

  // ── CRT Glitch Trigger (v13) ───────────────────────────────────────────────
  useEffect(() => {
    if (result) {
      setCrtGlitch(true)
      const timer = setTimeout(() => setCrtGlitch(false), 150)
      return () => clearTimeout(timer)
    }
  }, [result])

  useEffect(() => {
    if (isScanning) {
      setCrtGlitch(true)
      const timer = setTimeout(() => setCrtGlitch(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isScanning])

  // ── 3D Parallax Tilt (Desktop cursor move) (v13) ───────────────────────────
  useEffect(() => {
    if (prefersReducedMotion) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!consoleRef.current) return
      const rect = consoleRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      
      const rx = -(y / (rect.height / 2)) * 6
      const ry = (x / (rect.width / 2)) * 6
      
      setRotateX(rx)
      setRotateY(ry)

      const mouseX = ((e.clientX - rect.left) / rect.width) * 100
      const mouseY = ((e.clientY - rect.top) / rect.height) * 100
      consoleRef.current.style.setProperty('--mouse-x', `${mouseX}%`)
      consoleRef.current.style.setProperty('--mouse-y', `${mouseY}%`)
    }

    const handleMouseLeave = () => {
      setRotateX(0)
      setRotateY(0)
    }

    const element = consoleRef.current
    if (element) {
      window.addEventListener('mousemove', handleMouseMove)
      element.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (element) {
        element.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [prefersReducedMotion])

  // ── 3D Gyroscope phone tilt (v13) ──────────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion) return

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0
      const gamma = e.gamma ?? 0

      const rx = Math.max(-8, Math.min(8, (beta - 45) / 5))
      const ry = Math.max(-8, Math.min(8, gamma / 5))

      setRotateX(rx)
      setRotateY(ry)
    }

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation)
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleOrientation)
      }
    }
  }, [prefersReducedMotion])

  // ── Speech-to-Text Setup & Recognition Handler (v13) ───────────────────────
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'es-MX'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript
        if (text) {
          playUiClick()
          const cleanQuery = text.trim().replace(/\.$/, '')
          if (cleanQuery) {
            const match = pokemonIndex.find(
              (p) => p.name.toLowerCase() === cleanQuery.toLowerCase() || p.displayName.toLowerCase() === cleanQuery.toLowerCase()
            )
            if (match) {
              handlePokemonSelected(match)
            } else {
              handlePokemonSelected({
                name: cleanQuery,
                apiName: cleanQuery.toLowerCase(),
                displayName: cleanQuery,
              })
            }
          }
        }
      }

      recognitionRef.current = recognition
    }
  }, [pokemonIndex, handlePokemonSelected])

  const toggleVoiceSearch = useCallback(() => {
    playUiClick()
    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      try {
        recognitionRef.current?.start()
      } catch (err) {
        // Fallback
      }
    }
  }, [isListening])

  // ── Trainer Profile Backup Restoration (v13) ───────────────────────────────
  const handleImportProfile = useCallback((importedData: any) => {
    if (!importedData || typeof importedData !== 'object') return

    if (importedData.trainerName) {
      localStorage.setItem('pokedex-visual-gen1:trainer-name', importedData.trainerName)
    }
    
    // Restore collections
    restoreCollectionData(
      importedData.collection || [],
      importedData.favorites || [],
      importedData.collection || []
    )

    // Restore achievements
    if (Array.isArray(importedData.achievements)) {
      setUnlockedAchievements(importedData.achievements)
      localStorage.setItem('pokedex-visual-gen1:achievements', JSON.stringify(importedData.achievements))
    }

    if (importedData.consoleSkin) {
      setConsoleSkin(importedData.consoleSkin)
    }
  }, [setConsoleSkin, restoreCollectionData])

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
      <AnimatePresence>
        {showAchievementBanner && (
          <m.div
            initial={{ opacity: 0, y: -40, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9, transition: { duration: 0.22 } }}
            className="achievement-unlock-banner"
            role="alert"
          >
            <div className="achievement-icon">🏆</div>
            <div>
              <p className="achievement-title">¡LOGRO DESBLOQUEADO!</p>
              <p className="achievement-name">{showAchievementBanner}</p>
              <p className="achievement-desc">¡Se ha adherido una nueva pegatina al chasis!</p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      <div 
        className="pokedex-ambilight-glow" 
        style={result ? (getPokemonTypeTheme(result.type) as React.CSSProperties) : undefined}
        aria-hidden="true"
      />
      <DeviceShell>
        <section
          ref={consoleRef}
          className={`pokedex-console-card skin-${consoleSkin}`}
          style={{
            ...(result ? (getPokemonTypeTheme(result.type) as React.CSSProperties) : {}),
            '--rx': `${rotateX}deg`,
            '--ry': `${rotateY}deg`,
            '--rx-num': rotateX,
            '--ry-num': rotateY,
          } as React.CSSProperties}
        >
          {['atomic-purple', 'jungle-green'].includes(consoleSkin) && (
            <div className="console-circuitry-bg" aria-hidden="true" />
          )}

          {isRebooting && (
            <div className="pokedex-crt-reboot-overlay" aria-hidden="true">
              <div className="pokedex-reboot-line" />
            </div>
          )}
          {crtPowerOn && (
            <div className="crt-power-on-flash" aria-hidden="true" />
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
                  exit={{ x: '-100%', transition: { type: 'spring', stiffness: 180, damping: 20, mass: 1 } }}
                >
                  <div className="pokedex-cover-detail-line" />
                </m.div>

                {/* Right Panel */}
                <m.div
                  className="pokedex-cover-panel-right"
                  initial={{ x: 0 }}
                  exit={{ x: '100%', transition: { type: 'spring', stiffness: 180, damping: 20, mass: 1 } }}
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
              className="console-mini-button"
              aria-label={`Cambiar carcasa de la Pokédex (actual: ${
                consoleSkin === 'red' ? 'Roja' : consoleSkin === 'stealth' ? 'Sigilo' : consoleSkin === 'sinnoh' ? 'Sinnoh' : consoleSkin === 'emerald' ? 'Esmeralda' : consoleSkin === 'purple' ? 'Uva Retro' : consoleSkin === 'yellow' ? 'Amarillo Pika' : consoleSkin === 'atomic-purple' ? 'Atomic Purple' : 'Jungle Green'
              })`}
              onClick={handleSkinChange}
            >
              <Palette className="size-4" aria-hidden="true" />
              Carcasa: {
                consoleSkin === 'red' ? 'Roja' : consoleSkin === 'stealth' ? 'Sigilo' : consoleSkin === 'sinnoh' ? 'Sinnoh' : consoleSkin === 'emerald' ? 'Esmeralda' : consoleSkin === 'purple' ? 'Uva Retro' : consoleSkin === 'yellow' ? 'Amarillo Pika' : consoleSkin === 'atomic-purple' ? 'Atomic Purple' : 'Jungle Green'
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
              className={`console-mini-button ${isHandsFreeActive ? 'console-mini-button-active' : ''}`}
              onClick={() => { playUiClick(); setIsHandsFreeActive((value) => !value); }}
              aria-label={isHandsFreeActive ? 'Desactivar manos libres' : 'Activar manos libres'}
              title="Escucha comandos continuos como 'Pokédex, inicia trivia'"
            >
              {isHandsFreeActive ? <Mic className="size-4 text-green-400" /> : <MicOff className="size-4 text-slate-400" />}
              Voz Activa
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
              className={`console-mini-button ${radioStation !== 'off' ? 'console-mini-button-active' : ''}`}
              aria-label="Alternar radio chiptune de fondo"
              onClick={() => {
                playUiClick()
                setRadioStation(prev => {
                  if (prev === 'off') return 'route1'
                  if (prev === 'route1') return 'center'
                  if (prev === 'center') return 'lavender'
                  return 'off'
                })
              }}
            >
              <Gamepad2 className="size-4" aria-hidden="true" />
              Radio: {radioStation === 'off' ? 'Off' : radioStation === 'route1' ? 'Ruta 1' : radioStation === 'center' ? 'Centro' : 'Lavanda'}
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

          <div className={`console-status-bar ${isScanning ? 'console-status-bar-scanning' : ''}`} role="status" aria-live="polite" aria-atomic="true">
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
                onVoiceSearch={toggleVoiceSearch}
                isListening={isListening}
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
              <m.button
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 15 }}
                type="button"
                className="console-ai-button flex-1"
                onClick={() => { playUiClick(); setIsProfileOpen(true); }}
              >
                <User className="size-5" />
                Perfil
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
        <div style={{ minWidth: 0 }} className={`result-column ${crtGlitch ? 'screen-glitch' : ''}`}>
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
                onMarkCaptured={(pokemon) => handleUpdateCollectionWithXP(pokemon, 'captured')}
                onMarkSeen={(pokemon) => handleUpdateCollectionWithXP(pokemon, 'seen')}
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
          onCorrectAnswer={() => grantXP(100)}
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
          onChatSent={handleChatSent}
        />

        <TrainerProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          collection={collection}
          favorites={favorites}
          unlockedAchievements={unlockedAchievements}
          onSelectPokemon={(apiName) => {
            const match = pokemonIndex.find((p) => p.apiName === apiName)
            if (match) handlePokemonSelected(match)
          }}
          onUpdateCollection={(id, action) => {
            if (action === 'release') releasePokemon(id)
          }}
          onImportProfile={handleImportProfile}
          prefersReducedMotion={prefersReducedMotion}
          trainerLevel={trainerProfile?.level ?? 1}
          trainerXP={trainerProfile?.xp ?? 0}
        />
      </DeviceShell>
    </main>
    </LazyMotion>
  )
}

export default App
