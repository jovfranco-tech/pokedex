import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PokemonQuiz } from '../PokemonQuiz.jsx'

// Minimal index with 4 distinct Pokémon (enough to build 4-option questions)
const SAMPLE_INDEX = [
  { id: 1,  name: 'bulbasaur',  displayName: 'Bulbasaur',  sprite: 'b.png', isMega: false, isPrimal: false },
  { id: 4,  name: 'charmander', displayName: 'Charmander', sprite: 'c.png', isMega: false, isPrimal: false },
  { id: 7,  name: 'squirtle',   displayName: 'Squirtle',   sprite: 's.png', isMega: false, isPrimal: false },
  { id: 25, name: 'pikachu',    displayName: 'Pikachu',    sprite: 'p.png', isMega: false, isPrimal: false },
]

describe('PokemonQuiz', () => {
  it('renders the quiz title', () => {
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)
    expect(screen.getByText('¿Quién es ese Pokémon?')).toBeInTheDocument()
  })

  it('shows the silhouette image for the current Pokémon', () => {
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)
    // Before revealing, the alt text should be '???' or the pokemon name once revealed
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
  })

  it('renders exactly 4 answer options', () => {
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)
    // 4 option buttons + 1 close button = 5 buttons, options have displayName text
    const options = SAMPLE_INDEX.map((p) => p.displayName)
    const rendered = options.filter((name) => screen.queryByRole('button', { name }))
    expect(rendered.length).toBe(4)
  })

  it('reveals the result after selecting an answer', async () => {
    const user = userEvent.setup()
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)

    // Click any option button (first one in document order)
    const optionButtons = SAMPLE_INDEX.map((p) => screen.queryByRole('button', { name: p.displayName })).filter(Boolean)
    await user.click(optionButtons[0])

    // After answering, "Siguiente →" button should appear
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument()
  })

  it('increments total after each answer', async () => {
    const user = userEvent.setup()
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)

    // Score starts at 0/0
    expect(screen.getByText('0/0')).toBeInTheDocument()

    // Pick any option
    const optionButtons = SAMPLE_INDEX.map((p) => screen.queryByRole('button', { name: p.displayName })).filter(Boolean)
    await user.click(optionButtons[0])

    // Total increments to 1
    expect(screen.getByText(/\/1/)).toBeInTheDocument()
  })

  it('shows next question after clicking Siguiente', async () => {
    const user = userEvent.setup()
    render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)

    const optionButtons = SAMPLE_INDEX.map((p) => screen.queryByRole('button', { name: p.displayName })).filter(Boolean)
    await user.click(optionButtons[0])
    await user.click(screen.getByRole('button', { name: /siguiente/i }))

    // The Siguiente button disappears and 4 options re-appear
    expect(screen.queryByRole('button', { name: /siguiente/i })).toBeNull()
    const newOptions = SAMPLE_INDEX.map((p) => screen.queryByRole('button', { name: p.displayName })).filter(Boolean)
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
