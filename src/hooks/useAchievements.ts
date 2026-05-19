interface CollectionItem {
  seenAt?: string
  capturedAt?: string
}

interface FavoriteItem {
  id: number
}

interface AchievementDefinition {
  id: string
  emoji: string
  label: string
  desc: string
  check: (state: { collection: CollectionItem[]; favorites: FavoriteItem[] }) => boolean
}

export interface Achievement {
  id: string
  emoji: string
  label: string
  desc: string
  unlocked: boolean
}

const DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_seen',
    emoji: '🎯',
    label: '¡Primer Pokémon!',
    desc: 'Encontraste tu primer Pokémon',
    check: ({ collection }) => collection.some((p) => p.seenAt),
  },
  {
    id: 'seen_10',
    emoji: '📚',
    label: 'Entrenador novato',
    desc: '10 Pokémon vistos',
    check: ({ collection }) => collection.filter((p) => p.seenAt).length >= 10,
  },
  {
    id: 'seen_50',
    emoji: '🏆',
    label: 'Maestro Pokémon',
    desc: '50 Pokémon vistos',
    check: ({ collection }) => collection.filter((p) => p.seenAt).length >= 50,
  },
  {
    id: 'first_captured',
    emoji: '🎣',
    label: '¡Atrapado!',
    desc: 'Capturaste tu primer Pokémon',
    check: ({ collection }) => collection.some((p) => p.capturedAt),
  },
  {
    id: 'captured_10',
    emoji: '📦',
    label: 'Coleccionista',
    desc: '10 Pokémon capturados',
    check: ({ collection }) => collection.filter((p) => p.capturedAt).length >= 10,
  },
  {
    id: 'first_favorite',
    emoji: '❤️',
    label: '¡Mi favorito!',
    desc: 'Agregaste un favorito',
    check: ({ favorites }) => favorites.length >= 1,
  },
  {
    id: 'fan_5',
    emoji: '💖',
    label: 'Gran fan',
    desc: '5 Pokémon favoritos',
    check: ({ favorites }) => favorites.length >= 5,
  },
]

export function useAchievements({
  collection = [],
  favorites = [],
}: {
  collection?: CollectionItem[]
  favorites?: FavoriteItem[]
}): Achievement[] {
  return DEFINITIONS.map((def) => ({
    ...def,
    unlocked: def.check({ collection, favorites }),
  }))
}
