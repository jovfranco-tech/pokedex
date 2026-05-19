import type { CSSProperties } from 'react'
import { getTypeMeta } from '../data/typeColors.js'

interface TypeBadgeProps {
  type: string
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const meta = getTypeMeta(type)

  return (
    <span
      className="type-badge"
      style={{ '--badge-color': meta.color, '--badge-text': meta.text } as CSSProperties}
    >
      {meta.label}
    </span>
  )
}
