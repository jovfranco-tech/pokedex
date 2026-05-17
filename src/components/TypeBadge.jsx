import { getTypeMeta } from '../data/typeColors.js'

export function TypeBadge({ type }) {
  const meta = getTypeMeta(type)

  return (
    <span
      className="type-badge"
      style={{ '--badge-color': meta.color, '--badge-text': meta.text }}
    >
      {meta.label}
    </span>
  )
}
