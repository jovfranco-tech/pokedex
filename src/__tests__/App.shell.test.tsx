import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks (must be hoisted; vi.mock + vi.hoisted patterns) ───────────────────

const { MotionDiv, MotionSection, MotionSpan, MotionButton } = vi.hoisted(() => {
  const MOTION_PROPS = new Set([
    'animate', 'initial', 'exit', 'transition', 'variants',
    'whileHover', 'whileTap', 'whileFocus', 'layout', 'layoutId',
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const strip = (props: any): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(props as Record<string, unknown>)) {
      if (k !== 'children' && !MOTION_PROPS.has(k)) out[k] = (props as Record<string, unknown>)[k]
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MotionButton:  (props: any) => <button  {...strip(props)}>{props.children}</button>,
  }
})

vi.mock('framer-motion', () => ({
  m: { div: MotionDiv, section: MotionSection, span: MotionSpan, article: MotionDiv, p: MotionDiv, button: MotionButton, img: MotionDiv },
  motion: { div: MotionDiv, section: MotionSection, span: MotionSpan, article: MotionDiv, p: MotionDiv, button: MotionButton, img: MotionDiv },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnimatePresence: ({ children }: { children: any }) => children,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  LazyMotion:     ({ children }: { children: any }) => children,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MotionConfig:   ({ children }: { children: any }) => children,
  domAnimation: {},
  useReducedMotion: () => false,
  useAnimation: () => ({}),
}))

// PokemonAssistant is lazy-loaded by App; mock it so tests don't have to await Suspense
vi.mock('../components/PokemonAssistant.js', () => ({
  PokemonAssistant: () => <div data-testid="mock-assistant">PokemonAssistant placeholder</div>,
}))

// Don't hit the network: pokeApi.loadPokemonIndex resolves to empty array
vi.mock('../services/pokeApi.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/pokeApi.ts')>()
  return {
    ...actual,
    loadPokemonIndex: vi.fn().mockResolvedValue([]),
    fetchPokemonDetails: vi.fn(),
  }
})

// SW utilities — stub so tests don't pull virtual:pwa-register
vi.mock('../utils/registerServiceWorker.js', () => ({
  registerServiceWorker: vi.fn(),
  onSwUpdate: vi.fn(() => vi.fn()),
  applySwUpdate: vi.fn(),
}))

// Voice utils are noisy — stub them
vi.mock('../utils/pokedexVoice.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/pokedexVoice.ts')>()
  return {
    ...actual,
    speakPokedexLine: vi.fn(),
  }
})

import App from '../App.tsx'

beforeEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
})

// ── Initial render ────────────────────────────────────────────────────────────

describe('App — initial render', () => {
  it('renders the Pokédex IA heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: /Pokédex IA/i })).toBeInTheDocument()
  })

  it('renders the skip-to-content link', () => {
    render(<App />)
    expect(screen.getByText(/Saltar al resultado/i)).toBeInTheDocument()
  })

  it('renders the empty-state Pokédex card with action pills', () => {
    render(<App />)
    expect(screen.getByText(/Escanear imagen/i)).toBeInTheDocument()
    expect(screen.getByText(/Buscar por nombre/i)).toBeInTheDocument()
    // "Chat IA" is the action pill in ResultCard
    expect(screen.getByText(/Chat IA/i)).toBeInTheDocument()
  })

  it('renders the search input', () => {
    render(<App />)
    expect(screen.getByPlaceholderText(/Pikachu/i)).toBeInTheDocument()
  })

  it('renders the camera/upload buttons', () => {
    render(<App />)
    expect(screen.getByLabelText(/Abrir cámara/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Subir imagen/i)).toBeInTheDocument()
  })

  it('renders the Quiz and Pokédex IA action buttons', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /^Quiz$/ })).toBeInTheDocument()
    // Multiple "Pokédex IA" elements exist; ensure at least the chat-launch button is there
    const aiButtons = screen.getAllByText(/Pokédex IA/)
    expect(aiButtons.length).toBeGreaterThan(0)
  })

  it('renders the 3 status-bar LEDs', () => {
    const { container } = render(<App />)
    expect(container.querySelectorAll('.console-led')).toHaveLength(3)
  })

  it('shows the pokemonTotal count pill', () => {
    const { container } = render(<App />)
    const pill = container.querySelector('.console-count-pill')
    expect(pill?.textContent).toMatch(/\d+ Pokémon/)
  })
})

