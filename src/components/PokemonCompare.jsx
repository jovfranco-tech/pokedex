import { BarChart3, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchPokemonDetails, searchPokemonIndex } from '../services/pokeApi.js'
import { getTypeMeta } from '../data/typeColors.js'
import { getAttackMultiplier } from '../data/typeChart.js'

function statTotal(pokemon) {
  return pokemon?.stats?.reduce((total, stat) => total + stat.value, 0) ?? 0
}

function topStat(pokemon) {
  return pokemon?.stats?.slice().sort((a, b) => b.value - a.value)[0]
}

function getStat(pokemon, name) {
  return pokemon?.stats?.find((stat) => stat.name === name)?.value ?? 0
}

function bestTypeMultiplier(attacker, defender) {
  const attackTypes = attacker?.type ?? []
  const defenderTypes = defender?.type ?? []
  if (!attackTypes.length || !defenderTypes.length) return 1
  return Math.max(...attackTypes.map((attackType) => getAttackMultiplier(attackType, defenderTypes)))
}

function buildBattleScore(pokemon, opponent) {
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

  return {
    score,
    ownBestHit,
    opponentBestHit,
  }
}

function toWinRate(firstScore, secondScore) {
  const firstPositive = Math.max(firstScore, 1)
  const secondPositive = Math.max(secondScore, 1)
  const total = firstPositive + secondPositive
  const firstRate = (firstPositive / total) * 100
  const secondRate = 100 - firstRate
  return { firstRate, secondRate }
}

function ComparePicker({ index, label, onSelect, selected }) {
  const [query, setQuery] = useState('')
  const matches = useMemo(() => searchPokemonIndex(index, query, 5), [index, query])

  function choose(pokemon) {
    setQuery('')
    onSelect(pokemon)
  }

  return (
    <div className="compare-picker">
      <span className="compare-label">{label}</span>
      <div className="compare-search-row">
        <Search className="size-4" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selected ? selected.name : 'Buscar Pokémon'}
        />
      </div>
      {query && (
        <div className="compare-results">
          {matches.map((pokemon) => (
            <button key={`${label}-${pokemon.apiName ?? pokemon.name}`} type="button" onClick={() => choose(pokemon)}>
              <img src={pokemon.sprite} alt="" />
              <span>{pokemon.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CompareCard({ pokemon }) {
  if (!pokemon) {
    return <div className="compare-card compare-card-empty">Elige un Pokémon</div>
  }

  const strongest = topStat(pokemon)

  return (
    <article className="compare-card">
      <img src={pokemon.sprite} alt="" />
      <div>
        <h3>{pokemon.name}</h3>
        <p>{pokemon.type.map((type) => getTypeMeta(type).label).join(' / ')}</p>
        <strong>{statTotal(pokemon)} stats</strong>
        {strongest && <small>Mejor: {strongest.name} {strongest.value}</small>}
      </div>
    </article>
  )
}

export function PokemonCompare({ index = [], initialPokemon }) {
  const [firstPokemon, setFirstPokemon] = useState(initialPokemon ?? null)
  const [secondPokemon, setSecondPokemon] = useState(null)
  const battle = useMemo(() => {
    if (!firstPokemon || !secondPokemon) return null

    const firstScore = buildBattleScore(firstPokemon, secondPokemon)
    const secondScore = buildBattleScore(secondPokemon, firstPokemon)
    const winner = firstScore.score >= secondScore.score ? firstPokemon : secondPokemon
    const winnerScore = firstScore.score >= secondScore.score ? firstScore : secondScore
    const loserScore = firstScore.score >= secondScore.score ? secondScore : firstScore
    const rates = toWinRate(firstScore.score, secondScore.score)
    const winnerRate = firstScore.score >= secondScore.score ? rates.firstRate : rates.secondRate
    const loserRate = firstScore.score >= secondScore.score ? rates.secondRate : rates.firstRate

    return { winner, winnerScore, loserScore, winnerRate, loserRate }
  }, [firstPokemon, secondPokemon])

  async function selectPokemon(setter, pokemon) {
    const details = await fetchPokemonDetails(pokemon.apiName ?? pokemon.name)
    setter(details)
  }

  return (
    <section className="compare-panel" aria-label="Comparador Pokémon">
      <div className="compare-header">
        <BarChart3 className="size-5" />
        <span>Comparar Pokémon</span>
      </div>

      <div className="compare-picker-grid">
        <ComparePicker index={index} label="Pokémon A" selected={firstPokemon} onSelect={(pokemon) => selectPokemon(setFirstPokemon, pokemon)} />
        <ComparePicker index={index} label="Pokémon B" selected={secondPokemon} onSelect={(pokemon) => selectPokemon(setSecondPokemon, pokemon)} />
      </div>

      <div className="compare-card-grid">
        <CompareCard pokemon={firstPokemon} />
        <CompareCard pokemon={secondPokemon} />
      </div>

      {battle && (
        <p className="compare-winner">
          En un 1v1, <strong>{battle.winner.name}</strong> tiene más probabilidad de ganar por matchup.
          Probabilidad estimada: <strong>{battle.winnerRate.toFixed(0)}%</strong> vs <strong>{battle.loserRate.toFixed(0)}%</strong>.
          Su mejor daño por tipo es x{battle.winnerScore.ownBestHit} y recibe hasta x{battle.winnerScore.opponentBestHit},
          frente al rival que pega hasta x{battle.loserScore.ownBestHit} y recibe hasta x{battle.loserScore.opponentBestHit}.
        </p>
      )}
    </section>
  )
}
