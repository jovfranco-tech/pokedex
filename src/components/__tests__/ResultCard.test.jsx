import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultCard } from '../ResultCard.jsx'

// vi.hoisted runs before vi.mock hoisting, so these refs are available in the factory.
const { MotionDiv, MotionSection } = vi.hoisted(() => {
  const MOTION_PROPS = new Set([
    'animate', 'initial', 'exit', 'transition', 'variants', 'whileHover',
    'whileTap', 'whileFocus', 'layout', 'layoutId', 'onAnimationComplete', 'onUpdate',
  ])
  const strip = (props) => {
    const out = {}
    for (const key of Object.keys(props)) {
      if (key !== 'children' && !MOTION_PROPS.has(key)) out[key] = props[key]
    }
    return out
  }
  return {
    MotionDiv:     (props) => <div {...strip(props)}>{props.children}</div>,
    MotionSection: (props) => <section {...strip(props)}>{props.children}</section>,
  }
})

vi.mock('framer-motion', () => ({
  m: { div: MotionDiv, section: MotionSection },
  motion: { div: MotionDiv, section: MotionSection },
  AnimatePresence: ({ children }) => children,
  LazyMotion: ({ children }) => children,
  MotionConfig: ({ children }) => children,
  domAnimation: {},
  useReducedMotion: () => false,
  useAnimation: () => ({}),
}))

function Wrapper({ children }) { return children }

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
    render(<ResultCard {...defaultProps} result={pikachuResult} />, { wrapper: Wrapper })
    expect(screen.getByRole('heading', { name: /pikachu/i })).toBeInTheDocument()
  })

  it('shows the pokémon number', () => {
    render(<ResultCard {...defaultProps} result={pikachuResult} />, { wrapper: Wrapper })
    expect(screen.getByText(/#025/i)).toBeInTheDocument()
  })

  it('shows the type badge (localised label)', () => {
    render(<ResultCard {...defaultProps} result={pikachuResult} />, { wrapper: Wrapper })
    // TypeBadge translates "Electric" → "Eléctrico"; getAllByText because it may appear in type chip + badge
    const badges = screen.getAllByText(/eléctrico/i)
    expect(badges.length).toBeGreaterThan(0)
  })

  it('calls onSpeakPokedex when the narrate button is clicked', async () => {
    const onSpeakPokedex = vi.fn()
    const user = userEvent.setup()
    render(<ResultCard {...defaultProps} result={pikachuResult} onSpeakPokedex={onSpeakPokedex} />, { wrapper: Wrapper })

    const speakButton = screen.getByRole('button', { name: /narrar/i })
    await user.click(speakButton)

    expect(onSpeakPokedex).toHaveBeenCalledOnce()
  })

  it('calls onToggleFavorite when the favorite button is clicked', async () => {
    const onToggleFavorite = vi.fn()
    const user = userEvent.setup()
    render(<ResultCard {...defaultProps} result={pikachuResult} onToggleFavorite={onToggleFavorite} />, { wrapper: Wrapper })

    const favButton = screen.getByRole('button', { name: /favorito/i })
    await user.click(favButton)

    expect(onToggleFavorite).toHaveBeenCalledOnce()
  })

  it('shows the description in the Info tab', () => {
    render(<ResultCard {...defaultProps} result={pikachuResult} />, { wrapper: Wrapper })
    expect(screen.getByText(/pokémon eléctrico/i)).toBeInTheDocument()
  })

  it('switches to Matchups tab and shows type matchup data', async () => {
    const user = userEvent.setup()
    render(<ResultCard {...defaultProps} result={pikachuResult} />, { wrapper: Wrapper })

    const matchupsTab = screen.getByRole('tab', { name: /matchups/i })
    await user.click(matchupsTab)

    // After clicking, the tab should be marked active
    expect(matchupsTab).toHaveAttribute('aria-selected', 'true')
    // TypeMatchups renders Vulnerabilidades group heading
    expect(screen.getByText(/vulnerabilidades/i)).toBeInTheDocument()
  })
})
