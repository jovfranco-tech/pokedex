import { BarChart3, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchPokemonDetails, searchPokemonIndex } from '../services/pokeApi.js'
import { getTypeMeta } from '../data/typeColors.js'

function statTotal(pokemon) {
  return pokemon?.stats?.reduce((total, stat) => total + stat.value, 0) ?? 0
}

function topStat(pokemon) {
  return pokemon?.stats?.slice().sort((a, b) => b.value - a.value)[0]
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
  const winner =
    firstPokemon && secondPokemon
      ? statTotal(firstPokemon) >= statTotal(secondPokemon)
        ? firstPokemon
        : secondPokemon
      : null

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

      {winner && (
        <p className="compare-winner">
          En total de stats gana <strong>{winner.name}</strong>. Revisa tipos y debilidades antes de decidir equipo.
        </p>
      )}
    </section>
  )
}
