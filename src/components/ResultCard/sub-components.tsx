/**
 * ResultCard sub-components — all the isolated, testable tab panels and helpers.
 *
 * Each component here can be imported and unit-tested independently without
 * mounting the full ResultCard shell.
 */
import { m, useReducedMotion } from 'framer-motion'
import { Activity, BarChart2, ShieldAlert, Sparkles } from 'lucide-react'
import { type CSSProperties, Suspense, lazy, useState } from 'react'
import { getTypeMeta } from '../../data/typeColors.js'
import { playUiClick } from '../../utils/pokedexVoice.js'
import { ErrorBoundary } from '../ErrorBoundary.js'
import { gameGroups, gameLabels, kidsTypeEmojis } from './data.js'
import type { PokemonDetail, TypeMatchups } from '../../services/pokeApi.js'

const Pokemon3DStage = lazy(() => import('../Pokemon3DStage.js').then((m) => ({ default: m.Pokemon3DStage })))

const typeLabel = (type: string) => getTypeMeta(type).label

// ── Helpers ──────────────────────────────────────────────────────────────────

function getKidsCategory(result: PokemonDetail): string | null {
  if (result.isMythical)  return '✨ ¡Es un Pokémon mítico! Muy raro de encontrar.'
  if (result.isLegendary) return '⭐ ¡Es un Pokémon legendario!'
  if (result.isStarter)   return '🌟 ¡Es un Pokémon inicial!'
  if (result.isBaby)      return '🍼 ¡Es un Pokémon bebé, qué tierno!'
  return null
}

// ── Shared mini-components ───────────────────────────────────────────────────

interface MiniListProps {
  title: string
  values?: string[]
}

