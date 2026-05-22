import { useMemo, useState } from 'react'
import { formatPokemonNumber } from '../utils/formatPokemonNumber.js'
import type { PokemonIndexItem } from '../services/pokeApi.js'

interface PokemonCatalogProps {
  index?: PokemonIndexItem[]
  onSelect?: (pokemon: PokemonIndexItem) => void
}

export function PokemonCatalog({ index = [], onSelect }: PokemonCatalogProps) {
  const [filterGen, setFilterGen] = useState<number | null>(null)
  const [filterSpecial, setFilterSpecial] = useState<'mega' | 'primal' | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 60

  const filtered = useMemo(() => {
    let items = index
    if (filterGen !== null) {
      items = items.filter((p) => Number(p.generation) === filterGen)
    }
    if (filterSpecial === 'mega') items = items.filter((p) => p.isMega)
    if (filterSpecial === 'primal') items = items.filter((p) => p.isPrimal)
    return items
  }, [index, filterGen, filterSpecial])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const generations = useMemo(() => {
    const gens = new Set(
      index.map((p) => Number(p.generation)).filter((g) => Number.isFinite(g) && g > 0)
    )
    return Array.from(gens).sort((a, b) => a - b)
  }, [index])

  function handleGenFilter(gen: number) {
    setFilterGen((prev) => (prev === gen ? null : gen))
    setPage(0)
  }

  function handleSpecialFilter(special: 'mega' | 'primal') {
    setFilterSpecial((prev) => (prev === special ? null : special))
    setPage(0)
  }

  if (!index.length) {
    return (
      <div className="catalog-loading" aria-label="Cargando catálogo">
        <div className="pokedex-logo-large spinning-pokeball" aria-hidden="true" />
        <p>Cargando Pokédex…</p>
      </div>
    )
  }

  return (
    <section className="catalog-panel" aria-label="Catálogo Pokémon">
      <header className="catalog-header">
        <h2 className="catalog-title">
          Pokédex <span className="catalog-count">{filtered.length}</span>
        </h2>
      </header>

      {/* Generation filter */}
      <div className="catalog-gen-row" role="group" aria-label="Filtrar por generación">
        {generations.map((gen) => (
          <button
            key={gen}
            type="button"
            className={`catalog-gen-chip ${filterGen === gen ? 'catalog-gen-chip-active' : ''}`}
            onClick={() => handleGenFilter(gen)}
            aria-pressed={filterGen === gen}
          >
            Gen. {gen}
          </button>
        ))}
        <button
          type="button"
          className={`catalog-gen-chip ${filterSpecial === 'mega' ? 'catalog-gen-chip-active' : ''}`}
          onClick={() => handleSpecialFilter('mega')}
          aria-pressed={filterSpecial === 'mega'}
        >
          Mega
        </button>
        <button
          type="button"
          className={`catalog-gen-chip ${filterSpecial === 'primal' ? 'catalog-gen-chip-active' : ''}`}
          onClick={() => handleSpecialFilter('primal')}
          aria-pressed={filterSpecial === 'primal'}
        >
          Primigenio
        </button>
      </div>

      {/* Grid */}
      <div className="catalog-grid" role="list">
        {visible.map((pokemon) => (
          <button
            key={pokemon.apiName ?? pokemon.name}
            type="button"
            role="listitem"
            className="catalog-card"
            aria-label={`Ver ${pokemon.displayName}`}
            onClick={() => onSelect?.(pokemon)}
          >
            <img
              src={pokemon.sprite}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="catalog-card-img"
            />
            <span className="catalog-card-num">
              {pokemon.displayNumber ?? formatPokemonNumber(pokemon.id)}
            </span>
            <span className="catalog-card-name">{pokemon.displayName}</span>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="catalog-pagination" role="navigation" aria-label="Páginas del catálogo">
          <button
            type="button"
            className="catalog-page-btn"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Anterior
          </button>
          <span className="catalog-page-info">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="catalog-page-btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}
    </section>
  )
}
