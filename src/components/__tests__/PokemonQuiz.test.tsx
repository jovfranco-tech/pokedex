import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

  // ── Deterministic Math.random for branch coverage ─────────────────────────
  describe('with deterministic Math.random', () => {
    beforeEach(() => {
      // Always return 0 → pickQuizPokemon picks index[0] (Bulbasaur)
      // and buildOptions shuffles deterministically.
      vi.spyOn(Math, 'random').mockReturnValue(0)
    })
    afterEach(() => vi.restoreAllMocks())

    it('renders the silhouette with alt="Pokémon desconocido" before reveal', () => {
      render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)
      expect(screen.getByAltText('Pokémon desconocido')).toBeInTheDocument()
    })

    it('reveals the correct displayName as alt text after answering', async () => {
      const user = userEvent.setup()
      render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)

      // Math.random=0 → correct answer is Bulbasaur
      await user.click(screen.getByRole('button', { name: 'Bulbasaur' }))
      expect(screen.getByAltText('Bulbasaur')).toBeInTheDocument()
    })

    it('increments score when the correct option is picked', async () => {
      const user = userEvent.setup()
      render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: 'Bulbasaur' }))
      expect(screen.getByText('1/1')).toBeInTheDocument()
      expect(screen.getByText('¡Correcto! 🎉')).toBeInTheDocument()
    })

    it('keeps the score at 0 when the wrong option is picked', async () => {
      const user = userEvent.setup()
      render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)

      // Pick Pikachu (wrong — answer is Bulbasaur)
      await user.click(screen.getByRole('button', { name: 'Pikachu' }))
      expect(screen.getByText('0/1')).toBeInTheDocument()
      expect(screen.getByText(/Era Bulbasaur 😅/)).toBeInTheDocument()
    })

    it('marks the correct option with aria-current="true" after reveal', async () => {
      const user = userEvent.setup()
      render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: 'Pikachu' }))
      expect(screen.getByRole('button', { name: 'Bulbasaur' })).toHaveAttribute('aria-current', 'true')
    })

    it('disables further option clicks after the first answer', async () => {
      const user = userEvent.setup()
      render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: 'Bulbasaur' }))
      // A second click on a different option must not change the score
      await user.click(screen.getByRole('button', { name: 'Pikachu' }))
      expect(screen.getByText('1/1')).toBeInTheDocument()
    })

    it('marks the wrong picked option with quiz-option-wrong class', async () => {
      const user = userEvent.setup()
      render(<PokemonQuiz index={SAMPLE_INDEX} onClose={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: 'Pikachu' }))
      expect(screen.getByRole('button', { name: 'Pikachu' }).className).toContain('quiz-option-wrong')
    })

    it('filters out mega and primal pokémon from the question pool', () => {
      const indexWithMega: PokemonIndexItem[] = [
        ...SAMPLE_INDEX,
        mk(10001, 'mewtwo-mega-x', 'Mega Mewtwo X'),
      ].map((p, i) => ({ ...p, isMega: i === SAMPLE_INDEX.length, isPrimal: false }))

      render(<PokemonQuiz index={indexWithMega} onClose={vi.fn()} />)
      // Math.random=0 → first eligible (non-mega), still Bulbasaur
      expect(screen.queryByRole('button', { name: 'Mega Mewtwo X' })).toBeNull()
    })
  })
})
