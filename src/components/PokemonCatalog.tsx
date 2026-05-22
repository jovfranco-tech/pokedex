import { useMemo, useState } from 'react'
import { formatPokemonNumber } from '../utils/formatPokemonNumber.js'
import { normalizePokemonText } from '../services/pokeApi.js'
import { Heart, Search } from 'lucide-react'
import type { PokemonIndexItem } from '../services/pokeApi.js'
import type { CollectionEntry, FavoriteEntry } from '../hooks/useCollection.js'

interface PokemonCatalogProps {
  index?: PokemonIndexItem[]
  onSelect?: (pokemon: PokemonIndexItem) => void
  collection?: CollectionEntry[]
  favorites?: FavoriteEntry[]
}

export function PokemonCatalog({
  index = [],
  onSelect,
  collection = [],
  favorites = [],
}: PokemonCatalogProps) {
  const [filterGen, setFilterGen] = useState<number | null>(null)
  const [filterSpecial, setFilterSpecial] = useState<'mega' | 'primal' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCaptured, setFilterCaptured] = useState(false)
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 60

  // Optimize lookups with memoized Sets
  const capturedSet = useMemo(() => {
    return new Set(
      collection
        .filter((c) => c.capturedAt && c.capturedAt !== '')
        .map((c) => c.apiName),
    )
  }, [collection])

  const favoriteSet = useMemo(() => {
    return new Set(favorites.map((f) => f.apiName))
  }, [favorites])

  const filtered = useMemo(() => {
    let items = index

    // 1. Generation filter
    if (filterGen !== null) {
      items = items.filter((p) => Number(p.generation) === filterGen)
    }

    // 2. Special form filter
    if (filterSpecial === 'mega') items = items.filter((p) => p.isMega)
    if (filterSpecial === 'primal') items = items.filter((p) => p.isPrimal)

    // 3. Text query filter
    const cleanQuery = normalizePokemonText(searchQuery)
    if (cleanQuery) {
      items = items.filter((p) => {
        const idMatch = String(p.id).includes(cleanQuery)
        const nameMatch = normalizePokemonText(p.name).includes(cleanQuery)
        const dispMatch = normalizePokemonText(p.displayName).includes(cleanQuery)
        const aliasMatch =
          p.aliases && p.aliases.some((a) => normalizePokemonText(a).includes(cleanQuery))
        return idMatch || nameMatch || dispMatch || aliasMatch
      })
    }

    // 4. Captured filter
    if (filterCaptured) {
      items = items.filter((p) => capturedSet.has(p.apiName))
    }

    // 5. Favorites filter
    if (filterFavorites) {
      items = items.filter((p) => favoriteSet.has(p.apiName))
    }

    return items
  }, [
    index,
    filterGen,
    filterSpecial,
    searchQuery,
    filterCaptured,
    filterFavorites,
    capturedSet,
    favoriteSet,
  ])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const generations = useMemo(() => {
    const gens = new Set(
      index.map((p) => Number(p.generation)).filter((g) => Number.isFinite(g) && g > 0),
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

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value)
    setPage(0)
  }

  function handleCapturedFilter() {
    setFilterCaptured((prev) => !prev)
    setPage(0)
  }

  function handleFavoritesFilter() {
    setFilterFavorites((prev) => !prev)
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

      {/* Advanced search and collection filters */}
      <div className="catalog-search-row">
        <div className="catalog-search-container">
          <Search className="catalog-search-icon size-4" />
          <input
            type="text"
            placeholder="Buscar en Pokédex..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="catalog-search-input"
            aria-label="Buscar en Pokédex"
          />
        </div>
        <div className="catalog-filters-group" role="group" aria-label="Filtros de colección">
          <button
            type="button"
            className={`catalog-filter-chip catalog-filter-chip-captured ${filterCaptured ? 'catalog-filter-chip-active' : ''}`}
            onClick={handleCapturedFilter}
            aria-pressed={filterCaptured}
          >
            <span>🎣</span> Capturados
          </button>
          <button
            type="button"
            className={`catalog-filter-chip catalog-filter-chip-favorites ${filterFavorites ? 'catalog-filter-chip-active' : ''}`}
            onClick={handleFavoritesFilter}
            aria-pressed={filterFavorites}
          >
            <Heart
              className={`size-3.5 ${filterFavorites ? 'fill-[#c62828] text-[#c62828]' : 'text-dex-ink/60'}`}
              aria-hidden="true"
            />{' '}
            Favoritos
          </button>
        </div>
      </div>

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
        {visible.map((pokemon) => {
          const isCap = capturedSet.has(pokemon.apiName)
          const isFav = favoriteSet.has(pokemon.apiName)

          return (
            <button
              key={pokemon.apiName ?? pokemon.name}
              type="button"
              role="listitem"
              className="catalog-card"
              aria-label={`Ver ${pokemon.displayName}`}
              onClick={() => onSelect?.(pokemon)}
            >
              {(isCap || isFav) && (
                <div className="catalog-card-indicators" aria-hidden="true">
                  {isFav && (
                    <span className="catalog-card-indicator" title="Favorito">
                      ❤️
                    </span>
                  )}
                  {isCap && (
                    <span className="catalog-card-indicator" title="Capturado">
                      🎣
                    </span>
                  )}
                </div>
              )}
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
          )
        })}

        {filtered.length === 0 && (
          <div className="catalog-empty-state" role="status">
            <p>No se encontraron Pokémon en el catálogo con los filtros activos.</p>
          </div>
        )}
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
