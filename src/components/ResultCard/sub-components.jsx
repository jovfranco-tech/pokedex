/**
 * ResultCard sub-components — all the isolated, testable tab panels and helpers.
 *
 * Each component here can be imported and unit-tested independently without
 * mounting the full ResultCard shell.
 */
import { m, useReducedMotion } from 'framer-motion'
import { ShieldAlert, Sparkles } from 'lucide-react'
import { Suspense, lazy } from 'react'
import { getTypeMeta } from '../../data/typeColors.js'
import { ErrorBoundary } from '../ErrorBoundary.jsx'
import { gameGroups, gameLabels, kidsTypeEmojis } from './data.js'

const Pokemon3DStage = lazy(() => import('../Pokemon3DStage.jsx').then((m) => ({ default: m.Pokemon3DStage })))

const typeLabel = (type) => getTypeMeta(type).label

// ── Helpers ──────────────────────────────────────────────────────────────────

function getKidsCategory(result) {
  if (result.isMythical)  return '✨ ¡Es un Pokémon mítico! Muy raro de encontrar.'
  if (result.isLegendary) return '⭐ ¡Es un Pokémon legendario!'
  if (result.isStarter)   return '🌟 ¡Es un Pokémon inicial!'
  if (result.isBaby)      return '🍼 ¡Es un Pokémon bebé, qué tierno!'
  return null
}

// ── Shared mini-components ───────────────────────────────────────────────────

export function MiniList({ title, values = [] }) {
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

export function MiniStat({ label, value }) {
  return (
    <div className="profile-mini-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

// ── Evolution ────────────────────────────────────────────────────────────────

export function EvolutionChainRow({ chain = [], currentId }) {
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

export function StatsPanel({ stats = [] }) {
  const prefersReducedMotion = useReducedMotion()
  if (!stats.length) {
    return <p className="profile-muted">Stats no disponibles.</p>
  }

  return (
    <div className="stats-list" role="list" aria-label="Estadísticas base">
      {stats.map((stat, i) => {
        const pct = Math.min(100, (stat.value / 180) * 100)
        return (
          <div key={stat.key} className="stat-row" role="listitem">
            <span>{stat.name}</span>
            <span className="stat-track" aria-hidden="true">
              <m.span
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
              />
            </span>
            <strong aria-label={`${stat.value} puntos`}>{stat.value}</strong>
          </div>
        )
      })}
    </div>
  )
}

// ── Info tab ─────────────────────────────────────────────────────────────────

export function InfoTab({ isKidsMode, result }) {
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

export function KidsInfoTab({ result }) {
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

export function TypeMatchups({ matchups }) {
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

export function GameAppearances({ games = [] }) {
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

// ── 3D stage tab ──────────────────────────────────────────────────────────────

export function StageTab({ result }) {
  return (
    <div className="stage-tab-panel">
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
