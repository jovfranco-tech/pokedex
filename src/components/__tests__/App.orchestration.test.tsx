/**
 * App.tsx — orchestration tests
 *
 * Tests the top-level wiring: mount → index load → search → result render.
 * Services are mocked at module level so network is never touched.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Module mocks (hoisted) ────────────────────────────────────────────────────

vi.mock('../../services/pokeApi.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/pokeApi.ts')>()
  return {
    ...actual,
    DEFAULT_POKEMON_SPECIES_COUNT: 1025,
    POKEMON_DETAIL_SCHEMA_VERSION: 'v4',
    loadPokemonIndex: vi.fn().mockResolvedValue([
      { id: 25, name: 'pikachu',   apiName: 'pikachu',   displayName: 'Pikachu',   displayNumber: '#0025', generation: 1, isMega: false, isPrimal: false, sprite: '', aliases: [], searchText: 'pikachu' },
      { id: 1,  name: 'bulbasaur', apiName: 'bulbasaur', displayName: 'Bulbasaur', displayNumber: '#0001', generation: 1, isMega: false, isPrimal: false, sprite: '', aliases: [], searchText: 'bulbasaur' },
    ]),
    fetchPokemonDetails: vi.fn().mockImplementation(async (_nameOrId: unknown, meta: Record<string, unknown> = {}) => ({
      id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
      baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
      sprite: 'https://example.com/pikachu.png', animatedSprite: '', cryUrl: '',
      type: ['electric'], stats: [{ key: 'hp', name: 'PS', value: 35 }],
      matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
      gameAppearances: [], evolution: 'Raichu', evolutionChain: [],
      attacks: ['Impactrueno', 'Rayo'], abilities: ['Electricidad estática'],
      weight: '6,0 kg', height: '0,4 m', generation: 1,
      description: 'Un Pokémon ratón eléctrico.', baseExperience: 112,
      confidenceScore: (meta['confidenceScore'] as number | undefined) ?? 100,
      scannedAt: (meta['scannedAt'] as string | undefined) ?? new Date().toISOString(),
      scanMode: (meta['scanMode'] as string | undefined) ?? 'test',
      visualReason: '', dataVersion: 'v4',
      isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
      isRegional: false, isStarter: false, isUltraBeast: false, isParadox: false, isBaby: false,
    })),
  }
})

vi.mock('../../services/visionSimulator.ts', () => ({
  identifyPokemonFromImage: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../utils/pokedexVoice.ts', () => ({
  buildPokedexAnnouncement: vi.fn().mockReturnValue(''),
  speakPokedexLine: vi.fn(),
}))

vi.mock('../../utils/playPokemonCry.ts', () => ({
  playPokemonCry: vi.fn().mockResolvedValue(undefined),
  unlockAudio: vi.fn(),
}))

vi.mock('../../utils/registerServiceWorker.ts', () => ({
  registerServiceWorker: vi.fn(),
  onSwUpdate: vi.fn(() => vi.fn()),
  applySwUpdate: vi.fn(),
}))

vi.mock('../../hooks/usePwaInstall.ts', () => ({
  usePwaInstall: vi.fn().mockReturnValue({ canInstall: false, isInstalled: false, promptInstall: vi.fn() }),
}))

// Mock the lazy-loaded assistant so Suspense resolves immediately
vi.mock('../../components/PokemonAssistant.tsx', () => ({
  PokemonAssistant: () => <div data-testid="mock-assistant" />,
}))

// ── Import after mocks ────────────────────────────────────────────────────────
const App = (await import('../../App.tsx')).default
const mod = await import('../../services/pokeApi.ts')
const fetchPokemonDetails = vi.mocked(mod.fetchPokemonDetails)
const loadPokemonIndex = vi.mocked(mod.loadPokemonIndex)

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderApp() {
  return render(<App />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('App — orchestration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState(null, '', '/')  // reset URL between tests so deep-link guard doesn't fire
    vi.clearAllMocks()
    // Re-apply default mock implementations after clearAllMocks
    loadPokemonIndex.mockResolvedValue([
      { id: 25, name: 'pikachu',   apiName: 'pikachu',   displayName: 'Pikachu',   displayNumber: '#0025', generation: 1, isMega: false, isPrimal: false, sprite: '', aliases: [], searchText: 'pikachu' },
      { id: 1,  name: 'bulbasaur', apiName: 'bulbasaur', displayName: 'Bulbasaur', displayNumber: '#0001', generation: 1, isMega: false, isPrimal: false, sprite: '', aliases: [], searchText: 'bulbasaur' },
    ])
    fetchPokemonDetails.mockImplementation(async (_nameOrId, meta = {}) => ({
      id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
      baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
      sprite: 'https://example.com/pikachu.png', animatedSprite: '', cryUrl: '',
      type: ['electric'], stats: [{ key: 'hp', name: 'PS', value: 35 }],
      matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
      gameAppearances: [], evolution: 'Raichu', evolutionChain: [],
      attacks: ['Impactrueno'], abilities: ['Electricidad estática'],
      weight: '6,0 kg', height: '0,4 m', generation: 1,
      description: 'Un Pokémon ratón eléctrico.', baseExperience: 112,
      confidenceScore: (meta as Record<string, unknown>)['confidenceScore'] as number ?? 100,
      scannedAt: (meta as Record<string, unknown>)['scannedAt'] as string ?? new Date().toISOString(),
      scanMode: (meta as Record<string, unknown>)['scanMode'] as string ?? 'test',
      visualReason: '', dataVersion: 'v4',
      isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
      isRegional: false, isStarter: false, isUltraBeast: false, isParadox: false, isBaby: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any)
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  // ── Mount ────────────────────────────────────────────────────────────

  it('renders without crashing and shows the empty state heading', async () => {
    renderApp()
    await waitFor(() => expect(screen.getByText('POKÉDEX IA')).toBeInTheDocument())
  })

  it('calls loadPokemonIndex on mount', async () => {
    renderApp()
    await waitFor(() => expect(loadPokemonIndex).toHaveBeenCalledTimes(1))
  })

  it('populates the Pokémon count from the loaded index', async () => {
    renderApp()
    await waitFor(() => {
      const pills = screen.queryAllByText(/Pokémon/)
      expect(pills.length).toBeGreaterThan(0)
    })
  })

  // ── Search → result ─────────────────────────────────────────────────────

  it('fetches and displays a Pokémon when selected from search', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => expect(loadPokemonIndex).toHaveBeenCalled())

    const input = screen.getByPlaceholderText(/pikachu/i)
    await user.type(input, 'pikachu')

    const resultBtn = await screen.findByRole('option', { name: /pikachu/i })
    await user.click(resultBtn)

    await waitFor(() => expect(fetchPokemonDetails).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ scanMode: 'búsqueda por texto Gen 1-9' }),
    ))

    await waitFor(() => {
      const headings = screen.queryAllByRole('heading')
      const found = headings.some((h) => /pikachu/i.test(h.textContent ?? ''))
      expect(found).toBe(true)
    })
  })

  // ── Error state ──────────────────────────────────────────────────────────

  it('shows an error message when fetchPokemonDetails rejects', async () => {
    fetchPokemonDetails.mockRejectedValueOnce(new Error('HTTP 404'))
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => expect(loadPokemonIndex).toHaveBeenCalled())

    const input = screen.getByPlaceholderText(/pikachu/i)
    await user.type(input, 'pikachu')

    const resultBtn = await screen.findByRole('option', { name: /pikachu/i })
    await user.click(resultBtn)

    await waitFor(() => {
      const errEl = screen.queryByText(/no encontré|prueba|algo salió/i)
      expect(errEl).not.toBeNull()
    })
  })

  // ── Favorites ────────────────────────────────────────────────────────────

  it('persists a Pokémon to localStorage after a successful fetch', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => expect(loadPokemonIndex).toHaveBeenCalled())

    const input = screen.getByPlaceholderText(/pikachu/i)
    await user.type(input, 'pikachu')

    const resultBtn = await screen.findByRole('option', { name: /pikachu/i })
    await user.click(resultBtn)

    await waitFor(() => expect(fetchPokemonDetails).toHaveBeenCalled())

    const stored = JSON.parse(window.localStorage.getItem('pokedex-visual-gen1:last-result') ?? 'null')
    expect(stored).not.toBeNull()
    expect(stored.name).toBe('Pikachu')
  })
})
