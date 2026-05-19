/** Shared constants for ResultCard and its sub-components. */

export interface ProfileTab {
  id: string
  label: string
  icon: null
}

export const profileTabs: ProfileTab[] = [
  { id: 'info',     label: 'Info',    icon: null },  // icons injected at import time in index.tsx
  { id: 'matchups', label: 'Matchups', icon: null },
  { id: 'games',    label: 'Juegos',  icon: null },
  { id: 'stage',    label: '3D',      icon: null },
]

export interface GameGroup {
  id: string
  label: string
  color: string
  games: string[]
}

export const gameGroups: GameGroup[] = [
  { id: 'I',    label: 'Gen I',    color: '#ef4444', games: ['Red', 'Blue', 'Yellow'] },
  { id: 'II',   label: 'Gen II',   color: '#f59e0b', games: ['Gold', 'Silver', 'Crystal'] },
  { id: 'III',  label: 'Gen III',  color: '#22c55e', games: ['Ruby', 'Sapphire', 'Emerald', 'FireRed', 'LeafGreen'] },
  { id: 'IV',   label: 'Gen IV',   color: '#38a7d8', games: ['Diamond', 'Pearl', 'Platinum', 'HeartGold', 'SoulSilver'] },
  { id: 'V',    label: 'Gen V',    color: '#a855f7', games: ['Black', 'White', 'Black 2', 'White 2'] },
  { id: 'VI',   label: 'Gen VI',   color: '#14b8a6', games: ['X', 'Y', 'Omega Ruby', 'Alpha Sapphire'] },
  { id: 'VII',  label: 'Gen VII',  color: '#f97316', games: ['Sun', 'Moon', 'Ultra Sun', 'Ultra Moon'] },
  { id: 'VIII', label: 'Gen VIII', color: '#475569', games: ['Sword', 'Shield', 'Legends Arceus'] },
  { id: 'IX',   label: 'Gen IX',   color: '#dc2626', games: ['Scarlet', 'Violet'] },
]

export const gameLabels: Record<string, string> = {
  'Alpha Sapphire': 'Zafiro Alfa',
  Black: 'Negro',
  'Black 2': 'Negro 2',
  Blue: 'Azul',
  Crystal: 'Cristal',
  Diamond: 'Diamante',
  Emerald: 'Esmeralda',
  FireRed: 'Rojo Fuego',
  Gold: 'Oro',
  HeartGold: 'Oro HeartGold',
  LeafGreen: 'Verde Hoja',
  'Legends Arceus': 'Leyendas Arceus',
  Moon: 'Luna',
  'Omega Ruby': 'Rubí Omega',
  Pearl: 'Perla',
  Platinum: 'Platino',
  Red: 'Rojo',
  Ruby: 'Rubí',
  Sapphire: 'Zafiro',
  Shield: 'Escudo',
  Silver: 'Plata',
  SoulSilver: 'Plata SoulSilver',
  Scarlet: 'Escarlata',
  Sun: 'Sol',
  Sword: 'Espada',
  'Ultra Moon': 'Ultraluna',
  'Ultra Sun': 'Ultrasol',
  Violet: 'Púrpura',
  White: 'Blanco',
  'White 2': 'Blanco 2',
  Yellow: 'Amarillo',
}

export const kidsTypeEmojis: Record<string, string> = {
  fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', psychic: '🔮',
  ice: '❄️', dragon: '🐉', dark: '🌙', fairy: '✨', normal: '⭐',
  fighting: '🥊', poison: '☠️', ground: '🌍', flying: '🦋', bug: '🐛',
  rock: '🪨', ghost: '👻', steel: '⚙️',
}
