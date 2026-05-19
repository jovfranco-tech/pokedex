import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { BarChart3, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchPokemonDetails, searchPokemonIndex } from '../services/pokeApi.js'
import { getTypeMeta } from '../data/typeColors.js'
import { getAttackMultiplier } from '../data/typeChart.js'
import type { PokemonDetail, PokemonIndexItem } from '../services/pokeApi.js'

function statTotal(pokemon: PokemonDetail | null): number {
  return pokemon?.stats?.reduce((total, stat) => total + stat.value, 0) ?? 0
}

function topStat(pokemon: PokemonDetail | null): { name: string; value: number } | undefined {
  return pokemon?.stats?.slice().sort((a, b) => b.value - a.value)[0]
}

function getStat(pokemon: PokemonDetail | null, name: string): number {
  return pokemon?.stats?.find((stat) => stat.name === name)?.value ?? 0
}

function bestTypeMultiplier(attacker: PokemonDetail | null, defender: PokemonDetail | null): number {
  const attackTypes = attacker?.type ?? []
  const defenderTypes = defender?.type ?? []
  if (!attackTypes.length || !defenderTypes.length) return 1
  return Math.max(...attackTypes.map((attackType) => getAttackMultiplier(attackType, defenderTypes)))
}

interface BattleScore {
  score: number
  ownBestHit: number
  opponentBestHit: number
}

function buildBattleScore(pokemon: PokemonDetail | null, opponent: PokemonDetail | null): BattleScore {
  const total = statTotal(pokemon)
  const hp = getStat(pokemon, 'PS')
  const speed = getStat(pokemon, 'Velocidad')
  const attack = getStat(pokemon, 'Ataque')
  const specialAttack = getStat(pokemon, 'Atq. Esp.')
  const defense = getStat(pokemon, 'Defensa')
  const specialDefense = getStat(pokemon, 'Def. Esp.')
  const attackPressure = Math.max(attack, specialAttack)
  const bulk = (hp + defense + specialDefense) / 3

  const ownBestHit = bestTypeMultiplier(pokemon, opponent)
  const opponentBestHit = bestTypeMultiplier(opponent, pokemon)
  const matchupEdge = ownBestHit - opponentBestHit

  let score =
    total * 0.35 +
    speed * 0.45 +
    attackPressure * 0.35 +
    bulk * 0.25 +
    matchupEdge * 90

  if (ownBestHit >= 4) score += 30
  if (opponentBestHit >= 4) score -= 35
  if (opponentBestHit === 0) score += 35

  return { score, ownBestHit, opponentBestHit }
}

function toWinRate(firstScore: number, secondScore: number): { firstRate: number; secondRate: number } {
  const firstPositive = Math.max(firstScore, 1)
  const secondPositive = Math.max(secondScore, 1)
  const total = firstPositive + secondPositive
  const firstRate = (firstPositive / total) * 100
  return { firstRate, secondRate: 100 - firstRate }
}

function advantageText(multiplier: number): string {
  if (multiplier >= 4) return 'súper fuerte'
  if (multiplier > 1) return 'fuerte'
  if (multiplier === 1) return 'normal'
  if (multiplier > 0) return 'débil'
  return 'no le hace daño'
}

interface ComparePickerProps {
  index: PokemonIndexItem[]
  label: string
  onSelect: (pokemon: PokemonIndexItem) => void
  selected: PokemonDetail | null
}

