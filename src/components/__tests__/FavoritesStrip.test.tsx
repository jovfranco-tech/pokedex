import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FavoritesStrip } from '../FavoritesStrip.tsx'
import type { FavoriteEntry } from '../../hooks/useCollection.ts'

const mkFav = (id: number, name: string): FavoriteEntry => ({
  id,
  speciesId: id,
  apiName: name.toLowerCase(),
  name,
  displayNumber: `#${String(id).padStart(4, '0')}`,
  sprite: `https://img/${id}.png`,
  type: 'normal',
  formLabel: '',
  savedAt: new Date().toISOString(),
})

describe('FavoritesStrip', () => {
  it('renders the empty state when favorites is empty', () => {
    render(<FavoritesStrip favorites={[]} />)
    expect(screen.getByText(/Marca favoritos/i)).toBeInTheDocument()
  })

  it('renders the empty state when favorites is undefined', () => {
    render(<FavoritesStrip />)
    expect(screen.getByText(/Marca favoritos/i)).toBeInTheDocument()
  })

  it('renders one card per favorite', () => {
    const favs = [mkFav(25, 'Pikachu'), mkFav(6, 'Charizard')]
    render(<FavoritesStrip favorites={favs} />)
    expect(screen.getByLabelText('Abrir favorito Pikachu')).toBeInTheDocument()
    expect(screen.getByLabelText('Abrir favorito Charizard')).toBeInTheDocument()
  })

  it('calls onSelect with the favorite when its card is clicked', () => {
    const onSelect = vi.fn()
    const fav = mkFav(25, 'Pikachu')
    render(<FavoritesStrip favorites={[fav]} onSelect={onSelect} />)
    fireEvent.click(screen.getByLabelText('Abrir favorito Pikachu'))
    expect(onSelect).toHaveBeenCalledWith(fav)
  })

  it('does not crash when onSelect is not provided', () => {
    const fav = mkFav(25, 'Pikachu')
    render(<FavoritesStrip favorites={[fav]} />)
    expect(() => fireEvent.click(screen.getByLabelText('Abrir favorito Pikachu'))).not.toThrow()
  })

  it('falls back to the empty state when favorites is not an array', () => {
    // simulate malformed localStorage data slipping through
    render(<FavoritesStrip favorites={null as unknown as FavoriteEntry[]} />)
    expect(screen.getByText(/Marca favoritos/i)).toBeInTheDocument()
  })
})
