import { CheckCircle2 } from 'lucide-react'
import { formatPokemonNumber } from '../utils/formatPokemonNumber.js'

export function CollectionStrip({ collection = [], onSelect }) {
  const items = Array.isArray(collection) ? collection : []
  const seen = items.filter((item) => item.seenAt)
  const captured = items.filter((item) => item.capturedAt)

  if (!items.length) {
    return (
      <section className="collection-empty">
        <CheckCircle2 className="size-5" />
        <span>Busca o escanea Pokémon para empezar tu colección.</span>
      </section>
    )
  }

  return (
    <section className="collection-panel" aria-label="Colección Pokémon">
      <div className="collection-stats">
        <span><strong>{seen.length}</strong> vistos</span>
        <span><strong>{captured.length}</strong> capturados</span>
      </div>
      <div className="collection-list">
        {items.slice(0, 18).map((pokemon) => (
          <button
            key={pokemon.apiName ?? pokemon.name}
            type="button"
            className={`collection-card ${pokemon.capturedAt ? 'collection-card-captured' : ''}`}
            aria-label={`Abrir ${pokemon.name}${pokemon.capturedAt ? ' (capturado)' : ''}`}
            onClick={() => onSelect?.(pokemon)}
          >
            <img src={pokemon.sprite} alt="" loading="lazy" aria-hidden="true" />
            <span>
              <strong>{pokemon.name}</strong>
              <small>{pokemon.displayNumber ?? formatPokemonNumber(pokemon.speciesId ?? pokemon.id)}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
