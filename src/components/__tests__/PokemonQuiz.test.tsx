import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PokemonQuiz } from '../PokemonQuiz.tsx'
import type { PokemonIndexItem } from '../../services/pokeApi.ts'

const mk = (id: number, name: string, displayName: string): PokemonIndexItem => ({
  id, name, apiName: name, displayName,
  displayNumber: `#${id.toString().padStart(4, '0')}`,
  generation: 1, isMega: false, isPrimal: false,
  sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
  aliases: [], searchText: name,
})

// Minimal index with 4 distinct Pokémon (enough to build 4-option questions)
const SAMPLE_INDEX: PokemonIndexItem[] = [
  mk(1,  'bulbasaur',  'Bulbasaur'),
  mk(4,  'charmander', 'Charmander'),
  mk(7,  'squirtle',   'Squirtle'),
  mk(25, 'pikachu',    'Pikachu'),
]

describe('PokemonQuiz', () => {
  it('renders the quiz title', () => {
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)
    expect(screen.getByText('¿Quién es ese Pokémon?')).toBeInTheDocument()
  })

  it('shows the silhouette image for the current Pokémon', () => {
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
  })

  it('renders exactly 4 answer options', () => {
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)
    const options = SAMPLE_INDEX.map((p) => p.displayName)
    const rendered = options.filter((name) => screen.queryByRole('button', { name }))
    expect(rendered.length).toBe(4)
  })

  it('reveals the result after selecting an answer', async () => {
    const user = userEvent.setup()
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)

    const optionButtons = SAMPLE_INDEX
      .map((p) => screen.queryByRole('button', { name: p.displayName }))
      .filter((btn): btn is HTMLElement => btn !== null)
    await user.click(optionButtons[0])

    expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument()
  })

  it('increments total after each answer', async () => {
    const user = userEvent.setup()
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)

    expect(screen.getByText('0/0')).toBeInTheDocument()

    const optionButtons = SAMPLE_INDEX
      .map((p) => screen.queryByRole('button', { name: p.displayName }))
      .filter((btn): btn is HTMLElement => btn !== null)
    await user.click(optionButtons[0])

    expect(screen.getByText(/\/1/)).toBeInTheDocument()
  })

  it('shows next question after clicking Siguiente', async () => {
    const user = userEvent.setup()
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)

    const optionButtons = SAMPLE_INDEX
      .map((p) => screen.queryByRole('button', { name: p.displayName }))
      .filter((btn): btn is HTMLElement => btn !== null)
    await user.click(optionButtons[0])
    await user.click(screen.getByRole('button', { name: /siguiente/i }))

    expect(screen.queryByRole('button', { name: /siguiente/i })).toBeNull()
    const newOptions = SAMPLE_INDEX
      .map((p) => screen.queryByRole('button', { name: p.displayName }))
      .filter(Boolean)
    expect(newOptions.length).toBe(4)
  })

  it('calls onClose when the X button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /cerrar quiz/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('returns null when the index is empty', () => {
    const { container } = render(<PokemonQuiz index={[]} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })
})
