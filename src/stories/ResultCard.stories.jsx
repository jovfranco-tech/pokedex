import { fn } from '@storybook/test'
import { AnimatePresence } from 'framer-motion'
import { ResultCard } from '../components/ResultCard.jsx'

/** Full mock result matching the shape returned by fetchPokemonDetails. */
const PIKACHU = {
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  displayName: 'Pikachu', displayNumber: '#0025',
  sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
  type: ['electric'],
  stats: [
    { key: 'hp',              name: 'PS',        value: 35 },
    { key: 'attack',          name: 'Ataque',    value: 55 },
    { key: 'defense',         name: 'Defensa',   value: 40 },
    { key: 'special-attack',  name: 'Atq. Esp.', value: 50 },
    { key: 'special-defense', name: 'Def. Esp.', value: 50 },
    { key: 'speed',           name: 'Velocidad', value: 90 },
  ],
  matchups: {
    vulnerabilities: [{ type: 'ground', multiplier: 2 }],
    resistances:     [{ type: 'electric', multiplier: 0.5 }, { type: 'flying', multiplier: 0.5 }, { type: 'steel', multiplier: 0.5 }],
    immunities:      [],
    effectiveAgainst: [],
    weakAgainst: [],
  },
  gameAppearances: ['Red', 'Blue', 'Yellow', 'Gold', 'Silver'],
  evolution: 'Raichu',
  evolutionChain: [
    { id: 172, name: 'Pichu',    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/172.png' },
    { id: 25,  name: 'Pikachu', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
    { id: 26,  name: 'Raichu',  sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png' },
  ],
  attacks: ['Impactrueno', 'Rayo', 'Trueno', 'Volt Tackle', 'Cola Férrea'],
  abilities: ['Electricidad estática', 'Pararrayos'],
  weight: '6,0 kg', height: '0,4 m', generation: 1,
  description: 'Cuando varios de estos Pokémon se juntan, su electricidad puede provocar tormentas.',
  cryUrl: null, animatedSprite: null, baseExperience: 112,
  confidenceScore: 97, scannedAt: new Date().toISOString(), scanMode: 'búsqueda por texto',
  dataVersion: 'v4', isLegendary: false, isMythical: false, isMega: false,
  isPrimal: false, isRegional: false, isStarter: false, isUltraBeast: false,
  isParadox: false, isBaby: false,
}

const CHARIZARD = {
  ...PIKACHU, id: 6, speciesId: 6, apiName: 'charizard', name: 'Charizard',
  displayName: 'Charizard', displayNumber: '#0006',
  sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',
  type: ['fire', 'flying'],
  stats: [
    { key: 'hp',              name: 'PS',        value: 78 },
    { key: 'attack',          name: 'Ataque',    value: 84 },
    { key: 'defense',         name: 'Defensa',   value: 78 },
    { key: 'special-attack',  name: 'Atq. Esp.', value: 109 },
    { key: 'special-defense', name: 'Def. Esp.', value: 85 },
    { key: 'speed',           name: 'Velocidad', value: 100 },
  ],
  matchups: {
    vulnerabilities: [{ type: 'water', multiplier: 2 }, { type: 'electric', multiplier: 2 }, { type: 'rock', multiplier: 4 }],
    resistances:     [{ type: 'fire', multiplier: 0.5 }, { type: 'grass', multiplier: 0.25 }, { type: 'bug', multiplier: 0.25 }, { type: 'steel', multiplier: 0.5 }, { type: 'fairy', multiplier: 0.5 }],
    immunities:      [{ type: 'ground', multiplier: 0 }],
    effectiveAgainst: [], weakAgainst: [],
  },
  description: 'Escupe fuego tan caliente que puede derretir rocas. Provoca incendios forestales sin querer.',
  isStarter: true,
  evolutionChain: [
    { id: 4, name: 'Charmander', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png' },
    { id: 5, name: 'Charmeleon', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png' },
    { id: 6, name: 'Charizard',  sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png' },
  ],
}

const defaultArgs = {
  result: PIKACHU,
  collectionEntry: null,
  feedback: null,
  isFavorite: false,
  isKidsMode: false,
  isSpeaking: false,
  isScanning: false,
  pokemonTotal: 1025,
  onFeedback: fn(),
  onMarkCaptured: fn(),
  onMarkSeen: fn(),
  onSpeakPokedex: fn(),
  onToggleFavorite: fn(),
}

/**
 * ResultCard renders the Pokémon profile panel.
 * Three states: empty (no result), loading (scan in progress), result.
 */
export default {
  title: 'Components/ResultCard',
  component: ResultCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AnimatePresence mode="wait">
        <Story />
      </AnimatePresence>
    ),
  ],
  parameters: { layout: 'fullscreen' },
}

/** Result card with a complete Pokémon — Pikachu. */
export const WithResult = { args: defaultArgs }

/** Result card — Charizard, fire/flying dual type. */
export const Charizard = { args: { ...defaultArgs, result: CHARIZARD } }

/** Marked as favorite. */
export const Favorite = { args: { ...defaultArgs, isFavorite: true } }

/** Kids mode — simplified view, only Info and 3D tabs. */
export const KidsMode = { args: { ...defaultArgs, isKidsMode: true } }

/** Scanning state — spinner while image is analyzed. */
export const Scanning = { args: { ...defaultArgs, result: null, isScanning: true } }

/** Empty state — no result, no scan in progress. */
export const Empty = { args: { ...defaultArgs, result: null, isScanning: false } }
