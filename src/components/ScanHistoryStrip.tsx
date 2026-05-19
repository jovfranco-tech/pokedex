import { Clock3 } from 'lucide-react'
import { formatPokemonNumber } from '../utils/formatPokemonNumber.js'
import type { ScanHistoryEntry } from '../hooks/useCollection.js'

interface ScanHistoryStripProps {
  history?: ScanHistoryEntry[]
  onSelect?: (item: ScanHistoryEntry) => void
}

export function ScanHistoryStrip({ history = [], onSelect }: ScanHistoryStripProps) {
  const visibleHistory = Array.isArray(history) ? history.slice(0, 6) : []
  if (!visibleHistory.length) return null

  return (
    <section className="console-history-strip" aria-label="Historial de escaneos">
      <div className="console-history-header">
        <Clock3 className="size-4" />
        <p>Recientes</p>
      </div>
      <div className="console-history-list">
        {visibleHistory.map((item) => (
          <button
            key={`${item.id}-${item.scannedAt}`}
            type="button"
            className="console-history-chip"
            aria-label={`Volver a abrir ${item.name}`}
            onClick={() => onSelect?.(item)}
          >
            <img src={item.sprite} alt="" />
            <span>
              <strong>{item.name}</strong>
              <small>
                {item.displayNumber ?? formatPokemonNumber(item.speciesId ?? item.id)}
                {item.confidenceScore ? ` · ${item.confidenceScore}%` : ''}
              </small>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
