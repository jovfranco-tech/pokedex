import { AnimatePresence, motion } from 'framer-motion'
import { Gamepad2, Heart, Info, ShieldAlert, Sparkles, Swords, Volume2 } from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import { TypeBadge } from './TypeBadge.jsx'
import { getPokemonTypeTheme, getTypeMeta } from '../data/typeColors.js'
import { formatPokemonNumber } from '../utils/formatPokemonNumber.js'
import { playPokemonCry } from '../utils/playPokemonCry.js'

const Pokemon3DStage = lazy(() => import('./Pokemon3DStage.jsx').then((module) => ({ default: module.Pokemon3DStage })))
const typeLabel = (type) => getTypeMeta(type).label

const profileTabs = [
  { id: 'info', label: 'Info', icon: Info },
  { id: 'matchups', label: 'Matchups', icon: Swords },
  { id: 'games', label: 'Juegos', icon: Gamepad2 },
  { id: 'stage', label: '3D', icon: Sparkles },
]

const gameGroups = [
  { id: 'I', label: 'Gen I', color: '#ef4444', games: ['Red', 'Blue', 'Yellow'] },
  { id: 'II', label: 'Gen II', color: '#f59e0b', games: ['Gold', 'Silver', 'Crystal'] },
  { id: 'III', label: 'Gen III', color: '#22c55e', games: ['Ruby', 'Sapphire', 'Emerald', 'FireRed', 'LeafGreen'] },
  { id: 'IV', label: 'Gen IV', color: '#38a7d8', games: ['Diamond', 'Pearl', 'Platinum', 'HeartGold', 'SoulSilver'] },
  { id: 'V', label: 'Gen V', color: '#a855f7', games: ['Black', 'White', 'Black 2', 'White 2'] },
  { id: 'VI', label: 'Gen VI', color: '#14b8a6', games: ['X', 'Y', 'Omega Ruby', 'Alpha Sapphire'] },
  { id: 'VII', label: 'Gen VII', color: '#f97316', games: ['Sun', 'Moon', 'Ultra Sun', 'Ultra Moon'] },
  { id: 'VIII', label: 'Gen VIII', color: '#475569', games: ['Sword', 'Shield', 'Legends Arceus'] },
  { id: 'IX', label: 'Gen IX', color: '#dc2626', games: ['Scarlet', 'Violet'] },
]

const gameLabels = {
  'Alpha Sapphire': 'Zafiro Alfa',
  Black: 'Negro',
  'Black 2': 'Negro 2',
  Blue: 'Azul',
  Crystal: 'Cristal',
  Diamond: 'Diamante',
  Emerald: 'Esmeralda',
  FireRed: 'Rojo Fuego',
  Gold: 'Oro',
  HeartGold: 'Oro HeartGold',
  LeafGreen: 'Verde Hoja',
  'Legends Arceus': 'Leyendas Arceus',
  Moon: 'Luna',
  'Omega Ruby': 'Rubí Omega',
  Pearl: 'Perla',
  Platinum: 'Platino',
  Red: 'Rojo',
  Ruby: 'Rubí',
  Sapphire: 'Zafiro',
  Shield: 'Escudo',
  Silver: 'Plata',
  SoulSilver: 'Plata SoulSilver',
  Scarlet: 'Escarlata',
  Sun: 'Sol',
  Sword: 'Espada',
  'Ultra Moon': 'Ultraluna',
  'Ultra Sun': 'Ultrasol',
  Violet: 'Púrpura',
  White: 'Blanco',
  'White 2': 'Blanco 2',
  Yellow: 'Amarillo',
}

function getSpecialBadges(result) {
  return [
    result.isMega && { label: 'Mega', tone: 'mega' },
    result.isPrimal && { label: 'Primigenio', tone: 'primal' },
    result.isRegional && { label: 'Regional', tone: 'regional' },
    result.isStarter && { label: 'Inicial', tone: 'starter' },
    result.isUltraBeast && { label: 'Ultraente', tone: 'ultra' },
    result.isParadox && { label: 'Paradoja', tone: 'paradox' },
    result.isBaby && { label: 'Bebé', tone: 'baby' },
  ].filter(Boolean)
}

function getCategoryLabel(result) {
  if (result.isMythical) return 'mítico'
  if (result.isLegendary) return 'legendario'
  if (result.isUltraBeast) return 'ultraente'
  if (result.isParadox) return 'paradoja'
  if (result.isStarter) return 'inicial'
  if (result.isBaby) return 'bebé'
  return 'registrado'
}

