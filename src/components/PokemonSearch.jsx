import { Loader2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatPokemonNumber } from '../utils/formatPokemonNumber.js'
import { searchPokemonIndex } from '../services/pokeApi.js'

export function PokemonSearch({ index, isLoading, onSelect, variant = 'panel' }) {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => searchPokemonIndex(index, query, 8), [index, query])

  function selectPokemon(pokemon) {
    setQuery('')
    onSelect(pokemon)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (matches[0]) selectPokemon(matches[0])
  }

  if (variant === 'console') {
    return (
      <section className="console-search-module">
        <p className="console-label flex items-center gap-2">
          <Search className="size-4" />
          Buscar
        </p>

        <form onSubmit={handleSubmit} className="console-search-form">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pikachu, Charizard, #150..."
            className="console-search-input"
          />
          <button type="submit" className="console-go-button" aria-label="Buscar Pokémon">
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Ir'}
          </button>
        </form>

        {query && (
          <div className="console-search-results">
            {matches.length ? (
              matches.slice(0, 5).map((pokemon) => (
                <button
                  key={`${pokemon.name}-${pokemon.id}`}
                  type="button"
                  onClick={() => selectPokemon(pokemon)}
                  className="console-result-chip"
                >
                  <img src={pokemon.sprite} alt="" className="size-7 object-contain" loading="lazy" />
                  <span className="truncate">{pokemon.displayName}</span>
                  <span className="text-white/45">{pokemon.displayNumber ?? formatPokemonNumber(pokemon.id)}</span>
                </button>
              ))
            ) : (
              <p className="console-help-text">No encontré ese Pokémon. Prueba con nombre en inglés o número.</p>
            )}
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="panel-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-dex-redDark/80">Pokédex nacional</p>
          <h2 className="text-2xl font-black leading-tight text-dex-ink">Buscar hasta Gen 9</h2>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-lg border-2 border-dex-shell bg-dex-yellow shadow-[0_4px_0_#16171c]">
          {isLoading ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej. ninetales, pikachu, #906..."
          className="min-h-12 min-w-0 flex-1 rounded-lg border-2 border-dex-shell bg-white px-3 text-base font-extrabold text-dex-ink outline-none transition focus:ring-4 focus:ring-dex-blue/20"
        />
        <button type="submit" className="icon-button" aria-label="Buscar Pokémon" title="Buscar Pokémon">
          <Search className="size-5" />
        </button>
      </form>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {(query ? matches : index.slice(0, 8)).map((pokemon) => (
          <button
            key={`${pokemon.name}-${pokemon.id}`}
            type="button"
            onClick={() => selectPokemon(pokemon)}
            className="pokopia-cell flex items-center gap-2 p-2 text-left"
          >
            <img src={pokemon.sprite} alt="" className="size-12 shrink-0 object-contain" loading="lazy" />
            <span className="min-w-0">
              <span className="block text-xs font-black text-dex-ink/45">
                {pokemon.displayNumber ?? formatPokemonNumber(pokemon.id)}
              </span>
              <span className="block truncate text-sm font-black text-dex-ink">{pokemon.displayName}</span>
              <span className="block text-xs font-black uppercase text-dex-blue">
                {pokemon.isMega || pokemon.isPrimal ? 'Mega' : `Gen ${pokemon.generation}`}
              </span>
            </span>
          </button>
        ))}
      </div>

      {query && !matches.length && (
        <p className="mt-3 rounded-lg border border-dex-shell/10 bg-white/80 px-3 py-2 text-sm font-extrabold text-dex-ink/65">
          No encontré ese Pokémon. Prueba con el nombre en inglés o número de Pokédex.
        </p>
      )}
    </section>
  )
}
