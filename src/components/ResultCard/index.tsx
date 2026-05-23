import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { Download, Gamepad2, Heart, Info, Share2, Sparkles, Swords, ThumbsDown, ThumbsUp, Volume2 } from 'lucide-react'
import { type ComponentType, useMemo, useState } from 'react'
import { TypeBadge } from '../TypeBadge.js'
import { getPokemonTypeTheme, getTypeMeta } from '../../data/typeColors.js'
import { formatPokemonNumber } from '../../utils/formatPokemonNumber.js'
import { playPokemonCry, unlockAudio } from '../../utils/playPokemonCry.js'
import { sharePokemonCard } from '../../utils/shareCard.js'
import {
  GameAppearances,
  InfoTab,
  MiniStat,
  StageTab,
  TypeMatchups,
} from './sub-components.js'
import type { PokemonDetail } from '../../services/pokeApi.js'
import type { CollectionEntry } from '../../hooks/useCollection.js'
import { playUiClick } from '../../utils/pokedexVoice.js'

type FeedbackVote = 'correct' | 'wrong' | null

interface ProfileTabDef {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
}

const typeLabel = (type: string) => getTypeMeta(type).label

const profileTabs: ProfileTabDef[] = [
  { id: 'info',     label: 'Info',    icon: Info },
  { id: 'matchups', label: 'Matchups', icon: Swords },
  { id: 'games',    label: 'Juegos',  icon: Gamepad2 },
  { id: 'stage',    label: 'Arte',    icon: Sparkles },
]

interface SpecialBadge {
  label: string
  tone: string
}

function getSpecialBadges(result: PokemonDetail): SpecialBadge[] {
  return [
    result.isMega       && { label: 'Mega',       tone: 'mega' },
    result.isPrimal     && { label: 'Primigenio',  tone: 'primal' },
    result.isRegional   && { label: 'Regional',    tone: 'regional' },
    result.isStarter    && { label: 'Inicial',     tone: 'starter' },
    result.isUltraBeast && { label: 'Ultraente',   tone: 'ultra' },
    result.isParadox    && { label: 'Paradoja',    tone: 'paradox' },
    result.isBaby       && { label: 'Bebé',        tone: 'baby' },
  ].filter((b): b is SpecialBadge => Boolean(b))
}

function getCategoryLabel(result: PokemonDetail): string {
  if (result.isMythical)   return 'mítico'
  if (result.isLegendary)  return 'legendario'
  if (result.isUltraBeast) return 'ultraente'
  if (result.isParadox)    return 'paradoja'
  if (result.isStarter)    return 'inicial'
  if (result.isBaby)       return 'bebé'
  return 'registrado'
}

function buildQuickSummary(result: PokemonDetail): string {
  const types = (result.type ?? []).map(typeLabel).join(' / ')
  const stat = result.stats?.slice().sort((a, b) => b.value - a.value)[0]
  const statText = stat ? ` Su stat más alto es ${stat.name} (${stat.value}).` : ''
  return `${result.name} es un Pokémon ${getCategoryLabel(result)} de tipo ${types}, Gen. ${result.generation}.${statText}`
}

interface ResultCardProps {
  collectionEntry?: CollectionEntry | null
  feedback?: FeedbackVote
  isFavorite?: boolean
  isKidsMode?: boolean
  isSpeaking?: boolean
  isScanning?: boolean
  onFeedback?: (vote: FeedbackVote) => void
  onMarkCaptured?: (pokemon: PokemonDetail) => void
  onMarkSeen?: (pokemon: PokemonDetail) => void
  onSpeakPokedex?: (pokemon: PokemonDetail) => void
  onToggleFavorite?: () => void
  pokemonTotal?: number
  result?: PokemonDetail | null
}

