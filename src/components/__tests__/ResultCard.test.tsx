import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultCard } from '../ResultCard.tsx'

// vi.hoisted runs before vi.mock hoisting, so these refs are available in the factory.
const { MotionDiv, MotionSection } = vi.hoisted(() => {
  const MOTION_PROPS = new Set([
    'animate', 'initial', 'exit', 'transition', 'variants', 'whileHover',
    'whileTap', 'whileFocus', 'layout', 'layoutId', 'onAnimationComplete', 'onUpdate',
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const strip = (props: any): any => {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(props as Record<string, unknown>)) {
      if (key !== 'children' && !MOTION_PROPS.has(key)) out[key] = (props as Record<string, unknown>)[key]
    }
    return out
  }
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MotionDiv:     (props: any) => <div     {...strip(props)}>{props.children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MotionSection: (props: any) => <section {...strip(props)}>{props.children}</section>,
  }
})

vi.mock('framer-motion', () => ({
  m: { div: MotionDiv, section: MotionSection },
  motion: { div: MotionDiv, section: MotionSection },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnimatePresence: ({ children }: { children: any }) => children,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  LazyMotion: ({ children }: { children: any }) => children,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MotionConfig: ({ children }: { children: any }) => children,
  domAnimation: {},
  useReducedMotion: () => false,
  useAnimation: () => ({}),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Wrapper({ children }: { children: any }) { return children }

const defaultProps = {
  result: null,
  isScanning: false,
  isSpeaking: false,
  isKidsMode: false,
  isFavorite: false,
  feedback: null,
  collectionEntry: null,
  pokemonTotal: 1025,
  onFeedback: vi.fn(),
  onMarkCaptured: vi.fn(),
  onMarkSeen: vi.fn(),
  onSpeakPokedex: vi.fn(),
  onToggleFavorite: vi.fn(),
}

const pikachuResult = {
  id: 25,
  name: 'Pikachu',
  apiName: 'pikachu',
  number: '#025',
  type: ['Electric'],
  height: '0.4 m',
  weight: '6.0 kg',
  category: 'Ratón',
  generation: 'I',
  description: 'Un Pokémon eléctrico famoso.',
  cryUrl: null,
  isMega: false,
  isPrimal: false,
  isRegional: false,
  isStarter: false,
  isUltraBeast: false,
  isParadox: false,
  isBaby: false,
  isMythical: false,
  isLegendary: false,
  confidence: 0.95,
  hp: 35,
  attack: 55,
  defense: 40,
  spAtk: 50,
  spDef: 50,
  speed: 90,
  games: ['Red', 'Blue', 'Yellow'],
  moves: ['Thunderbolt', 'Quick Attack'],
  matchups: {
    vulnerabilities: [{ type: 'Ground', multiplier: 2 }],
    resistances: [{ type: 'Steel', multiplier: 0.5 }, { type: 'Flying', multiplier: 0.5 }],
    immunities: [],
    effectiveAgainst: [{ type: 'Water', multiplier: 2 }],
    weakAgainst: [{ type: 'Dragon', multiplier: 0.5 }],
  },
}

describe('ResultCard — empty state', () => {
  it('shows the POKÉDEX IA heading when there is no result', () => {
    render(<ResultCard {...defaultProps} />, { wrapper: Wrapper })
    expect(screen.getByRole('heading', { name: /pokédex ia/i })).toBeInTheDocument()
  })

  it('shows the tagline', () => {
    render(<ResultCard {...defaultProps} />, { wrapper: Wrapper })
    expect(screen.getByText(/cuál encontrarás hoy/i)).toBeInTheDocument()
  })

  it('shows action pills with scan / search / chat hints', () => {
    render(<ResultCard {...defaultProps} />, { wrapper: Wrapper })
    expect(screen.getByText(/escanear imagen/i)).toBeInTheDocument()
    expect(screen.getByText(/buscar por nombre/i)).toBeInTheDocument()
    expect(screen.getByText(/chat ia/i)).toBeInTheDocument()
  })

  it('shows pokémon count in the subtitle', () => {
    render(<ResultCard {...defaultProps} pokemonTotal={1302} />, { wrapper: Wrapper })
    expect(screen.getByText(/1302/)).toBeInTheDocument()
  })
})

describe('ResultCard — scanning state', () => {
  it('shows the scanning message when isScanning is true', () => {
    render(<ResultCard {...defaultProps} isScanning />, { wrapper: Wrapper })
    expect(screen.getByRole('heading', { name: /analizando imagen/i })).toBeInTheDocument()
  })

  it('does not show POKÉDEX IA heading while scanning', () => {
    render(<ResultCard {...defaultProps} isScanning />, { wrapper: Wrapper })
    expect(screen.queryByRole('heading', { name: /pokédex ia/i })).not.toBeInTheDocument()
  })
})

describe('ResultCard — pokémon result', () => {
  it('shows the pokémon name', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} />, { wrapper: Wrapper })
    expect(screen.getByRole('heading', { name: /pikachu/i })).toBeInTheDocument()
  })

  it('shows the pokémon number', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} />, { wrapper: Wrapper })
    expect(screen.getByText(/#025/i)).toBeInTheDocument()
  })

  it('shows the type badge (localised label)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} />, { wrapper: Wrapper })
    const badges = screen.getAllByText(/eléctrico/i)
    expect(badges.length).toBeGreaterThan(0)
  })

  it('calls onSpeakPokedex when the narrate button is clicked', async () => {
    const onSpeakPokedex = vi.fn()
    const user = userEvent.setup()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} onSpeakPokedex={onSpeakPokedex} />, { wrapper: Wrapper })

    const speakButton = screen.getByRole('button', { name: /narrar/i })
    await user.click(speakButton)

    expect(onSpeakPokedex).toHaveBeenCalledOnce()
  })

  it('calls onToggleFavorite when the favorite button is clicked', async () => {
    const onToggleFavorite = vi.fn()
    const user = userEvent.setup()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} onToggleFavorite={onToggleFavorite} />, { wrapper: Wrapper })

    const favButton = screen.getByRole('button', { name: /favorito/i })
    await user.click(favButton)

    expect(onToggleFavorite).toHaveBeenCalledOnce()
  })

  it('shows the description in the Info tab', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} />, { wrapper: Wrapper })
    expect(screen.getByText(/pokémon eléctrico/i)).toBeInTheDocument()
  })

  it('switches to Matchups tab and shows type matchup data', async () => {
    const user = userEvent.setup()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} />, { wrapper: Wrapper })

    const matchupsTab = screen.getByRole('tab', { name: /matchups/i })
    await user.click(matchupsTab)

    expect(matchupsTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/vulnerabilidades/i)).toBeInTheDocument()
  })
})