// ── Mode toggles ──────────────────────────────────────────────────────────────

describe('App — quick action toggles', () => {
  it('toggles kids mode when the Niños button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    const kidsBtn = screen.getByRole('button', { name: /Activar modo niños/i })
    expect(kidsBtn).toHaveAttribute('aria-pressed', 'false')

    await user.click(kidsBtn)
    expect(screen.getByRole('button', { name: /Desactivar modo niños/i }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('persists kids mode to localStorage', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Activar modo niños/i }))
    expect(window.localStorage.getItem('pokedex-visual-gen1:kids-mode')).toBe('true')
  })

  it('toggles auto-narrate', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Default is now false → button label says "Activar"
    const btn = screen.getByRole('button', { name: /Activar narración automática/i })
    await user.click(btn)
    expect(screen.getByRole('button', { name: /Desactivar narración automática/i })).toBeInTheDocument()
  })

  it('persists auto-narrate to localStorage', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Default is off; clicking activates it → localStorage becomes 'true'
    await user.click(screen.getByRole('button', { name: /Activar narración automática/i }))
    expect(window.localStorage.getItem('pokedex-visual-gen1:auto-narrate')).toBe('true')
  })
})

// ── Modals ────────────────────────────────────────────────────────────────────

describe('App — Pokédex IA modal', () => {
  /** The console-ai-button launcher with text "Pokédex IA". */
  function findAssistantLauncher(container: HTMLElement): HTMLButtonElement {
    const launchers = Array.from(container.querySelectorAll('button.console-ai-button')) as HTMLButtonElement[]
    const match = launchers.find((b) => /Pokédex IA/.test(b.textContent ?? ''))
    if (!match) throw new Error('Assistant launcher button not found')
    return match
  }

  it('opens the assistant modal when the Pokédex IA button is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(findAssistantLauncher(container))

    expect(screen.getByRole('dialog', { name: /Pokédex IA/i })).toBeInTheDocument()
    // Lazy-loaded component → wait for Suspense to resolve
    expect(await screen.findByTestId('mock-assistant')).toBeInTheDocument()
  })

  it('closes the assistant modal when X is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(findAssistantLauncher(container))
    expect(screen.getByRole('dialog', { name: /Pokédex IA/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Cerrar Pokédex IA/i }))
    expect(screen.queryByRole('dialog', { name: /Pokédex IA/i })).not.toBeInTheDocument()
  })

  it('shows the speak-greeting button inside the assistant modal', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(findAssistantLauncher(container))
    expect(screen.getByRole('button', { name: /Leer saludo/i })).toBeInTheDocument()
  })
})

describe('App — Quiz modal', () => {
  it('opens the quiz modal when the Quiz button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^Quiz$/ }))
    expect(screen.getByRole('dialog', { name: /Quiz Pokémon/i })).toBeInTheDocument()
  })
})

// ── Status bar ────────────────────────────────────────────────────────────────

describe('App — status bar', () => {
  it('shows "Listo para escanear" when there is no scan yet', () => {
    render(<App />)
    expect(screen.getByText(/Listo para escanear/i)).toBeInTheDocument()
  })
})

// ── PWA install ──────────────────────────────────────────────────────────────

describe('App — PWA install', () => {
  it('does not render the Instalar button by default (canInstall=false in jsdom)', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: /Instalar aplicación/i })).not.toBeInTheDocument()
  })
})
