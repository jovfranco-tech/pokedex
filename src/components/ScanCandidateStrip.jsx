import { SearchCheck } from 'lucide-react'
import { formatPokemonNumber } from '../utils/formatPokemonNumber.js'

export function ScanCandidateStrip({ candidates = [], onSelect }) {
  const visibleCandidates = Array.isArray(candidates) ? candidates.slice(0, 3) : []
  if (!visibleCandidates.length) return null

  return (
    <section className="scan-candidate-strip" aria-label="Candidatos del escaneo">
      <div className="scan-candidate-header">
        <SearchCheck className="size-4" />
        <span>¿No era este?</span>
        <small>Elige otra opción o usa Buscar.</small>
      </div>
      <div className="scan-candidate-list">
        {visibleCandidates.map((pokemon) => (
          <button
            key={`${pokemon.apiName ?? pokemon.name}-${pokemon.id}`}
            type="button"
            className="scan-candidate-card"
            aria-label={`Seleccionar ${pokemon.name} como resultado`}
            onClick={() => onSelect?.(pokemon)}
          >
            <img src={pokemon.sprite} alt="" loading="lazy" aria-hidden="true" />
            <span>
              <strong>{pokemon.name}</strong>
              <small>
                {pokemon.displayNumber ?? formatPokemonNumber(pokemon.id)}
                {pokemon.confidenceScore ? ` · ${pokemon.confidenceScore}%` : ''}
              </small>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
