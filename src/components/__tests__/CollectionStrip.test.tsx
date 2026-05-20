import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CollectionStrip } from '../CollectionStrip.tsx'
import type { CollectionEntry } from '../../hooks/useCollection.ts'

const mkEntry = (id: number, name: string, overrides: Partial<CollectionEntry> = {}): CollectionEntry => ({
  id,
  speciesId: id,
  apiName: name.toLowerCase(),
  name,
  displayNumber: `#${String(id).padStart(4, '0')}`,
  sprite: `https://img/${id}.png`,
  type: 'normal',
  ...overrides,
})

describe('CollectionStrip', () => {
  it('renders the empty state when collection is empty', () => {
    render(<CollectionStrip collection={[]} />)
    expect(screen.getByText(/Busca o escanea/i)).toBeInTheDocument()
  })

  it('renders the empty state when collection is undefined', () => {
    render(<CollectionStrip />)
    expect(screen.getByText(/Busca o escanea/i)).toBeInTheDocument()
  })

  it('counts seen and captured separately', () => {
    const items: CollectionEntry[] = [
      mkEntry(1, 'Bulbasaur', { seenAt: '2024-01-01' }),
      mkEntry(4, 'Charmander', { seenAt: '2024-01-02', capturedAt: '2024-01-02' }),
      mkEntry(7, 'Squirtle', { seenAt: '2024-01-03', capturedAt: '2024-01-03' }),
    ]
    render(<CollectionStrip collection={items} />)
    // 3 seen, 2 captured
    expect(screen.getByText('3').parentElement?.textContent).toMatch(/vistos/)
    expect(screen.getByText('2').parentElement?.textContent).toMatch(/capturados/)
  })

  it('adds the captured class for captured pokémon', () => {
    const items = [mkEntry(25, 'Pikachu', { seenAt: 'x', capturedAt: 'y' })]
    render(<CollectionStrip collection={items} />)
    const card = screen.getByLabelText('Abrir Pikachu (capturado)')
    expect(card.className).toContain('collection-card-captured')
  })

  it('shows only "Abrir <name>" label for non-captured entries', () => {
    const items = [mkEntry(1, 'Bulbasaur', { seenAt: 'x' })]
    render(<CollectionStrip collection={items} />)
    expect(screen.getByLabelText('Abrir Bulbasaur')).toBeInTheDocument()
  })

  it('caps the list at 18 entries', () => {
    const items = Array.from({ length: 25 }, (_, i) => mkEntry(i + 1, `Mon${i + 1}`, { seenAt: 'x' }))
    render(<CollectionStrip collection={items} />)
    const cards = screen.getAllByRole('button')
    expect(cards).toHaveLength(18)
  })

  it('calls onSelect with the entry when its card is clicked', () => {
    const onSelect = vi.fn()
    const entry = mkEntry(25, 'Pikachu', { seenAt: 'x' })
    render(<CollectionStrip collection={[entry]} onSelect={onSelect} />)
    fireEvent.click(screen.getByLabelText('Abrir Pikachu'))
    expect(onSelect).toHaveBeenCalledWith(entry)
  })

  it('falls back to the empty state when collection is not an array', () => {
    render(<CollectionStrip collection={null as unknown as CollectionEntry[]} />)
    expect(screen.getByText(/Busca o escanea/i)).toBeInTheDocument()
  })
})
