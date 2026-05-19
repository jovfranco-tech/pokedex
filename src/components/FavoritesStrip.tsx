import { Heart } from 'lucide-react'
import { formatPokemonNumber } from '../utils/formatPokemonNumber.js'
import type { FavoriteEntry } from '../hooks/useCollection.js'

interface FavoritesStripProps {
  favorites?: FavoriteEntry[]
  onSelect?: (pokemon: FavoriteEntry) => void
}

export function FavoritesStrip({ favorites = [], onSelect }: FavoritesStripProps) {
  const safeFavorites = Array.isArray(favorites) ? favorites : []

  if (!safeFavorites.length) {
    return (
      <section className="favorites-empty">
        <Heart className="size-5" />
        <span>Marca favoritos para tenerlos aquí.</span>
      </section>
    )
  }

  return (
    <section className="favorites-strip" aria-label="Pokémon favoritos">
      {safeFavorites.map((pokemon) => (
        <button
          key={`${pokemon.apiName ?? pokemon.name}-${pokemon.id}`}
          type="button"
          className="favorite-card"
          aria-label={`Abrir favorito ${pokemon.name}`}
          onClick={() => onSelect?.(pokemon)}
        >
          <img src={pokemon.sprite} alt="" loading="lazy" />
          <span>
            <strong>{pokemon.name}</strong>
            <small>{pokemon.displayNumber ?? formatPokemonNumber(pokemon.speciesId ?? pokemon.id)}</small>
          </span>
        </button>
      ))}
    </section>
  )
}
