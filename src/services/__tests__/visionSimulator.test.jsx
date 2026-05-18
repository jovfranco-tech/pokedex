import { describe, expect, it, vi } from 'vitest'

// Isolate from network and PokeAPI imports
vi.mock('../../services/pokeApi.js', () => ({
  loadPokemonIndex:    vi.fn().mockResolvedValue([]),
  normalizePokemonText: (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ' ').trim(),
  searchPokemonIndex:  vi.fn().mockReturnValue([]),
  fetchPokemonDetails: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../utils/imageDataUrl.js', () => ({
  fileToModelImageDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
}))

const { scoreImageNameMatch } = await import('../../services/visionSimulator.js')

const makePokemon = (id, name, displayName, aliases = []) => ({
  id, name, displayName, aliases,
})

// ── scoreImageNameMatch ───────────────────────────────────────────────────────

describe('scoreImageNameMatch', () => {
  it('gives near-perfect score when file token matches name exactly', () => {
    const pikachu = makePokemon(25, 'pikachu', 'Pikachu')
    expect(scoreImageNameMatch(pikachu, ['pikachu'], 'pikachu')).toBe(99)
  })

  it('gives high score on compact name substring match', () => {
    const charizard = makePokemon(6, 'charizard', 'Charizard')
    const score = scoreImageNameMatch(charizard, ['charizard'], 'charizard')
    expect(score).toBeGreaterThanOrEqual(98)
  })

  it('gives prefix-based score when only prefix matches (≥4 chars)', () => {
    const bulbasaur = makePokemon(1, 'bulbasaur', 'Bulbasaur')
    const score = scoreImageNameMatch(bulbasaur, ['bulba'], 'bulba')
    expect(score).toBeGreaterThanOrEqual(90)
  })

  it('returns 0 when tokens have no match', () => {
    const bulbasaur = makePokemon(1, 'bulbasaur', 'Bulbasaur')
    expect(scoreImageNameMatch(bulbasaur, ['totally', 'unrelated'], 'totallyunrelated')).toBe(0)
  })

  it('matches via alias', () => {
    const nidoran = makePokemon(29, 'nidoran-f', 'Nidoran♀', ['nidoranf', 'nidoranfemale'])
    const score = scoreImageNameMatch(nidoran, ['nidoranfemale'], 'nidoranfemale')
    expect(score).toBeGreaterThanOrEqual(88)
  })

  it('score is in 0–100 range', () => {
    const mewtwo = makePokemon(150, 'mewtwo', 'Mewtwo')
    const score = scoreImageNameMatch(mewtwo, ['mewtwo'], 'mewtwo')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
