import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PokemonSearch } from '../PokemonSearch.tsx'
import type { PokemonIndexItem } from '../../services/pokeApi.ts'

const mk = (id: number, name: string, displayName: string, generation = 1): PokemonIndexItem => ({
  id, name, apiName: name, displayName,
  displayNumber: `#${id.toString().padStart(4, '0')}`,
  generation, isMega: false, isPrimal: false,
  sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
  aliases: [], searchText: name,
})

const sampleIndex: PokemonIndexItem[] = [
  mk(1,   'bulbasaur',  'Bulbasaur'),
  mk(6,   'charizard',  'Charizard'),
  mk(25,  'pikachu',    'Pikachu'),
  mk(150, 'mewtwo',     'Mewtwo'),
  mk(152, 'chikorita',  'Chikorita', 2),
]

describe('PokemonSearch (console variant)', () => {
  it('renders the search input', () => {
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} variant="console" />)
    expect(screen.getByPlaceholderText(/pikachu/i)).toBeInTheDocument()
  })

  it('shows search results as the user types', async () => {
    const user = userEvent.setup()
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} variant="console" />)

    await user.type(screen.getByPlaceholderText(/pikachu/i), 'char')

    expect(screen.getByText(/charizard/i)).toBeInTheDocument()
  })

  it('calls onSelect with the matching pokemon when Enter is pressed', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={onSelect} variant="console" />)

    await user.type(screen.getByPlaceholderText(/pikachu/i), 'pikachu')
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'pikachu' }))
  })

  it('calls onSelect when a result button is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={onSelect} variant="console" />)

    await user.type(screen.getByPlaceholderText(/pikachu/i), 'mewtwo')
    await user.click(screen.getByText(/mewtwo/i))

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'mewtwo' }))
  })

  it('clears the input after selection', async () => {
    const user = userEvent.setup()
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} variant="console" />)

    const input = screen.getByPlaceholderText(/pikachu/i)
    await user.type(input, 'pikachu')
    await user.keyboard('{Enter}')

    expect(input).toHaveValue('')
  })

  it('shows loading spinner in submit button when isLoading is true', () => {
    render(<PokemonSearch index={[]} isLoading={true} onSelect={vi.fn()} variant="console" />)
    expect(screen.queryByText('Ir')).not.toBeInTheDocument()
  })

  it('filters by generation chip', async () => {
    const user = userEvent.setup()
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} variant="console" />)

    await user.click(screen.getByText('2'))
    await user.type(screen.getByPlaceholderText(/pikachu/i), 'cha')

    expect(screen.queryByText(/charizard/i)).not.toBeInTheDocument()
  })

  // ── Generation chips ──────────────────────────────────────────────────────

  it('renders the "Todos" chip plus 9 generation chips', () => {
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} variant="console" />)
    const todos = screen.getByRole('button', { name: /Todos/i })
    expect(todos).toBeInTheDocument()
    for (let g = 1; g <= 9; g++) {
      expect(screen.getByRole('button', { name: new RegExp(`generación ${g}`, 'i') })).toBeInTheDocument()
    }
  })

  it('marks "Todos" as active by default', () => {
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} variant="console" />)
    const todos = screen.getByRole('button', { name: /Todos/i })
    expect(todos).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles a generation chip off when clicked twice', async () => {
    const user = userEvent.setup()
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} variant="console" />)

    const gen2 = screen.getByRole('button', { name: /generación 2/i })
    await user.click(gen2)
    expect(gen2).toHaveAttribute('aria-pressed', 'true')

    await user.click(gen2)
    expect(gen2).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows results when a generation filter is active even without query', async () => {
    const user = userEvent.setup()
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} variant="console" />)
    await user.click(screen.getByRole('button', { name: /generación 1/i }))
    expect(screen.getByRole('listbox', { name: /Resultados de búsqueda/i })).toBeInTheDocument()
  })

  it('shows a "no results" message when the query has no matches', async () => {
    const user = userEvent.setup()
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} variant="console" />)
    await user.type(screen.getByPlaceholderText(/pikachu/i), 'qqqzzz')
    expect(screen.getByText(/No encontré ese Pokémon/i)).toBeInTheDocument()
  })

  it('does not show the results listbox when query is empty and no filter selected', () => {
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} variant="console" />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('caps the visible results at 5', async () => {
    const big = Array.from({ length: 20 }, (_, i) => mk(i + 1, `mon${i}`, `Mon${i}`))
    const user = userEvent.setup()
    render(<PokemonSearch index={big} isLoading={false} onSelect={vi.fn()} variant="console" />)
    await user.type(screen.getByPlaceholderText(/pikachu/i), 'mon')
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(5)
  })
})

// ── Panel variant ────────────────────────────────────────────────────────────

describe('PokemonSearch (panel variant)', () => {
  it('renders the panel headline', () => {
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} />)
    expect(screen.getByText(/Buscar hasta Gen 9/)).toBeInTheDocument()
  })

  it('renders the first 8 pokémon by default when no query', () => {
    const big = Array.from({ length: 20 }, (_, i) => mk(i + 1, `mon${i}`, `Mon${i}`))
    render(<PokemonSearch index={big} isLoading={false} onSelect={vi.fn()} />)
    // 8 panel buttons + 1 submit "Buscar Pokémon" = 9
    expect(screen.getAllByRole('button', { name: /Buscar Mon/ })).toHaveLength(8)
  })

  it('shows the loading spinner instead of the search icon when isLoading is true', () => {
    const { container } = render(<PokemonSearch index={[]} isLoading onSelect={vi.fn()} />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('calls onSelect when a panel result is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: /Buscar Pikachu/i }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'pikachu' }))
  })

  it('shows the no-results banner in panel variant', async () => {
    const user = userEvent.setup()
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} />)
    await user.type(screen.getByPlaceholderText(/ninetales/i), 'zzzzzz')
    expect(screen.getByText(/No encontré ese Pokémon/i)).toBeInTheDocument()
  })

  it('labels mega/primal pokémon with "Mega" instead of generation', () => {
    const mega = [{ ...mk(10001, 'pikachu-mega', 'Mega Pikachu'), isMega: true }]
    render(<PokemonSearch index={mega} isLoading={false} onSelect={vi.fn()} />)
    expect(screen.getByText('Mega')).toBeInTheDocument()
  })
})
