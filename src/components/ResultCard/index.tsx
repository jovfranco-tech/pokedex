import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { Gamepad2, Heart, Info, Share2, Sparkles, Swords, ThumbsDown, ThumbsUp, Volume2 } from 'lucide-react'
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
  { id: 'stage',    label: '3D',      icon: Sparkles },
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

  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, y: 20, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, scale: 0.95 }, transition: { duration: 0.4, type: 'spring' as const, bounce: 0.3 } }

  return (
    <m.section
      {...motionProps}
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
          <span className="profile-confidence">{result.confidenceScore}%</span>
          <button
            type="button"
            className={`profile-favorite-button ${isFavorite ? 'profile-favorite-button-active' : ''}`}
            aria-label={isFavorite ? `Quitar ${result.name} de favoritos` : `Agregar ${result.name} a favoritos`}
            onClick={onToggleFavorite}
          >
            <Heart className="size-4" />
          </button>
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
          onClick={() => { unlockAudio(); void playPokemonCry(result.cryUrl ?? '') }}
          disabled={!result.cryUrl}
          className="profile-sound-button"
        >
          <Volume2 className="size-4" />
          Sonido
        </button>
        <button
          type="button"
          onClick={() => onSpeakPokedex?.(result)}
          className={`profile-sound-button${isSpeaking ? ' profile-sound-button-speaking' : ''}`}
          aria-label={isSpeaking ? 'Narrando...' : `Narrar información de ${result.name}`}
        >
          <Volume2 className="size-4" />
          {isSpeaking ? 'Narrando…' : 'Narrar'}
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          className="profile-sound-button"
          aria-label={`Compartir ${result.name}`}
        >
          <Share2 className="size-4" />
          {isSharing ? '…' : 'Compartir'}
        </button>
      </div>

      {result.scanMode?.includes('visual') && (
        <div className="profile-feedback-row">
          <span>¿Acerté?</span>
          <button
            type="button"
            className={`profile-feedback-btn${feedback === 'correct' ? ' profile-feedback-btn-yes' : ''}`}
            onClick={() => onFeedback?.('correct')}
            aria-label="Identificación correcta"
          >
            <ThumbsUp className="size-4" />
          </button>
          <button
            type="button"
            className={`profile-feedback-btn${feedback === 'wrong' ? ' profile-feedback-btn-no' : ''}`}
            onClick={() => onFeedback?.('wrong')}
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
          onClick={() => onMarkSeen?.(result)}
        >
          Visto
        </button>
        <button
          type="button"
          className={collectionEntry?.capturedAt ? 'profile-collection-button profile-collection-button-active' : 'profile-collection-button'}
          onClick={() => onMarkCaptured?.(result)}
        >
          Capturado
        </button>
      </div>

      <p className="profile-description">{result.description}</p>

      {result.visualReason && (
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
              onClick={() => setActiveTab(tab.id)}
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
    </m.section>
  )
}
