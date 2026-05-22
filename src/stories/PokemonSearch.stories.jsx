import { fn } from '@storybook/test'
import { PokemonSearch } from '../components/PokemonSearch.jsx'

const MOCK_INDEX = [
  { id: 25,  name: 'pikachu',    displayName: 'Pikachu',    displayNumber: '#0025', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',   generation: 1, isMega: false, isPrimal: false, aliases: [], searchText: 'pikachu' },
  { id: 1,   name: 'bulbasaur',  displayName: 'Bulbasaur',  displayNumber: '#0001', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',    generation: 1, isMega: false, isPrimal: false, aliases: [], searchText: 'bulbasaur' },
  { id: 4,   name: 'charmander', displayName: 'Charmander', displayNumber: '#0004', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',    generation: 1, isMega: false, isPrimal: false, aliases: [], searchText: 'charmander' },
  { id: 7,   name: 'squirtle',   displayName: 'Squirtle',   displayNumber: '#0007', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',    generation: 1, isMega: false, isPrimal: false, aliases: [], searchText: 'squirtle' },
  { id: 150, name: 'mewtwo',     displayName: 'Mewtwo',     displayNumber: '#0150', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png',  generation: 1, isMega: false, isPrimal: false, aliases: [], searchText: 'mewtwo' },
  { id: 249, name: 'lugia',      displayName: 'Lugia',      displayNumber: '#0249', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/249.png',  generation: 2, isMega: false, isPrimal: false, aliases: [], searchText: 'lugia' },
  { id: 384, name: 'rayquaza',   displayName: 'Rayquaza',   displayNumber: '#0384', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/384.png',  generation: 3, isMega: false, isPrimal: false, aliases: [], searchText: 'rayquaza' },
  { id: 448, name: 'lucario',    displayName: 'Lucario',    displayNumber: '#0448', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/448.png',  generation: 4, isMega: false, isPrimal: false, aliases: [], searchText: 'lucario' },
]

/**
 * PokemonSearch supports two display variants:
 * - `panel` — full card with grid of suggestions (used in the main panel)
 * - `console` — compact inline form (used inside the Pokédex console)
 */
export default {
  title: 'Components/PokemonSearch',
  component: PokemonSearch,
  tags: ['autodocs'],
  args: {
    index: MOCK_INDEX,
    isLoading: false,
    onSelect: fn(),
  },
  argTypes: {
    variant: { control: 'radio', options: ['panel', 'console'] },
    isLoading: { control: 'boolean' },
  },
}

/** Panel variant — full-width search with grid of suggestions. */
export const Panel = {
  args: { variant: 'panel' },
}

/** Console variant — compact inline form for the device console. */
export const Console = {
  args: { variant: 'console' },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div style={{ background: '#1e2030', padding: 16, borderRadius: 16, maxWidth: 380 }}>
        <Story />
      </div>
    ),
  ],
}

/** Loading state — index not yet available. */
export const Loading = {
  args: { variant: 'console', isLoading: true },
  decorators: Console.decorators,
}

/** Empty index — nothing loaded yet. */
export const EmptyIndex = {
  args: { variant: 'panel', index: [] },
}
