import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultCard } from '../ResultCard.tsx'

// vi.hoisted runs before vi.mock hoisting, so these refs are available in the factory.
const { MotionDiv, MotionSection, MotionSpan } = vi.hoisted(() => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MotionSpan:    (props: any) => <span    {...strip(props)}>{props.children}</span>,
  }
})

vi.mock('framer-motion', () => ({
  m: { div: MotionDiv, section: MotionSection, span: MotionSpan },
  motion: { div: MotionDiv, section: MotionSection, span: MotionSpan },
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

  it('renders 4 tabs (Info/Matchups/Juegos/Arte) in normal mode', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} />, { wrapper: Wrapper })
    expect(screen.getAllByRole('tab')).toHaveLength(4)
  })

  it('switches to Juegos tab and shows the debut row', async () => {
    const user = userEvent.setup()
    const pokemon = { ...pikachuResult, gameAppearances: ['Red', 'Blue'] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pokemon as any} />, { wrapper: Wrapper })

    await user.click(screen.getByRole('tab', { name: /juegos/i }))
    expect(screen.getByText('Debut')).toBeInTheDocument()
  })

  it('marks the favorite button with the active class when isFavorite is true', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} isFavorite />, { wrapper: Wrapper })
    const favButton = screen.getByRole('button', { name: /quitar.*favoritos/i })
    expect(favButton.className).toContain('profile-favorite-button-active')
  })

  it('uses the "Agregar a favoritos" aria-label when not favorite', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} />, { wrapper: Wrapper })
    expect(screen.getByRole('button', { name: /agregar.*favoritos/i })).toBeInTheDocument()
  })

  it('shows "Narrando…" label when isSpeaking is true', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} isSpeaking />, { wrapper: Wrapper })
    expect(screen.getByText('Narrando…')).toBeInTheDocument()
  })

  it('disables the Sonido button when cryUrl is empty', () => {
    const noCry = { ...pikachuResult, cryUrl: '' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={noCry as any} />, { wrapper: Wrapper })
    const soundBtn = screen.getByRole('button', { name: /sonido/i })
    expect(soundBtn).toBeDisabled()
  })

  it('enables the Sonido button when cryUrl is present', () => {
    const withCry = { ...pikachuResult, cryUrl: 'https://cries/25.ogg' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={withCry as any} />, { wrapper: Wrapper })
    expect(screen.getByRole('button', { name: /sonido/i })).not.toBeDisabled()
  })

  it('calls onMarkSeen with the pokémon when Visto button is clicked', async () => {
    const onMarkSeen = vi.fn()
    const user = userEvent.setup()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} onMarkSeen={onMarkSeen} />, { wrapper: Wrapper })
    await user.click(screen.getByRole('button', { name: 'Visto' }))
    expect(onMarkSeen).toHaveBeenCalledOnce()
  })

  it('calls onMarkCaptured with the pokémon when Capturado button is clicked', async () => {
    const onMarkCaptured = vi.fn()
    const user = userEvent.setup()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} onMarkCaptured={onMarkCaptured} />, { wrapper: Wrapper })
    await user.click(screen.getByRole('button', { name: 'Capturado' }))
    expect(onMarkCaptured).toHaveBeenCalledOnce()
  })

  it('highlights Visto as active when collectionEntry.seenAt is set', () => {
    const entry = { seenAt: '2024-01-01', capturedAt: undefined }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} collectionEntry={entry as any} />, { wrapper: Wrapper })
    expect(screen.getByRole('button', { name: 'Visto' }).className).toContain('profile-collection-button-active')
  })

  it('highlights Capturado as active when collectionEntry.capturedAt is set', () => {
    const entry = { seenAt: '2024-01-01', capturedAt: '2024-01-02' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} collectionEntry={entry as any} />, { wrapper: Wrapper })
    expect(screen.getByRole('button', { name: 'Capturado' }).className).toContain('profile-collection-button-active')
  })

  it('shows the visual reason when scanMode includes "visual" and visualReason is present', () => {
    const visual = { ...pikachuResult, scanMode: 'escaneo visual', visualReason: 'Forma redonda amarilla' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={visual as any} />, { wrapper: Wrapper })
    expect(screen.getByText('Forma redonda amarilla')).toBeInTheDocument()
  })

  it('shows feedback thumbs-up/down only when scanMode includes "visual"', () => {
    const visual = { ...pikachuResult, scanMode: 'escaneo visual' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={visual as any} />, { wrapper: Wrapper })
    expect(screen.getByRole('button', { name: /identificación correcta/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /identificación incorrecta/i })).toBeInTheDocument()
  })

  it('does not show feedback row when scanMode is text search', () => {
    const text = { ...pikachuResult, scanMode: 'búsqueda por texto' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={text as any} />, { wrapper: Wrapper })
    expect(screen.queryByRole('button', { name: /identificación correcta/i })).not.toBeInTheDocument()
  })

  it('calls onFeedback("correct") when thumbs-up is clicked', async () => {
    const onFeedback = vi.fn()
    const user = userEvent.setup()
    const visual = { ...pikachuResult, scanMode: 'escaneo visual' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={visual as any} onFeedback={onFeedback} />, { wrapper: Wrapper })

    await user.click(screen.getByRole('button', { name: /identificación correcta/i }))
    expect(onFeedback).toHaveBeenCalledWith('correct')
  })

  it('calls onFeedback("wrong") when thumbs-down is clicked', async () => {
    const onFeedback = vi.fn()
    const user = userEvent.setup()
    const visual = { ...pikachuResult, scanMode: 'escaneo visual' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={visual as any} onFeedback={onFeedback} />, { wrapper: Wrapper })

    await user.click(screen.getByRole('button', { name: /identificación incorrecta/i }))
    expect(onFeedback).toHaveBeenCalledWith('wrong')
  })

  it('shows form label badge when result has a formLabel', () => {
    const mega = { ...pikachuResult, formLabel: 'Mega' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={mega as any} />, { wrapper: Wrapper })
    expect(screen.getByText('Mega')).toBeInTheDocument()
  })

  it('shows the legendary badge when isLegendary is true', () => {
    const legendary = { ...pikachuResult, isLegendary: true }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={legendary as any} />, { wrapper: Wrapper })
    expect(screen.getByText('Legendario')).toBeInTheDocument()
  })

  it('shows the mythical badge when isMythical is true', () => {
    const mythical = { ...pikachuResult, isMythical: true }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={mythical as any} />, { wrapper: Wrapper })
    expect(screen.getByText('Mítico')).toBeInTheDocument()
  })

  it('shows category badges for special pokémon (Mega/Inicial/etc.)', () => {
    const special = { ...pikachuResult, isMega: true, isStarter: true }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={special as any} />, { wrapper: Wrapper })
    expect(screen.getByText('Mega')).toBeInTheDocument()
    expect(screen.getByText('Inicial')).toBeInTheDocument()
  })

  it('shows the confidence score', () => {
    const conf = { ...pikachuResult, confidenceScore: 88 }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={conf as any} />, { wrapper: Wrapper })
    expect(screen.getByText('88%')).toBeInTheDocument()
  })

  it('renders the quick summary including types and top stat', () => {
    const conf = {
      ...pikachuResult,
      stats: [
        { key: 'hp', name: 'PS', value: 35 },
        { key: 'speed', name: 'Velocidad', value: 90 },
      ],
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={conf as any} />, { wrapper: Wrapper })
    expect(screen.getByText(/Su stat más alto es Velocidad/i)).toBeInTheDocument()
  })
})

describe('ResultCard — kids mode', () => {
  it('renders only Info and Arte tabs when isKidsMode is true', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<ResultCard {...defaultProps} result={pikachuResult as any} isKidsMode />, { wrapper: Wrapper })
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(tabs.map((t) => t.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Info'), expect.stringContaining('Arte')]))
  })
})
