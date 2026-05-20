import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pokemon3DStage } from '../Pokemon3DStage.tsx'
import type { PokemonDetail } from '../../services/pokeApi.ts'

const mk = (overrides: Partial<PokemonDetail> = {}): PokemonDetail => ({
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: 'https://img/25.png', type: ['electric'],
  stats: [], matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
  gameAppearances: [], evolution: '', evolutionChain: [], attacks: [], abilities: [],
  weight: '', height: '', generation: 1, description: '',
  cryUrl: '', animatedSprite: '', baseExperience: 0,
  confidenceScore: 100, scannedAt: '', scanMode: 'búsqueda por texto',
  visualReason: '', dataVersion: 'v4',
  isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
  isRegional: false, isStarter: false, isUltraBeast: false,
  isParadox: false, isBaby: false,
  ...overrides,
})

describe('Pokemon3DStage', () => {
  it('renders the stage with the pokémon name in the aria-label', () => {
    render(<Pokemon3DStage pokemon={mk()} />)
    expect(screen.getByLabelText('Animación 3D de Pikachu')).toBeInTheDocument()
  })

  it('renders the holographic sprite with descriptive alt text', () => {
    render(<Pokemon3DStage pokemon={mk()} />)
    expect(screen.getByAltText('Holograma 3D de Pikachu')).toBeInTheDocument()
  })

  it('applies the type-specific motion class for electric', () => {
    const { container } = render(<Pokemon3DStage pokemon={mk({ type: ['electric'] })} />)
    expect(container.querySelector('.stage-motion-electric')).toBeInTheDocument()
  })

  it('applies the type-specific motion class for fire', () => {
    const { container } = render(<Pokemon3DStage pokemon={mk({ type: ['fire'] })} />)
    expect(container.querySelector('.stage-motion-fire')).toBeInTheDocument()
  })

  it('applies the type-specific motion class for water', () => {
    const { container } = render(<Pokemon3DStage pokemon={mk({ type: ['water'] })} />)
    expect(container.querySelector('.stage-motion-water')).toBeInTheDocument()
  })

  it('falls back to the mystic motion class for unknown types', () => {
    const { container } = render(<Pokemon3DStage pokemon={mk({ type: ['unknown-type'] })} />)
    expect(container.querySelector('.stage-motion-mystic')).toBeInTheDocument()
  })

  it('falls back to "normal" type when type array is empty', () => {
    const { container } = render(<Pokemon3DStage pokemon={mk({ type: [] })} />)
    expect(container.querySelector('.pokemon-3d-normal')).toBeInTheDocument()
  })

  it('renders the animated sprite extra layer only when animatedSprite is empty', () => {
    const { container, rerender } = render(<Pokemon3DStage pokemon={mk({ animatedSprite: '' })} />)
    expect(container.querySelector('.pokemon-3d-motion-sprite')).toBeInTheDocument()

    rerender(<Pokemon3DStage pokemon={mk({ animatedSprite: 'https://img/anim.gif' })} />)
    expect(container.querySelector('.pokemon-3d-motion-sprite')).not.toBeInTheDocument()
  })

  it('adds the animated-sprite class to the main image when animatedSprite is present', () => {
    render(<Pokemon3DStage pokemon={mk({ animatedSprite: 'https://img/anim.gif' })} />)
    const mainImg = screen.getByAltText('Holograma 3D de Pikachu')
    expect(mainImg.className).toContain('pokemon-animated-sprite')
  })

  it('prefers animatedSprite over sprite as the stage image source when available', () => {
    render(<Pokemon3DStage pokemon={mk({ sprite: 'https://img/static.png', animatedSprite: 'https://img/anim.gif' })} />)
    const mainImg = screen.getByAltText('Holograma 3D de Pikachu') as HTMLImageElement
    expect(mainImg.src).toContain('anim.gif')
  })

  it('uses the static sprite when no animatedSprite is provided', () => {
    render(<Pokemon3DStage pokemon={mk({ sprite: 'https://img/static.png', animatedSprite: '' })} />)
    const mainImg = screen.getByAltText('Holograma 3D de Pikachu') as HTMLImageElement
    expect(mainImg.src).toContain('static.png')
  })

  it('sanitizes type names with non-alphanumeric characters before lookup', () => {
    const { container } = render(<Pokemon3DStage pokemon={mk({ type: ['Fire!'] })} />)
    // "Fire!" → "fire" → stage-motion-fire
    expect(container.querySelector('.stage-motion-fire')).toBeInTheDocument()
  })

  it('updates the tilt CSS variables on pointer move', () => {
    const { container } = render(<Pokemon3DStage pokemon={mk()} />)
    const shell = container.querySelector('.pokemon-3d-shell') as HTMLDivElement

    // Stub the bounding box so the math is predictable
    shell.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 200,
      width: 200, height: 200, toJSON: () => '',
    })
    fireEvent.pointerMove(shell, { clientX: 150, clientY: 150 })

    expect(shell.style.getPropertyValue('--light-x')).toBe('75%')
    expect(shell.style.getPropertyValue('--light-y')).toBe('75%')
  })

  it('resets the tilt to neutral on pointer leave', () => {
    const { container } = render(<Pokemon3DStage pokemon={mk()} />)
    const shell = container.querySelector('.pokemon-3d-shell') as HTMLDivElement

    shell.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 200,
      width: 200, height: 200, toJSON: () => '',
    })
    fireEvent.pointerMove(shell, { clientX: 180, clientY: 20 })
    fireEvent.pointerLeave(shell)

    expect(shell.style.getPropertyValue('--light-x')).toBe('58%')
    expect(shell.style.getPropertyValue('--light-y')).toBe('34%')
    expect(shell.style.getPropertyValue('--tilt-x')).toBe('-7deg')
    expect(shell.style.getPropertyValue('--tilt-y')).toBe('10deg')
  })

  it('renders 10 stage particles and 8 type-burst items', () => {
    const { container } = render(<Pokemon3DStage pokemon={mk()} />)
    expect(container.querySelectorAll('.stage-particle')).toHaveLength(10)
    expect(container.querySelectorAll('.stage-type-burst span')).toHaveLength(8)
  })
})
