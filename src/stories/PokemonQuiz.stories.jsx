import { fn } from '@storybook/test'
import { PokemonQuiz } from '../components/PokemonQuiz.jsx'

const MOCK_INDEX = [
  { id: 1,   name: 'bulbasaur',   displayName: 'Bulbasaur',   sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',   isMega: false, isPrimal: false },
  { id: 4,   name: 'charmander',  displayName: 'Charmander',  sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',   isMega: false, isPrimal: false },
  { id: 7,   name: 'squirtle',    displayName: 'Squirtle',    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',   isMega: false, isPrimal: false },
  { id: 25,  name: 'pikachu',     displayName: 'Pikachu',     sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',  isMega: false, isPrimal: false },
  { id: 39,  name: 'jigglypuff',  displayName: 'Jigglypuff',  sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png',  isMega: false, isPrimal: false },
  { id: 52,  name: 'meowth',      displayName: 'Meowth',      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png',  isMega: false, isPrimal: false },
  { id: 94,  name: 'gengar',      displayName: 'Gengar',      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png',  isMega: false, isPrimal: false },
  { id: 150, name: 'mewtwo',      displayName: 'Mewtwo',      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png', isMega: false, isPrimal: false },
]

/**
 * PokemonQuiz shows the classic "¿Quién es ese Pokémon?" silhouette quiz.
 * Options stagger in with Framer Motion; the silhouette un-blurs on reveal.
 */
export default {
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
}

/** Default interactive quiz — click an option to reveal the answer. */
export const Default = {}

/** Empty index — component returns null (nothing to quiz on). */
export const EmptyIndex = {
  args: { index: [] },
  render: (args) => (
    <div style={{ padding: 24, fontWeight: 700, color: '#5f6475' }}>
      PokemonQuiz returns null with an empty index.{' '}
      <PokemonQuiz {...args} />
    </div>
  ),
}