export function MiniList({ title, values = [] }: MiniListProps) {
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

interface MiniStatProps {
  label: string
  value: string | number | null | undefined
}

export function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="profile-mini-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

// ── Evolution ────────────────────────────────────────────────────────────────

interface EvolutionEntry {
  id: number
  name: string
  sprite: string
}

interface EvolutionChainRowProps {
  chain?: EvolutionEntry[]
  currentId: number
}

export function EvolutionChainRow({ chain = [], currentId }: EvolutionChainRowProps) {
  if (chain.length <= 1) return null
  return (
    <div className="evolution-chain-row">
      {chain.map((entry, idx) => (
        <span key={entry.id} className="evolution-chain-item-wrap">
          {idx > 0 && <span className="evolution-arrow" aria-hidden="true">→</span>}
          <span className={`evolution-chain-item${entry.id === currentId ? ' evolution-chain-item-current' : ''}`}>
            <img src={entry.sprite} alt={entry.name} loading="lazy" />
            <span>{entry.name}</span>
          </span>
        </span>
      ))}
    </div>
  )
}

// ── Stats ────────────────────────────────────────────────────────────────────

interface Stat {
  key: string
  name: string
  value: number
}

interface StatsPanelProps {
  stats?: Stat[]
}

export function StatsPanel({ stats = [] }: StatsPanelProps) {
  const [viewMode, setViewMode] = useState<'bars' | 'radar'>('bars')
  const prefersReducedMotion = useReducedMotion()

  if (!stats.length) {
    return <p className="profile-muted">Stats no disponibles.</p>
  }

  // Map stats in order of hexagon vertices
  const hpStat = stats.find((s) => s.key === 'hp') || stats[0]
  const attStat = stats.find((s) => s.key === 'attack') || stats[1]
  const defStat = stats.find((s) => s.key === 'defense') || stats[2]
  const speedStat = stats.find((s) => s.key === 'speed') || stats[5]
  const spDefStat = stats.find((s) => s.key === 'special-defense') || stats[4]
  const spAttStat = stats.find((s) => s.key === 'special-attack') || stats[3]

  const orderedStats = [hpStat, attStat, defStat, speedStat, spDefStat, spAttStat].filter(Boolean)

  const getCoords = (i: number, val: number) => {
    const angle = i * (Math.PI / 3) - Math.PI / 2
    const r = Math.min(70, (val / 180) * 70)
    return {
      x: 100 + r * Math.cos(angle),
      y: 100 + r * Math.sin(angle),
    }
  }

  // Concentric hexagons background grids
  const gridLevels = [45, 90, 135, 180]
  const gridHexagons = gridLevels.map((val) => {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = i * (Math.PI / 3) - Math.PI / 2
      const x = 100 + (val / 180) * 70 * Math.cos(angle)
      const y = 100 + (val / 180) * 70 * Math.sin(angle)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  })

  // Radial axes lines
  const axisLines = Array.from({ length: 6 }, (_, i) => {
    const angle = i * (Math.PI / 3) - Math.PI / 2
    return {
      x: 100 + 70 * Math.cos(angle),
      y: 100 + 70 * Math.sin(angle),
    }
  })

  // Active Pokemon stat polygon points
  const activePolygonPoints = orderedStats
    .map((stat, i) => {
      const { x, y } = getCoords(i, stat.value)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const dataDots = orderedStats.map((stat, i) => ({
    ...getCoords(i, stat.value),
    key: stat.key,
  }))

  const labelPositions = [
    { x: 100, y: 15,  anchor: 'middle' }, // hp (top)
    { x: 178, y: 64,  anchor: 'start'  }, // attack (top-right)
    { x: 178, y: 142, anchor: 'start'  }, // defense (bottom-right)
    { x: 100, y: 194, anchor: 'middle' }, // speed (bottom)
    { x: 22,  y: 142, anchor: 'end'    }, // sp-defense (bottom-left)
    { x: 22,  y: 64,  anchor: 'end'    }, // sp-attack (top-left)
  ]

  return (
    <div className="stats-container-block">
      <div className="stats-header-row">
        <span>Estadísticas base</span>
        <div className="stats-view-toggle" role="tablist" aria-label="Vista de estadísticas">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'bars'}
            className={`stats-toggle-btn ${viewMode === 'bars' ? 'active' : ''}`}
            onClick={() => { playUiClick(); setViewMode('bars'); }}
          >
            <BarChart2 className="size-3.5" />
            <span>Lista</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'radar'}
            className={`stats-toggle-btn ${viewMode === 'radar' ? 'active' : ''}`}
            onClick={() => { playUiClick(); setViewMode('radar'); }}
          >
            <Activity className="size-3.5" />
            <span>Radar</span>
          </button>
        </div>
      </div>

      {viewMode === 'bars' ? (
        <div className="stats-list animate-fade-in" role="list" aria-label="Estadísticas base">
          {stats.map((stat, i) => {
            const pct = Math.min(100, (stat.value / 180) * 100)
            return (
              <div key={stat.key} className="stat-row" role="listitem">
                <span>{stat.name}</span>
                <span className="stat-track" aria-hidden="true">
                  <m.span
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.5, delay: i * 0.06, ease: 'easeOut' }
                    }
                  />
                </span>
                <strong aria-label={`${stat.value} puntos`}>{stat.value}</strong>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="radar-chart-wrap animate-fade-in" aria-label="Radar de estadísticas base">
          <svg viewBox="0 0 200 200" className="pokedex-radar-chart">
            {/* Background grid concentric hexagons */}
            {gridHexagons.map((points, idx) => (
              <polygon
                key={`grid-hex-${idx}`}
                points={points}
                className="radar-grid-hexagon"
              />
            ))}

            {/* Background radial axes */}
            {axisLines.map((axis, idx) => (
              <line
                key={`grid-axis-${idx}`}
                x1={100}
                y1={100}
                x2={axis.x}
                y2={axis.y}
                className="radar-grid-axis"
              />
            ))}

            {/* Active Stat Area Polygon */}
            <m.polygon
              points={activePolygonPoints}
              className="radar-active-polygon"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
            />

            {/* Stat Vertex Dots */}
            {dataDots.map((dot) => (
              <circle
                key={`dot-${dot.key}`}
                cx={dot.x}
                cy={dot.y}
                r="3.5"
                className="radar-active-dot"
              />
            ))}

            {/* Text Labels */}
            {orderedStats.map((stat, i) => {
              const pos = labelPositions[i]
              return (
                <text
                  key={`label-${stat.key}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor={pos.anchor}
                  className="radar-label"
                >
                  {stat.name}{' '}
                  <tspan className="radar-label-value" dy="0">
                    {stat.value}
                  </tspan>
                </text>
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}

// ── Info tab ─────────────────────────────────────────────────────────────────

interface InfoTabProps {
  isKidsMode?: boolean
  result: PokemonDetail
}

export function InfoTab({ isKidsMode, result }: InfoTabProps) {
  if (isKidsMode) return <KidsInfoTab result={result} />

  return (
    <div className="profile-info-grid">
      <StatsPanel stats={result.stats} />
      <div className="grid gap-3">
        <MiniList title="Ataques" values={result.attacks} />
        <MiniList title="Habilidades" values={result.abilities} />
        {result.evolutionChain?.length > 1
          ? <EvolutionChainRow chain={result.evolutionChain} currentId={result.id} />
          : (
            <div className="profile-note">
              <span>Evolución</span>
              <strong>{result.evolution}</strong>
            </div>
          )}
      </div>
    </div>
  )
}

interface KidsInfoTabProps {
  result: PokemonDetail
}

export function KidsInfoTab({ result }: KidsInfoTabProps) {
  const categoryNote = getKidsCategory(result)
  const topAttacks = result.attacks?.slice(0, 4) ?? []
  const topAbilities = result.abilities?.slice(0, 2) ?? []

  return (
    <div className="kids-info-panel">
      {categoryNote && (
        <div className="kids-category-banner">
          <p>{categoryNote}</p>
        </div>
      )}
      <div className="kids-info-hero">
        <Sparkles className="size-6" />
        <p>{result.description}</p>
      </div>
      <div className="kids-type-chips">
        {result.type?.map((t) => (
          <span key={t} className="kids-type-pill">
            {kidsTypeEmojis[t] ?? '🔵'} {typeLabel(t)}
          </span>
        ))}
      </div>
      <div className="kids-info-grid">
        {topAttacks.length > 0 && (
          <div className="kids-moves-list">
            <p className="kids-section-label">Ataques</p>
            {topAttacks.map((attack) => (
              <div key={attack} className="kids-move-pill">⚔️ {attack}</div>
            ))}
          </div>
        )}
        {topAbilities.length > 0 && (
          <div className="kids-moves-list">
            <p className="kids-section-label">Habilidades</p>
            {topAbilities.map((ability) => (
              <div key={ability} className="kids-move-pill">💡 {ability}</div>
            ))}
          </div>
        )}
        {result.evolution && (
          <div className="kids-evolution-note">
            <span>Evolución</span>
            <strong>{result.evolution}</strong>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Type matchups tab ─────────────────────────────────────────────────────────

interface TypeMatchupItem {
  type: string
  multiplier: number
}

interface TypeChipProps {
  item: TypeMatchupItem
}

function TypeChip({ item }: TypeChipProps) {
  const meta = getTypeMeta(item.type)

  return (
    <span
      className="type-chip"
      style={{ '--chip-color': meta.color, '--chip-text': meta.text } as CSSProperties}
    >
      {meta.label}
      {item.multiplier !== 1 ? ` x${item.multiplier}` : ''}
    </span>
  )
}

interface MatchupRow {
  label: string
  items: TypeMatchupItem[]
}

interface MatchupGroupProps {
  emptyText: string
  rows?: MatchupRow[]
  title: string
  tone: string
}

function MatchupGroup({ emptyText, rows = [], title, tone }: MatchupGroupProps) {
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

interface TypeMatchupsProps {
  matchups: TypeMatchups | null | undefined
}

export function TypeMatchups({ matchups }: TypeMatchupsProps) {
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

// ── Games tab ─────────────────────────────────────────────────────────────────

interface GameAppearancesProps {
  games?: string[]
}

export function GameAppearances({ games = [] }: GameAppearancesProps) {
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
            <section key={group.id} className="game-generation-group" style={{ '--gen-color': group.color } as CSSProperties}>
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

// ── Arte tab (official artwork + 3D stage) ───────────────────────────────────

interface StageTabProps {
  result: PokemonDetail
}

export function StageTab({ result }: StageTabProps) {
  const speciesId = result.speciesId ?? result.id
  const officialArtwork = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${speciesId}.png`

  return (
    <div className="stage-tab-panel">
      <div className="stage-artwork-hero">
        <img
          src={officialArtwork}
          alt={`Arte oficial de ${result.name}`}
          className="stage-artwork-img"
          loading="lazy"
        />
      </div>
      <ErrorBoundary message="La escena 3D no pudo cargarse.">
        <Suspense fallback={<div className="stage-loading">Preparando escena...</div>}>
          <Pokemon3DStage pokemon={result} />
        </Suspense>
      </ErrorBoundary>
      <div className="stage-data-row">
        <span>Exp. base</span>
        <strong>{result.baseExperience ?? '-'}</strong>
      </div>
      <div className="stage-data-row">
        <span>Movimientos</span>
        <strong>{(result.attacks ?? []).slice(0, 4).join(', ')}</strong>
      </div>
    </div>
  )
}
