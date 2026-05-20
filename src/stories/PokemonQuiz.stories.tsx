import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from '@storybook/test'
import { PokemonQuiz } from '../components/PokemonQuiz.tsx'

import type { PokemonIndexItem } from '../services/pokeApi.ts'

const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

const mk = (id: number, name: string, displayName: string): PokemonIndexItem => ({
  id, name, apiName: name, displayName,
  displayNumber: `#${id.toString().padStart(4, '0')}`,
  generation: 1, isMega: false, isPrimal: false,
  sprite: `${BASE}/${id}.png`,
  aliases: [], searchText: name,
})

const MOCK_INDEX: PokemonIndexItem[] = [
  mk(1,   'bulbasaur',  'Bulbasaur'),
  mk(4,   'charmander', 'Charmander'),
  mk(7,   'squirtle',   'Squirtle'),
  mk(25,  'pikachu',    'Pikachu'),
  mk(39,  'jigglypuff', 'Jigglypuff'),
  mk(52,  'meowth',     'Meowth'),
  mk(94,  'gengar',     'Gengar'),
  mk(150, 'mewtwo',     'Mewtwo'),
]

const meta = {
  title: 'Components/PokemonQuiz',
  component: PokemonQuiz,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'white' },
  },
  args: {
    index: MOCK_INDEX,
    onClose: fn(),
  },
} satisfies Meta<typeof PokemonQuiz>

export default meta
type Story = StoryObj<typeof meta>

/** Default interactive quiz — click an option to reveal the answer. */
export const Default: Story = {}

/** Empty index — component returns null (nothing to quiz on). */
export const EmptyIndex: Story = {
  args: { index: [] },
  render: (args) => (
    <div style={{ padding: 24, fontWeight: 700, color: '#5f6475' }}>
      PokemonQuiz returns null with an empty index.{' '}
      <PokemonQuiz {...args} />
    </div>
  ),
}
