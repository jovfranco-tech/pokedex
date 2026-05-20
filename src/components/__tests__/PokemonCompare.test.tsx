import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PokemonCompare } from '../PokemonCompare.tsx'
import type { PokemonDetail, PokemonIndexItem } from '../../services/pokeApi.ts'

// ── framer-motion mock (same pattern as ResultCard.test.tsx) ──────────────────
const { MotionArticle, MotionDiv, MotionP } = vi.hoisted(() => {
  const MOTION_PROPS = new Set([
    'animate', 'initial', 'exit', 'transition', 'variants',
    'whileHover', 'whileTap', 'whileFocus', 'layout', 'layoutId',
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const strip = (props: any): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(props as Record<string, unknown>)) {
      if (key !== 'children' && !MOTION_PROPS.has(key)) out[key] = (props as Record<string, unknown>)[key]
    }
    return out
  }
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MotionArticle: (props: any) => <article {...strip(props)}>{props.children}</article>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MotionDiv:     (props: any) => <div     {...strip(props)}>{props.children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MotionP:       (props: any) => <p       {...strip(props)}>{props.children}</p>,
  }
})

vi.mock('framer-motion', () => ({
  m: { article: MotionArticle, div: MotionDiv, p: MotionP },
  motion: { article: MotionArticle, div: MotionDiv, p: MotionP },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnimatePresence: ({ children }: { children: any }) => children,
  useReducedMotion: () => false,
}))

// Don't hit the network
vi.mock('../../services/pokeApi.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/pokeApi.ts')>()
  return {
    ...actual,
    fetchPokemonDetails: vi.fn(),
  }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mkIndex = (id: number, name: string): PokemonIndexItem => ({
  id, name, apiName: name, displayName: name,
  displayNumber: `#${String(id).padStart(4, '0')}`,
  generation: 1, isMega: false, isPrimal: false, sprite: '', aliases: [], searchText: name,
})

const PIKACHU: PokemonDetail = {
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: 'https://img/25.png',
  type: ['electric'],
  stats: [
    { key: 'hp',      name: 'PS',      value: 35 },
    { key: 'attack',  name: 'Ataque',  value: 55 },
    { key: 'defense', name: 'Defensa', value: 40 },
  ],
  matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
  gameAppearances: [], evolution: '', evolutionChain: [], attacks: [], abilities: [],
  weight: '', height: '', generation: 1, description: '',
  cryUrl: '', animatedSprite: '', baseExperience: 0,
  confidenceScore: 0, scannedAt: '', scanMode: 'búsqueda por texto',
  visualReason: '', dataVersion: 'v4',
  isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
  isRegional: false, isStarter: false, isUltraBeast: false,
  isParadox: false, isBaby: false,
}

const INDEX = [mkIndex(25, 'pikachu'), mkIndex(6, 'charizard'), mkIndex(1, 'bulbasaur')]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PokemonCompare', () => {
  it('renders the comparator header', () => {
    render(<PokemonCompare index={INDEX} />)
    expect(screen.getByText('Comparar Pokémon')).toBeInTheDocument()
  })

  it('renders two empty CompareCards when no pokémon are selected', () => {
    render(<PokemonCompare index={INDEX} />)
    expect(screen.getAllByText('Elige un Pokémon')).toHaveLength(2)
  })

  it('renders both picker labels (Pokémon A and Pokémon B)', () => {
    render(<PokemonCompare index={INDEX} />)
    expect(screen.getByText('Pokémon A')).toBeInTheDocument()
    expect(screen.getByText('Pokémon B')).toBeInTheDocument()
  })

  it('shows the initialPokemon in the first CompareCard', () => {
    render(<PokemonCompare index={INDEX} initialPokemon={PIKACHU} />)
    expect(screen.getByText('Pikachu')).toBeInTheDocument()
    expect(screen.getByAltText('Ilustración de Pikachu')).toBeInTheDocument()
    // Stats total = 35+55+40 = 130
    expect(screen.getByText(/130 stats totales/i)).toBeInTheDocument()
  })

  it('shows the strongest stat ("Mejor stat") for the initial pokémon', () => {
    render(<PokemonCompare index={INDEX} initialPokemon={PIKACHU} />)
    // Top stat among [35, 55, 40] is Ataque (55)
    expect(screen.getByText(/Mejor stat: Ataque \(55\)/i)).toBeInTheDocument()
  })

  it('still shows the empty placeholder on the opposite side when only one is loaded', () => {
    render(<PokemonCompare index={INDEX} initialPokemon={PIKACHU} />)
    expect(screen.getByText('Elige un Pokémon')).toBeInTheDocument()
  })

  it('does not show a winner banner when only one pokémon is selected', () => {
    render(<PokemonCompare index={INDEX} initialPokemon={PIKACHU} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('uses defaults when index is not provided', () => {
    render(<PokemonCompare />)
    expect(screen.getByText('Comparar Pokémon')).toBeInTheDocument()
  })
})