export function ResultCard({
  collectionEntry,
  feedback,
  isFavorite,
  isKidsMode,
  isSpeaking,
  isScanning,
  onFeedback,
  onMarkCaptured,
  onMarkSeen,
  onSpeakPokedex,
  onToggleFavorite,
  pokemonTotal = 1025,
  result,
}: ResultCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const [activeTab, setActiveTab] = useState('info')
  const [isSharing, setIsSharing] = useState(false)
  const [a11yAnnouncement, setA11yAnnouncement] = useState('')
  const [prevPokemon, setPrevPokemon] = useState<PokemonDetail | null>(null)
  const [ghostPokemon, setGhostPokemon] = useState<PokemonDetail | null>(null)
  const [ghostKey, setGhostKey] = useState(0)

  if (result && (!prevPokemon || prevPokemon.id !== result.id)) {
    if (prevPokemon && prevPokemon.id !== result.id) {
      setGhostPokemon(prevPokemon)
      setGhostKey((prev) => prev + 1)
    }
    setPrevPokemon(result)
  }

  const visibleTabs = useMemo(
    () => (isKidsMode ? profileTabs.filter((tab) => ['info', 'stage'].includes(tab.id)) : profileTabs),
    [isKidsMode],
  )
  const safeActiveTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : 'info'
  const categoryBadges = result ? getSpecialBadges(result) : []

  if (isScanning) {
    return (
      <m.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="pokemon-profile-card result-loading"
      >
        <div className="pokedex-logo-large spinning-pokeball" aria-hidden="true" />
        <h2>Analizando imagen...</h2>
        <p>La Pokédex está buscando coincidencias.</p>
        <div className="loading-scan-bar">
          <span className="mini-dot" />
          Procesando
        </div>
      </m.section>
    )
  }

  if (!result) {
    return (
      <m.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="pokemon-profile-card empty-profile"
      >
        <div className="pokedex-logo-large empty-pokeball" aria-hidden="true" />
        <h2>POKÉDEX IA</h2>
        <p>Generaciones I - IX · {pokemonTotal} Pokémon</p>
        <p className="empty-tagline">¿Cuál encontrarás hoy?</p>
        <div className="empty-action-pills">
          <span>Escanear imagen</span>
          <span>Buscar por nombre</span>
          <span>Chat IA</span>
        </div>
      </m.section>
    )
  }

  async function handleShare() {
    if (!result) return
    setIsSharing(true)
    try { await sharePokemonCard(result) } catch { /* user cancelled or unsupported */ }
    finally { setIsSharing(false) }
  }

  async function handleExportCard() {
    if (!result) return
    playUiClick()

    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 560
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw background card (rounded rectangle or gradients)
    // Draw type-themed background
    const meta = getTypeMeta(result.type?.[0])
    const secondaryMeta = result.type?.[1] ? getTypeMeta(result.type?.[1]) : meta

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 560)
    grad.addColorStop(0, meta.color)
    grad.addColorStop(1, secondaryMeta.color)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 400, 560)

    // Inner card border
    ctx.lineWidth = 12
    ctx.strokeStyle = '#1e293b'
    ctx.strokeRect(6, 6, 388, 548)

    // Card header background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillRect(20, 20, 360, 50)
    ctx.lineWidth = 3
    ctx.strokeStyle = '#1e293b'
    ctx.strokeRect(20, 20, 360, 50)

    // Pokemon Name & HP/Level
    ctx.fillStyle = '#1e293b'
    ctx.font = 'bold 20px "Courier New", monospace'
    ctx.fillText(result.name.toUpperCase(), 35, 52)

    ctx.font = 'bold 15px "Courier New", monospace'
    ctx.fillText(result.displayNumber || `#${result.id}`, 290, 52)

    // Illustration Frame
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(20, 85, 360, 260)
    ctx.strokeRect(20, 85, 360, 260)

    // Draw grid pattern inside frame to look retro/CRT
    ctx.fillStyle = 'rgba(30, 41, 59, 0.04)'
    for (let y = 85; y < 345; y += 4) {
      ctx.fillRect(20, y, 360, 2)
    }

    // Load and draw the Pokémon sprite (with anonymous crossOrigin)
    const drawSprite = () => {
      return new Promise<void>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          // Center the image in the frame
          const size = 200
          const x = 20 + (360 - size) / 2
          const y = 85 + (260 - size) / 2
          ctx.drawImage(img, x, y, size, size)
          resolve()
        }
        img.onerror = () => {
          // Fallback if image fails to load
          ctx.fillStyle = '#94a3b8'
          ctx.font = '14px monospace'
          ctx.fillText('[Error al cargar Sprite]', 100, 215)
          resolve()
        }
        img.src = result.sprite
      })
    }

    await drawSprite()

    // Stats / Info Panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillRect(20, 360, 360, 180)
    ctx.strokeRect(20, 360, 360, 180)

    // Print stats
    ctx.fillStyle = '#1e293b'
    ctx.font = 'bold 14px "Courier New", monospace'
    ctx.fillText(`TIPO: ${result.type?.join(' / ').toUpperCase()}`, 35, 395)
    ctx.fillText(`PESO: ${result.weight || 'Desconocido'}`, 35, 420)
    ctx.fillText(`ALTURA: ${result.height || 'Desconocido'}`, 35, 445)

    // Description text wrapping
    ctx.font = '12px "Courier New", monospace'
    const desc = result.description || 'Sin descripción registrada en la base de datos de la Pokédex analógica.'
    const words = desc.split(' ')
    let line = ''
    let yPos = 475
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > 320 && n > 0) {
        ctx.fillText(line, 35, yPos)
        line = words[n] + ' '
        yPos += 18
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, 35, yPos)

    // Retro Holographic logo watermark
    ctx.fillStyle = 'rgba(30, 41, 59, 0.25)'
    ctx.font = 'bold 10px monospace'
    ctx.fillText('POKÉDEX IA V11 - RETRO EDITION', 180, 528)

    // Download flow
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `pokedex-card-${result.apiName || result.id}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error('Failed to export canvas card', e)
    }
  }

  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, y: 12, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -12, scale: 0.97 },
        transition: { type: 'spring' as const, stiffness: 220, damping: 24, mass: 0.8 }
      }

  return (
    <m.section
      {...motionProps}
      layout="position"
      className="pokemon-profile-card"
      aria-label={`Resultado: ${result.name}`}
      aria-live="polite"
      style={getPokemonTypeTheme(result.type)}
    >
      <div className="profile-hero">
        <div className="profile-title-group">
          <p className="profile-number">{result.displayNumber ?? formatPokemonNumber(result.speciesId ?? result.id)}</p>
          <h2>{result.name}</h2>
          {result.formLabel && <span className="profile-form-badge">{result.formLabel}</span>}
          <div className="flex flex-wrap gap-2">
            {(result.type ?? []).map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
            {result.isLegendary && <span className="profile-legendary-badge">Legendario</span>}
            {result.isMythical && <span className="profile-mythical-badge">Mítico</span>}
            {categoryBadges.map((badge) => (
              <span key={badge.label} className={`profile-category-badge profile-category-badge-${badge.tone}`}>
                {badge.label}
              </span>
            ))}
          </div>
        </div>

        <div className="profile-art-card">
          <div key={result.id} className="console-crt-overlay" aria-hidden="true">
            <div className="console-screen-glass-glare" />
            {(result.isLegendary || result.isMythical) && (
              <div className="console-screen-holo-foil" aria-hidden="true" />
            )}
          </div>
          <span className="profile-confidence">{result.confidenceScore}%</span>
          <button
            type="button"
            className={`profile-favorite-button ${isFavorite ? 'profile-favorite-button-active' : ''}`}
            aria-label={isFavorite ? `Quitar ${result.name} de favoritos` : `Agregar ${result.name} a favoritos`}
            onClick={() => {
              playUiClick()
              onToggleFavorite?.()
              setA11yAnnouncement(
                isFavorite
                  ? `Quitaste a ${result.name} de tus favoritos.`
                  : `¡Agregaste a ${result.name} a tus favoritos!`
              )
            }}
          >
            <Heart className="size-4" />
          </button>
          {ghostPokemon && ghostPokemon.sprite && (
            <m.img
              key={`ghost-${ghostKey}`}
              src={ghostPokemon.sprite}
              alt=""
              className="profile-art-ghost"
              initial={{ opacity: 0.75, scale: 1 }}
              animate={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
            />
          )}
          <img key={result.apiName ?? result.id} src={result.sprite} alt={`Ilustración de ${result.name}`} />
        </div>
      </div>

      <div className="profile-divider" />

      <div className="profile-meta-grid">
        <MiniStat label="Peso" value={result.weight} />
        <MiniStat label="Altura" value={result.height} />
        <MiniStat label="Gen." value={result.generation ?? '-'} />
      </div>
      <div className="profile-audio-row">
        <button
          type="button"
          onClick={() => { playUiClick(); unlockAudio(); void playPokemonCry(result.cryUrl ?? '') }}
          disabled={!result.cryUrl}
          className="profile-sound-button"
        >
          <Volume2 className="size-4" />
          Sonido
        </button>
        <button
          type="button"
          onClick={() => { playUiClick(); onSpeakPokedex?.(result) }}
          className={`profile-sound-button${isSpeaking ? ' profile-sound-button-speaking' : ''}`}
          aria-label={isSpeaking ? 'Narrando...' : `Narrar información de ${result.name}`}
        >
          <Volume2 className="size-4" />
          {isSpeaking ? 'Narrando…' : 'Narrar'}
        </button>
        <button
          type="button"
          onClick={() => { playUiClick(); void handleShare() }}
          disabled={isSharing}
          className="profile-sound-button"
          aria-label={`Compartir ${result.name}`}
        >
          <Share2 className="size-4" />
          {isSharing ? '…' : 'Compartir'}
        </button>
        <button
          type="button"
          onClick={handleExportCard}
          className="profile-export-button"
          aria-label={`Exportar ${result.name} como carta coleccionable`}
          title="Exportar como Carta Coleccionable Retro (PNG)"
        >
          <Download className="size-4" />
          Exportar
        </button>
      </div>

      {result.scanMode?.includes('visual') && (
        <div className="profile-feedback-row">
          <span>¿Acerté?</span>
          <button
            type="button"
            className={`profile-feedback-btn${feedback === 'correct' ? ' profile-feedback-btn-yes' : ''}`}
            onClick={() => { playUiClick(); onFeedback?.('correct'); }}
            aria-label="Identificación correcta"
          >
            <ThumbsUp className="size-4" />
          </button>
          <button
            type="button"
            className={`profile-feedback-btn${feedback === 'wrong' ? ' profile-feedback-btn-no' : ''}`}
            onClick={() => { playUiClick(); onFeedback?.('wrong'); }}
            aria-label="Identificación incorrecta"
          >
            <ThumbsDown className="size-4" />
          </button>
        </div>
      )}

      <p className="profile-quick-summary">{buildQuickSummary(result)}</p>

      <div className="profile-collection-actions" aria-label="Colección">
        <button
          type="button"
          className={collectionEntry?.seenAt ? 'profile-collection-button profile-collection-button-active' : 'profile-collection-button'}
          onClick={() => {
            playUiClick()
            onMarkSeen?.(result)
            setA11yAnnouncement(
              collectionEntry?.seenAt
                ? `Marcaste a ${result.name} como no visto.`
                : `Marcaste a ${result.name} como visto.`
            )
          }}
        >
          Visto
        </button>
        <button
          type="button"
          className={collectionEntry?.capturedAt ? 'profile-collection-button profile-collection-button-active' : 'profile-collection-button'}
          onClick={() => {
            playUiClick()
            onMarkCaptured?.(result)
            setA11yAnnouncement(
              collectionEntry?.capturedAt
                ? `Marcaste a ${result.name} como no capturado.`
                : `¡Felicidades! Capturaste a ${result.name} y lo agregaste a tu colección.`
            )
          }}
        >
          Capturado
        </button>
      </div>

      {!isKidsMode && <p className="profile-description">{result.description}</p>}

      {result.visualReason && result.visualReason !== result.description && (
        <p className="profile-vision-reason">
          <Sparkles className="size-4" />
          {result.visualReason}
        </p>
      )}

      <div
        className="profile-tabs"
        role="tablist"
        aria-label="Datos del Pokémon"
        style={{ '--tab-count': visibleTabs.length } as React.CSSProperties}
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={safeActiveTab === tab.id}
              onClick={() => { playUiClick(); setActiveTab(tab.id); }}
              className={`profile-tab ${safeActiveTab === tab.id ? 'profile-tab-active' : ''}`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={safeActiveTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="profile-tab-content"
        >
          {safeActiveTab === 'info'     && <InfoTab isKidsMode={isKidsMode} result={result} />}
          {safeActiveTab === 'matchups' && <TypeMatchups matchups={result.matchups} />}
          {safeActiveTab === 'games'    && <GameAppearances games={result.gameAppearances} />}
          {safeActiveTab === 'stage'    && <StageTab result={result} />}
        </m.div>
      </AnimatePresence>
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {a11yAnnouncement}
      </div>
    </m.section>
  )
}
