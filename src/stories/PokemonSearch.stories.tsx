import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from '@storybook/test'
import { PokemonSearch } from '../components/PokemonSearch.tsx'
import type { PokemonIndexItem } from '../services/pokeApi.ts'

const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

const mk = (id: number, name: string, displayName: string, generation = 1): PokemonIndexItem => ({
  id, name, apiName: name, displayName,
  displayNumber: `#${id.toString().padStart(4, '0')}`,
  generation, isMega: false, isPrimal: false,
  sprite: `${BASE}/${id}.png`,
  aliases: [], searchText: name,
})

const MOCK_INDEX: PokemonIndexItem[] = [
  mk(25,  'pikachu',    'Pikachu'),
  mk(1,   'bulbasaur',  'Bulbasaur'),
  mk(4,   'charmander', 'Charmander'),
  mk(7,   'squirtle',   'Squirtle'),
  mk(150, 'mewtwo',     'Mewtwo'),
  mk(249, 'lugia',      'Lugia',     2),
  mk(384, 'rayquaza',   'Rayquaza',  3),
  mk(448, 'lucario',    'Lucario',   4),
]

const meta = {
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
} satisfies Meta<typeof PokemonSearch>

export default meta
type Story = StoryObj<typeof meta>

/** Panel variant — full-width search with grid of suggestions. */
export const Panel: Story = {
  args: { variant: 'panel' },
}

/** Console variant — compact inline form for the device console. */
export const Console: Story = {
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
export const Loading: Story = {
  args: { variant: 'console', isLoading: true },
  decorators: Console.decorators,
}

/** Empty index — nothing loaded yet. */
export const EmptyIndex: Story = {
  args: { variant: 'panel', index: [] },
}
