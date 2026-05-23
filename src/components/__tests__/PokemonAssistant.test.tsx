import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PokemonAssistant } from '../PokemonAssistant.tsx'
import type { PokemonDetail } from '../../services/pokeApi.ts'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../services/pokemonAiChat.js', () => ({
  askPokemonAssistant: vi.fn(),
}))

vi.mock('../../utils/pokedexVoice.js', () => ({
  speakPokedexLine: vi.fn(),
}))

import { askPokemonAssistant } from '../../services/pokemonAiChat.ts'
import { speakPokedexLine } from '../../utils/pokedexVoice.ts'

const mkPokemon = (overrides: Partial<PokemonDetail> = {}): PokemonDetail => ({
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: 'https://img/25.png', type: ['Electric'],
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(askPokemonAssistant).mockResolvedValue({
    answer: 'Respuesta de prueba',
    source: 'local',
  })
})

// ── Welcome screen ───────────────────────────────────────────────────────────

describe('PokemonAssistant — welcome screen', () => {
  it('shows the welcome hello text when no question has been asked', () => {
    render(<PokemonAssistant pokemon={null} />)
    expect(screen.getByText(/Hola/i)).toBeInTheDocument()
    expect(screen.getByText(/Pokédex IA/i)).toBeInTheDocument()
  })

  it('mentions the selected pokémon name in the welcome', () => {
    render(<PokemonAssistant pokemon={mkPokemon()} />)
    expect(screen.getByText(/Pikachu/)).toBeInTheDocument()
  })

  it('shows the fallback question buttons', () => {
    render(<PokemonAssistant pokemon={null} />)
    expect(screen.getByRole('button', { name: /Este Pokémon es legendario/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Qué Pokémon son míticos/i })).toBeInTheDocument()
  })

  it('shows the microphone hint button', () => {
    render(<PokemonAssistant pokemon={null} />)
    expect(screen.getByRole('button', { name: /micrófono/i })).toBeInTheDocument()
  })

  it('shows the "Chat IA local" header when no chat is in progress', () => {
    render(<PokemonAssistant pokemon={null} />)
    expect(screen.getByText('Chat IA local')).toBeInTheDocument()
  })
})

// ── Asking a question ────────────────────────────────────────────────────────

describe('PokemonAssistant — submitting questions', () => {
  it('submits the typed question and shows the answer', async () => {
    const user = userEvent.setup()
    render(<PokemonAssistant pokemon={mkPokemon()} />)

    await user.type(screen.getByPlaceholderText(/Pikachu/i), 'es legendario?')
    await user.click(screen.getByRole('button', { name: /Preguntar/i }))

    expect(askPokemonAssistant).toHaveBeenCalledWith('es legendario?', expect.objectContaining({ name: 'Pikachu' }), [])
    // Wait for the answer to be revealed by the typewriter effect
    await waitFor(() => {
      expect(screen.getByText(/Respuesta de prueba/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('replays a fallback question when its chip is clicked', async () => {
    const user = userEvent.setup()
    render(<PokemonAssistant pokemon={null} />)

    await user.click(screen.getByRole('button', { name: /Este Pokémon es legendario/i }))
    expect(askPokemonAssistant).toHaveBeenCalledWith('¿Este Pokémon es legendario?', null, [])
  })

  it('shows "Chat IA real" header when source is openai', async () => {
    vi.mocked(askPokemonAssistant).mockResolvedValue({
      answer: 'IA real',
      source: 'openai',
      model: 'gpt-4o',
    })
    const user = userEvent.setup()
    render(<PokemonAssistant pokemon={mkPokemon()} />)

    await user.click(screen.getByRole('button', { name: /Este Pokémon es legendario/i }))
    await waitFor(() => expect(screen.getByText('Chat IA real')).toBeInTheDocument())
  })

  it('switches from welcome to dialogue once a question is asked', async () => {
    const user = userEvent.setup()
    render(<PokemonAssistant pokemon={null} />)

    await user.click(screen.getByRole('button', { name: /Este Pokémon es legendario/i }))
    // The fallback questions should be gone (dialogue mode)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Qué Pokémon son míticos/i })).toBeNull()
    })
  })

  it('does not submit an empty question on form submit', async () => {
    const user = userEvent.setup()
    render(<PokemonAssistant pokemon={null} />)

    await user.click(screen.getByRole('button', { name: /Preguntar/i }))
    expect(askPokemonAssistant).not.toHaveBeenCalled()
  })

  it('clears the dialogue when the Trash button is clicked', async () => {
    const user = userEvent.setup()
    render(<PokemonAssistant pokemon={null} />)
    await user.click(screen.getByRole('button', { name: /Este Pokémon es legendario/i }))
    await waitFor(() => expect(screen.getByText(/Respuesta de prueba/i)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Limpiar conversación/i }))
    // Back to welcome
    expect(screen.getByText(/Hola/i)).toBeInTheDocument()
  })
})

// ── Speech / voice features ──────────────────────────────────────────────────

describe('PokemonAssistant — voice features', () => {
  let originalSR: typeof window.SpeechRecognition
  let originalWebkitSR: typeof window.webkitSpeechRecognition

  beforeEach(() => {
    originalSR = window.SpeechRecognition
    originalWebkitSR = window.webkitSpeechRecognition
  })

  function restoreSpeech() {
    window.SpeechRecognition = originalSR
    window.webkitSpeechRecognition = originalWebkitSR
  }

  it('shows a friendly error when SpeechRecognition is unavailable', () => {
    window.SpeechRecognition = undefined
    window.webkitSpeechRecognition = undefined

    render(<PokemonAssistant pokemon={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Dictar pregunta/i }))

    expect(screen.getByText(/Este navegador no permite dictado/i)).toBeInTheDocument()
    restoreSpeech()
  })

  it('toggles the auto-narrate button on click', async () => {
    const user = userEvent.setup()
    render(<PokemonAssistant pokemon={null} />)

    const autoBtn = screen.getByRole('button', { name: /Activar lectura automática/i })
    await user.click(autoBtn)
    expect(screen.getByRole('button', { name: /Desactivar lectura automática/i })).toBeInTheDocument()
  })

  it('calls speakPokedexLine when the speaker button is clicked after an answer', async () => {
    const user = userEvent.setup()
    render(<PokemonAssistant pokemon={null} />)

    await user.click(screen.getByRole('button', { name: /Este Pokémon es legendario/i }))
    await waitFor(() => expect(screen.getByText(/Respuesta de prueba/i)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Leer respuesta/i }))
    expect(speakPokedexLine).toHaveBeenCalledWith('Respuesta de prueba', expect.objectContaining({ withBeep: true }))
  })

  it('disables the Leer respuesta button when no answer yet', () => {
    render(<PokemonAssistant pokemon={null} />)
    expect(screen.getByRole('button', { name: /Leer respuesta/i })).toBeDisabled()
  })
})
