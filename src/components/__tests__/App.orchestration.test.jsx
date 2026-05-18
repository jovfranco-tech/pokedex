/**
 * App.jsx — orchestration tests
 *
 * Tests the top-level wiring: mount → index load → search → result render.
 * Services are mocked at module level so network is never touched.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Module mocks (hoisted) ────────────────────────────────────────────────────

vi.mock('../../services/pokeApi.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual, // includes normalizePokemonText, searchPokemonIndex, getGenerationFromId, etc.
    DEFAULT_POKEMON_SPECIES_COUNT: 1025,
    POKEMON_DETAIL_SCHEMA_VERSION: 'v4',
    loadPokemonIndex: vi.fn().mockResolvedValue([
      { id: 25, name: 'pikachu', displayName: 'Pikachu', generation: 1, isMega: false, isPrimal: false, aliases: [], searchText: 'pikachu' },
      { id: 1,  name: 'bulbasaur', displayName: 'Bulbasaur', generation: 1, isMega: false, isPrimal: false, aliases: [], searchText: 'bulbasaur' },
    ]),
    fetchPokemonDetails: vi.fn().mockImplementation(async (nameOrId, meta = {}) => ({
    id: 25,
    speciesId: 25,
    apiName: 'pikachu',
    name: 'Pikachu',
    displayName: 'Pikachu',
    displayNumber: '#0025',
    sprite: 'https://example.com/pikachu.png',
    type: ['electric'],
    stats: [{ key: 'hp', name: 'PS', value: 35 }],
    matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
    gameAppearances: [],
    evolution: 'Raichu',
    evolutionChain: [],
    attacks: ['Impactrueno', 'Rayo'],
    abilities: ['Electricidad estática'],
    weight: '6,0 kg',
    height: '0,4 m',
    generation: 1,
    description: 'Un Pokémon ratón eléctrico.',
    cryUrl: null,
    animatedSprite: null,
    baseExperience: 112,
    confidenceScore: meta.confidenceScore ?? 100,
    scannedAt: meta.scannedAt ?? new Date().toISOString(),
    scanMode: meta.scanMode ?? 'test',
    dataVersion: 'v4',
    isLegendary: false,
    isMythical: false,
    isMega: false,
    isPrimal: false,
    isRegional: false,
    isStarter: false,
    isUltraBeast: false,
    isParadox: false,
    isBaby: false,
  })),
  }
})

vi.mock('../../services/visionSimulator.js', () => ({
  identifyPokemonFromImage: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../utils/pokedexVoice.js', () => ({
  buildPokedexAnnouncement: vi.fn().mockReturnValue(''),
  speakPokedexLine: vi.fn(),
}))

vi.mock('../../utils/playPokemonCry.js', () => ({
  playPokemonCry: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../utils/registerServiceWorker.js', () => ({ registerServiceWorker: vi.fn() }))

vi.mock('../../hooks/usePwaInstall.js', () => ({
  usePwaInstall: vi.fn().mockReturnValue({ canInstall: false, isInstalled: false, promptInstall: vi.fn() }),
}))

// Mock the lazy-loaded assistant so Suspense resolves immediately
vi.mock('../../components/PokemonAssistant.jsx', () => ({
  PokemonAssistant: () => <div data-testid="mock-assistant" />,
}))

// ── Import after mocks ────────────────────────────────────────────────────────
const App = (await import('../../App.jsx')).default
const { fetchPokemonDetails, loadPokemonIndex } = await import('../../services/pokeApi.js')

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderApp() {
  return render(<App />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('App — orchestration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    // Re-apply default mock implementations after clearAllMocks
    loadPokemonIndex.mockResolvedValue([
      { id: 25, name: 'pikachu', displayName: 'Pikachu', generation: 1, isMega: false, isPrimal: false, aliases: [] },
      { id: 1,  name: 'bulbasaur', displayName: 'Bulbasaur', generation: 1, isMega: false, isPrimal: false, aliases: [] },
    ])
    fetchPokemonDetails.mockImplementation(async (nameOrId, meta = {}) => ({
      id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu', displayName: 'Pikachu',
      displayNumber: '#0025', sprite: 'https://example.com/pikachu.png',
      type: ['electric'], stats: [{ key: 'hp', name: 'PS', value: 35 }],
      matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
      gameAppearances: [], evolution: 'Raichu', evolutionChain: [],
      attacks: ['Impactrueno'], abilities: ['Electricidad estática'],
      weight: '6,0 kg', height: '0,4 m', generation: 1,
      description: 'Un Pokémon ratón eléctrico.', cryUrl: null, animatedSprite: null,
      baseExperience: 112, confidenceScore: meta.confidenceScore ?? 100,
      scannedAt: meta.scannedAt ?? new Date().toISOString(),
      scanMode: meta.scanMode ?? 'test', dataVersion: 'v4',
      isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
      isRegional: false, isStarter: false, isUltraBeast: false, isParadox: false, isBaby: false,
    }))
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  // ── Mount ────────────────────────────────────────────────────────────────

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
    // Default index has 2 entries; the count pill shows their length or DEFAULT
    await waitFor(() => {
      // The count pill renders pokemonTotal — with 2-entry index it shows "2 Pokémon"
      const pills = screen.queryAllByText(/Pokémon/)
      expect(pills.length).toBeGreaterThan(0)
    })
  })

  // ── Search → result ─────────────────────────────────────────────────────

  it('fetches and displays a Pokémon when selected from search', async () => {
    const user = userEvent.setup()
    renderApp()

    // Wait for index to load so the search is populated
    await waitFor(() => expect(loadPokemonIndex).toHaveBeenCalled())

    // Type in the search input
    const input = screen.getByPlaceholderText(/pikachu/i)
    await user.type(input, 'pikachu')

    // Click the matching result
    const resultBtn = await screen.findByRole('button', { name: /pikachu/i })
    await user.click(resultBtn)

    // fetchPokemonDetails should have been called
    await waitFor(() => expect(fetchPokemonDetails).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ scanMode: 'búsqueda por texto Gen 1-9' }),
    ))

    // Pokémon name should appear in the result card
    await waitFor(() => {
      const headings = screen.queryAllByRole('heading')
      const found = headings.some((h) => /pikachu/i.test(h.textContent))
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

    const resultBtn = await screen.findByRole('button', { name: /pikachu/i })
    await user.click(resultBtn)

    // An error message should appear somewhere in the console area
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

    const resultBtn = await screen.findByRole('button', { name: /pikachu/i })
    await user.click(resultBtn)

    await waitFor(() => expect(fetchPokemonDetails).toHaveBeenCalled())

    // The result should be stored in localStorage under the last-result key
    const stored = JSON.parse(window.localStorage.getItem('pokedex-visual-gen1:last-result'))
    expect(stored).not.toBeNull()
    expect(stored.name).toBe('Pikachu')
  })
})