function buildQuickSummary(result) {
  const types = result.type.map(typeLabel).join(' / ')
  const stat = result.stats?.slice().sort((a, b) => b.value - a.value)[0]
  const statText = stat ? ` Su stat más alto es ${stat.name} (${stat.value}).` : ''
  return `${result.name} es un Pokémon ${getCategoryLabel(result)} de tipo ${types}, Gen. ${result.generation}.${statText}`
}

export function ResultCard({
  collectionEntry,
  isFavorite,
  isKidsMode,
  isScanning,
  onMarkCaptured,
  onMarkSeen,
  onSpeakPokedex,
  onToggleFavorite,
  pokemonTotal = 1025,
  result,
}) {
  const [activeTab, setActiveTab] = useState('info')
  const visibleTabs = useMemo(
    () => (isKidsMode ? profileTabs.filter((tab) => ['info', 'stage'].includes(tab.id)) : profileTabs),
    [isKidsMode],
  )
  const safeActiveTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : 'info'
  const categoryBadges = result ? getSpecialBadges(result) : []

  if (isScanning) {
    return (
      <motion.section 
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
      </motion.section>
    )
  }

  if (!result) {
    return (
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="pokemon-profile-card empty-profile"
      >
        <div className="pokedex-logo-large empty-pokeball" aria-hidden="true" />
        <h2>POKÉDEX IA</h2>
        <p>Generaciones I - IX · {pokemonTotal} Pokémon</p>
        <div className="empty-action-pills">
          <span>Escanear imagen</span>
          <span>Buscar por nombre</span>
          <span>Chat IA</span>
        </div>
      </motion.section>
    )
  }

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
      className="pokemon-profile-card" 
      style={getPokemonTypeTheme(result.type)}
    >
      <div className="profile-hero">
        <div className="profile-title-group">
          <p className="profile-number">{result.displayNumber ?? formatPokemonNumber(result.speciesId ?? result.id)}</p>
          <h2>{result.name}</h2>
          {result.formLabel && <span className="profile-form-badge">{result.formLabel}</span>}
          <div className="flex flex-wrap gap-2">
            {result.type.map((type) => (
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
          onClick={() => playPokemonCry(result.cryUrl)}
          disabled={!result.cryUrl}
          className="profile-sound-button"
        >
          <Volume2 className="size-4" />
          Sonido
        </button>
        <button
          type="button"
          onClick={() => onSpeakPokedex?.(result)}
          className="profile-sound-button"
          aria-label={`Narrar información de ${result.name}`}
        >
          <Volume2 className="size-4" />
          Narrar
        </button>
      </div>

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
        style={{ '--tab-count': visibleTabs.length }}
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
        <motion.div 
          key={safeActiveTab} 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="profile-tab-content"
        >
          {safeActiveTab === 'info' && <InfoTab isKidsMode={isKidsMode} result={result} />}
          {safeActiveTab === 'matchups' && <TypeMatchups matchups={result.matchups} />}
          {safeActiveTab === 'games' && <GameAppearances games={result.gameAppearances} />}
          {safeActiveTab === 'stage' && <StageTab result={result} />}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  )
}

function InfoTab({ isKidsMode, result }) {
  if (isKidsMode) return <KidsInfoTab result={result} />

  return (
    <div className="profile-info-grid">
      <StatsPanel stats={result.stats} />
      <div className="grid gap-3">
        <MiniList title="Ataques" values={result.attacks} />
        <MiniList title="Habilidades" values={result.abilities} />
        <div className="profile-note">
          <span>Evolución</span>
          <strong>{result.evolution}</strong>
        </div>
      </div>
    </div>
  )
}

function KidsInfoTab({ result }) {
  return (
    <div className="kids-info-panel">
      <div className="kids-info-hero">
        <Sparkles className="size-6" />
        <p>{result.description}</p>
      </div>
      <div className="kids-info-grid">
        <MiniList title="Ataques favoritos" values={result.attacks.slice(0, 3)} />
        <MiniList title="Habilidades" values={result.abilities.slice(0, 2)} />
        <div className="profile-note">
          <span>Evolución</span>
          <strong>{result.evolution}</strong>
        </div>
      </div>
    </div>
  )
}

function StatsPanel({ stats = [] }) {
  if (!stats.length) {
    return <p className="profile-muted">Stats no disponibles.</p>
  }

  return (
    <div className="stats-list">
      {stats.map((stat) => (
        <div key={stat.key} className="stat-row">
          <span>{stat.name}</span>
          <span className="stat-track">
            <span style={{ width: `${Math.min(100, (stat.value / 180) * 100)}%` }} />
          </span>
          <strong>{stat.value}</strong>
        </div>
      ))}
    </div>
  )
}

function TypeMatchups({ matchups }) {
  if (!matchups) return <p className="profile-muted">Datos de combate no disponibles.</p>

  return (
    <div className="matchup-stack">
      <MatchupGroup
        tone="danger"
        title="Vulnerabilidades"
        rows={[
          { label: 'Muy débil', items: (matchups.vulnerabilities ?? []).filter((item) => item.multiplier > 2) },
          { label: 'Débil ante', items: (matchups.vulnerabilities ?? []).filter((item) => item.multiplier <= 2) },
        ]}
        emptyText="Sin debilidades claras"
      />
      <MatchupGroup
        tone="safe"
        title="Resistencias"
        rows={[
          { label: 'Muy resistente', items: (matchups.resistances ?? []).filter((item) => item.multiplier <= 0.25) },
          { label: 'Resiste', items: (matchups.resistances ?? []).filter((item) => item.multiplier > 0.25) },
          { label: 'Inmune a', items: matchups.immunities ?? [] },
        ]}
        emptyText="Sin resistencias"
      />
      <MatchupGroup
        tone="power"
        title="Ofensiva"
        rows={[
          { label: 'Efectivo contra', items: matchups.effectiveAgainst ?? [] },
          { label: 'Poco efectivo', items: matchups.weakAgainst ?? [] },
        ]}
        emptyText="Sin ventaja ofensiva clara"
      />
    </div>
  )
}

function MatchupGroup({ emptyText, rows = [], title, tone }) {
  const visibleRows = rows.filter((row) => row.items?.length)

  return (
    <section className={`matchup-group matchup-${tone}`}>
      <h3>
        <ShieldAlert className="size-4" />
        {title}
      </h3>
      {visibleRows.length ? visibleRows.map((row) => (
        <div key={`${title}-${row.label}`} className="matchup-row">
          <span>{row.label}</span>
          <div className="chip-cloud">
            {row.items.map((item) => (
              <TypeChip key={`${title}-${row.label}-${item.type}`} item={item} />
            ))}
          </div>
        </div>
      )) : <p className="profile-muted">{emptyText}</p>}
    </section>
  )
}

function TypeChip({ item }) {
  const meta = getTypeMeta(item.type)

  return (
    <span
      className="type-chip"
      style={{ '--chip-color': meta.color, '--chip-text': meta.text }}
    >
      {meta.label}
      {item.multiplier !== 1 ? ` x${item.multiplier}` : ''}
    </span>
  )
}

function GameAppearances({ games = [] }) {
  const presentGames = new Set(games)
  const groups = gameGroups
    .map((group) => ({
      ...group,
      games: group.games.filter((game) => presentGames.has(game)),
    }))
    .filter((group) => group.games.length)
  const debut = groups[0]?.label ?? 'PokéAPI'

  return (
    <div className="games-panel">
      <div className="game-debut-row">
        <span>Debut</span>
        <strong>{debut}</strong>
      </div>
      {groups.length ? (
        <div className="game-generation-list">
          {groups.map((group) => (
            <section key={group.id} className="game-generation-group" style={{ '--gen-color': group.color }}>
              <h3>{group.label}</h3>
              <div className="chip-cloud">
                {group.games.map((game) => (
                  <span key={game}>{gameLabels[game] ?? game}</span>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="profile-muted">PokéAPI no trae juegos registrados para este Pokémon.</p>
      )}
    </div>
  )
}

function StageTab({ result }) {
  return (
    <div className="stage-tab-panel">
      <Suspense fallback={<div className="stage-loading">Preparando escena...</div>}>
        <Pokemon3DStage pokemon={result} />
      </Suspense>
      <div className="stage-data-row">
        <span>Exp. base</span>
        <strong>{result.baseExperience ?? '-'}</strong>
      </div>
      <div className="stage-data-row">
        <span>Movimientos</span>
        <strong>{result.attacks.slice(0, 4).join(', ')}</strong>
      </div>
    </div>
  )
}

function MiniList({ title, values = [] }) {
  return (
    <div className="profile-note">
      <span>{title}</span>
      <div className="chip-cloud">
        {values.slice(0, 5).map((value) => (
          <span key={value}>{value}</span>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="profile-mini-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
