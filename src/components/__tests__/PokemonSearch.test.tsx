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
})
