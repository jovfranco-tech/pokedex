import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScanActions } from '../useScanActions.ts'
import type { PokemonDetail, PokemonIndexItem } from '../../services/pokeApi.ts'

const mkDetail = (overrides: Partial<PokemonDetail> = {}): PokemonDetail => ({
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: '', type: ['electric'],
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

const mkIndexItem = (id: number, name: string): PokemonIndexItem => ({
  id, name, apiName: name, displayName: name,
  displayNumber: `#${String(id).padStart(4, '0')}`,
  generation: 1, isMega: false, isPrimal: false, sprite: '', aliases: [], searchText: name,
})

function makeParams(overrides: Partial<Parameters<typeof useScanActions>[0]> = {}) {
  return {
    isAutoNarrate: true,
    setResult: vi.fn(),
    rememberScan: vi.fn(),
    updateCollection: vi.fn(),
    narratePokemon: vi.fn(),
    fetchAndDisplay: vi.fn().mockResolvedValue(undefined),
    handleAnalyze: vi.fn().mockResolvedValue(undefined),
    setImageFile: vi.fn(),
    clearImage: vi.fn(),
    setError: vi.fn(),
    setScanCandidates: vi.fn(),
    ...overrides,
  }
}

describe('useScanActions', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── onFetchSuccess ────────────────────────────────────────────────────────

  it('onFetchSuccess updates state, history, collection and narrates when auto-narrate is on', () => {
    const params = makeParams({ isAutoNarrate: true })
    const { result } = renderHook(() => useScanActions(params))
    const detail = mkDetail()

    act(() => result.current.onFetchSuccess(detail))

    expect(params.setResult).toHaveBeenCalledWith(detail)
    expect(params.rememberScan).toHaveBeenCalledWith(detail)
    expect(params.updateCollection).toHaveBeenCalledWith(detail, 'seen')
    expect(params.narratePokemon).toHaveBeenCalledWith(detail)
  })

  it('onFetchSuccess does NOT narrate when auto-narrate is off', () => {
    const params = makeParams({ isAutoNarrate: false })
    const { result } = renderHook(() => useScanActions(params))

    act(() => result.current.onFetchSuccess(mkDetail()))

    expect(params.narratePokemon).not.toHaveBeenCalled()
    expect(params.setResult).toHaveBeenCalled()  // other side effects still happen
  })

  // ── handleImageSelected ───────────────────────────────────────────────────

  it('handleImageSelected clears the error then ignores a null file', () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))

    act(() => result.current.handleImageSelected(null))

    expect(params.setError).toHaveBeenCalledWith('')
    expect(params.handleAnalyze).not.toHaveBeenCalled()
    expect(params.setImageFile).not.toHaveBeenCalled()
  })

  it('handleImageSelected rejects non-image MIME types with a friendly error', () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))
    const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' })

    act(() => result.current.handleImageSelected(pdf))

    expect(params.setError).toHaveBeenCalledWith(
      'Ese archivo no parece una imagen. Prueba con una foto o captura.',
    )
    expect(params.handleAnalyze).not.toHaveBeenCalled()
    expect(params.setImageFile).not.toHaveBeenCalled()
  })

  it('handleImageSelected stores the file and analyzes it for valid images', () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))
    const png = new File(['x'], 'pikachu.png', { type: 'image/png' })

    act(() => result.current.handleImageSelected(png))

    expect(params.setImageFile).toHaveBeenCalledWith(png)
    expect(params.handleAnalyze).toHaveBeenCalledWith(png, expect.objectContaining({
      onSuccess: expect.any(Function),
      onNotFound: expect.any(Function),
    }))
  })

  it('handleImageSelected.onNotFound clears the previous result', () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))
    const png = new File(['x'], 'unknown.png', { type: 'image/png' })

    act(() => result.current.handleImageSelected(png))
    const opts = vi.mocked(params.handleAnalyze).mock.calls[0][1]
    act(() => opts?.onNotFound?.())

    expect(params.setResult).toHaveBeenCalledWith(null)
  })

  // ── handlePokemonSelected ─────────────────────────────────────────────────

  it('handlePokemonSelected uses the search-text scan mode', async () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))
    const item = mkIndexItem(25, 'pikachu')

    await act(async () => { await result.current.handlePokemonSelected(item) })

    expect(params.fetchAndDisplay).toHaveBeenCalledWith(
      25,
      expect.objectContaining({ confidenceScore: 100, scanMode: 'búsqueda por texto Gen 1-9' }),
      expect.stringContaining('No encontré ese Pokémon'),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  // ── handleHistorySelected ─────────────────────────────────────────────────

  it('handleHistorySelected forwards the saved confidenceScore', async () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))

    await act(async () => {
      await result.current.handleHistorySelected({ apiName: 'pikachu', id: 25, confidenceScore: 88 })
    })

    expect(params.fetchAndDisplay).toHaveBeenCalledWith(
      'pikachu',
      expect.objectContaining({ confidenceScore: 88, scanMode: 'historial familiar' }),
      expect.any(String),
      expect.any(Object),
    )
  })

  it('handleHistorySelected defaults confidenceScore to 100 when missing', async () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))

    await act(async () => {
      await result.current.handleHistorySelected({ apiName: 'pikachu', id: 25 })
    })

    expect(vi.mocked(params.fetchAndDisplay).mock.calls[0][1].confidenceScore).toBe(100)
  })

  // ── handleFavoriteSelected & handleCollectionSelected ─────────────────────

  it('handleFavoriteSelected uses the favorito scan mode', async () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))

    await act(async () => {
      await result.current.handleFavoriteSelected({ apiName: 'pikachu', id: 25 })
    })

    expect(params.fetchAndDisplay).toHaveBeenCalledWith(
      'pikachu',
      expect.objectContaining({ scanMode: 'favorito familiar' }),
      expect.any(String),
      expect.any(Object),
    )
  })

  it('handleCollectionSelected is an alias of handleFavoriteSelected', () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))
    expect(result.current.handleCollectionSelected).toBe(result.current.handleFavoriteSelected)
  })

  // ── handleScanCandidateSelected ───────────────────────────────────────────

  it('handleScanCandidateSelected uses corrección scan mode and keeps candidates', async () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))

    await act(async () => {
      await result.current.handleScanCandidateSelected({
        apiName: 'charizard', id: 6, confidenceScore: 72, reason: 'Orange dragon',
      })
    })

    expect(params.fetchAndDisplay).toHaveBeenCalledWith(
      'charizard',
      expect.objectContaining({
        confidenceScore: 72,
        scanMode: 'corrección del usuario',
        visualReason: 'Orange dragon',
      }),
      expect.any(String),
      expect.objectContaining({ keepCandidates: true }),
    )
  })

  // ── handleReset ───────────────────────────────────────────────────────────

  it('handleReset clears image preview, error and scan candidates', () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))

    act(() => result.current.handleReset())

    expect(params.clearImage).toHaveBeenCalled()
    expect(params.setError).toHaveBeenCalledWith('')
    expect(params.setScanCandidates).toHaveBeenCalledWith([])
  })

  // ── Fallback paths ───────────────────────────────────────────────────────

  it('uses the numeric id for history when apiName is missing', async () => {
    const params = makeParams()
    const { result } = renderHook(() => useScanActions(params))

    await act(async () => { await result.current.handleHistorySelected({ id: 150 }) })

    expect(params.fetchAndDisplay).toHaveBeenCalledWith(
      150, expect.any(Object), expect.any(String), expect.any(Object),
    )
  })
})
