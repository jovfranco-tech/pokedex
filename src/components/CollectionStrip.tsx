import { formatPokemonNumber } from '../utils/formatPokemonNumber.js'
import type { CollectionEntry } from '../hooks/useCollection.js'

interface CollectionStripProps {
  collection?: CollectionEntry[]
  onSelect?: (pokemon: CollectionEntry) => void
}

export function CollectionStrip({ collection = [], onSelect }: CollectionStripProps) {
  const items = Array.isArray(collection) ? collection : []
  const seen = items.filter((item) => item.seenAt)
  const captured = items.filter((item) => item.capturedAt)

  if (!items.length) {
    return (
      <section className="collection-empty" aria-label="Colección vacía">
        <span className="collection-empty-icon">🔴</span>
        <span>Tu Pokédex está vacía</span>
        <span className="collection-empty-hint">Busca o escanea Pokémon y márcalos como vistos o capturados</span>
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
