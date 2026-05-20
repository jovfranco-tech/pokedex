import type { Meta, StoryObj } from '@storybook/react-vite'
import { TypeBadge } from '../components/TypeBadge.tsx'

const meta = {
  title: 'Components/TypeBadge',
  component: TypeBadge,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: [
        'normal', 'fire', 'water', 'grass', 'electric', 'ice',
        'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
        'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
      ],
      description: 'Pokémon type identifier (lowercase English)',
    },
  },
} satisfies Meta<typeof TypeBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Fire: Story    = { args: { type: 'fire' } }
export const Water: Story   = { args: { type: 'water' } }
export const Electric: Story = { args: { type: 'electric' } }
export const Psychic: Story = { args: { type: 'psychic' } }
export const Dragon: Story  = { args: { type: 'dragon' } }
export const Fairy: Story   = { args: { type: 'fairy' } }

/** All 18 types side-by-side */
export const AllTypes: Story = {
  args: { type: 'normal' },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {[
        'normal', 'fire', 'water', 'grass', 'electric', 'ice',
        'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
        'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
      ].map((t) => <TypeBadge key={t} type={t} />)}
    </div>
  ),
}
