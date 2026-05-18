import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PokemonSearch } from '../PokemonSearch.jsx'

const sampleIndex = [
  { id: 1,   name: 'bulbasaur',  displayName: 'Bulbasaur',  generation: 1, isMega: false, isPrimal: false, aliases: [], searchText: 'bulbasaur' },
  { id: 6,   name: 'charizard', displayName: 'Charizard',  generation: 1, isMega: false, isPrimal: false, aliases: [], searchText: 'charizard' },
  { id: 25,  name: 'pikachu',   displayName: 'Pikachu',    generation: 1, isMega: false, isPrimal: false, aliases: [], searchText: 'pikachu' },
  { id: 150, name: 'mewtwo',    displayName: 'Mewtwo',     generation: 1, isMega: false, isPrimal: false, aliases: [], searchText: 'mewtwo' },
  { id: 152, name: 'chikorita', displayName: 'Chikorita',  generation: 2, isMega: false, isPrimal: false, aliases: [], searchText: 'chikorita' },
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
    // The Loader2 icon replaces "Ir" when loading
    expect(screen.queryByText('Ir')).not.toBeInTheDocument()
  })

  it('filters by generation chip', async () => {
    const user = userEvent.setup()
    render(<PokemonSearch index={sampleIndex} isLoading={false} onSelect={vi.fn()} variant="console" />)

    // Filter to Gen 2 — only chikorita should appear in results
    await user.click(screen.getByText('2'))
    await user.type(screen.getByPlaceholderText(/pikachu/i), 'cha')

    // charizard is Gen 1, should be hidden
    expect(screen.queryByText(/charizard/i)).not.toBeInTheDocument()
  })
})