function ComparePicker({ index, label, onSelect, selected }: ComparePickerProps) {
  const [query, setQuery] = useState('')
  const matches = useMemo(() => searchPokemonIndex(index, query, 5), [index, query])

  function choose(pokemon: PokemonIndexItem) {
    setQuery('')
    onSelect(pokemon)
  }

  return (
    <div className="compare-picker">
      <span className="compare-label">{label}</span>
      <div className="compare-search-row">
        <Search className="size-4" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selected ? selected.name : 'Buscar Pokémon'}
          aria-label={`Buscar ${label}`}
        />
      </div>
      {query && (
        <div className="compare-results" role="listbox" aria-label={`Resultados para ${label}`}>
          {matches.map((pokemon) => (
            <button
              key={`${label}-${pokemon.apiName ?? pokemon.name}`}
              type="button"
              role="option"
              aria-selected="false"
              aria-label={`Elegir ${pokemon.displayName} como ${label}`}
              onClick={() => choose(pokemon)}
            >
              <img src={pokemon.sprite} alt="" aria-hidden="true" />
              <span>{pokemon.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface CompareCardProps {
  pokemon: PokemonDetail | null
  side: 'left' | 'right'
}

function CompareCard({ pokemon, side }: CompareCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const xOffset = side === 'left' ? -24 : 24

  if (!pokemon) {
    return <div className="compare-card compare-card-empty">Elige un Pokémon</div>
  }

  const strongest = topStat(pokemon)

  return (
    <m.article
      key={pokemon.id}
      className="compare-card"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: xOffset, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
    >
      <img src={pokemon.sprite} alt={`Ilustración de ${pokemon.name}`} />
      <div>
        <h3>{pokemon.name}</h3>
        <p>{pokemon.type.map((type) => getTypeMeta(type).label).join(' / ')}</p>
        <strong>{statTotal(pokemon)} stats totales</strong>
        {strongest && <small>Mejor stat: {strongest.name} ({strongest.value})</small>}
      </div>
    </m.article>
  )
}

interface PokemonCompareProps {
  index?: PokemonIndexItem[]
  initialPokemon?: PokemonDetail | null
}

export function PokemonCompare({ index = [], initialPokemon }: PokemonCompareProps) {
  const prefersReducedMotion = useReducedMotion()
  const [firstPokemon, setFirstPokemon] = useState<PokemonDetail | null>(initialPokemon ?? null)
  const [secondPokemon, setSecondPokemon] = useState<PokemonDetail | null>(null)

  const battle = useMemo(() => {
    if (!firstPokemon || !secondPokemon) return null

    const firstScore = buildBattleScore(firstPokemon, secondPokemon)
    const secondScore = buildBattleScore(secondPokemon, firstPokemon)
    const winner = firstScore.score >= secondScore.score ? firstPokemon : secondPokemon
    const winnerScore = firstScore.score >= secondScore.score ? firstScore : secondScore
    const rates = toWinRate(firstScore.score, secondScore.score)
    const winnerRate = firstScore.score >= secondScore.score ? rates.firstRate : rates.secondRate
    const loserRate = firstScore.score >= secondScore.score ? rates.secondRate : rates.firstRate

    return { winner, winnerScore, winnerRate, loserRate }
  }, [firstPokemon, secondPokemon])

  async function selectPokemon(setter: (p: PokemonDetail) => void, pokemon: PokemonIndexItem) {
    const details = await fetchPokemonDetails(pokemon.apiName ?? pokemon.name)
    setter(details)
  }

  return (
    <section className="compare-panel" aria-label="Comparador Pokémon">
      <div className="compare-header">
        <BarChart3 className="size-5" aria-hidden="true" />
        <span>Comparar Pokémon</span>
      </div>

      <div className="compare-picker-grid">
        <ComparePicker index={index} label="Pokémon A" selected={firstPokemon} onSelect={(pokemon) => selectPokemon(setFirstPokemon, pokemon)} />
        <ComparePicker index={index} label="Pokémon B" selected={secondPokemon} onSelect={(pokemon) => selectPokemon(setSecondPokemon, pokemon)} />
      </div>

      <div className="compare-card-grid">
        <AnimatePresence mode="wait">
          <CompareCard key={firstPokemon?.id ?? 'empty-a'} pokemon={firstPokemon} side="left" />
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <CompareCard key={secondPokemon?.id ?? 'empty-b'} pokemon={secondPokemon} side="right" />
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {battle && (
          <m.p
            className="compare-winner"
            role="status"
            aria-live="polite"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <strong>{battle.winner.name}</strong> tiene ventaja en este duelo.
            Probabilidad de ganar: <strong>{battle.winnerRate.toFixed(0)}%</strong> vs <strong>{battle.loserRate.toFixed(0)}%</strong>.
            Sus ataques son {advantageText(battle.winnerScore.ownBestHit)}s contra el rival.
          </m.p>
        )}
      </AnimatePresence>
    </section>
  )
}
