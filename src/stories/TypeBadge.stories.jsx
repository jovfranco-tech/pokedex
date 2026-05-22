import { TypeBadge } from '../components/TypeBadge.jsx'

/**
 * TypeBadge renders a coloured pill for a Pokémon type.
 * It reads colour and label from the type chart data — no props beyond `type`.
 */
export default {
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
}

export const Fire = { args: { type: 'fire' } }
export const Water = { args: { type: 'water' } }
export const Electric = { args: { type: 'electric' } }
export const Psychic = { args: { type: 'psychic' } }
export const Dragon = { args: { type: 'dragon' } }
export const Fairy = { args: { type: 'fairy' } }

/** All 18 types side-by-side */
export const AllTypes = {
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
