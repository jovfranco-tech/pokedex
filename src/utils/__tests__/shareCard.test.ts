import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sharePokemonCard } from '../shareCard.ts'
import type { PokemonDetail } from '../../services/pokeApi.ts'

// ── Fixture ───────────────────────────────────────────────────────────────────

const mkResult = (overrides: Partial<PokemonDetail> = {}): PokemonDetail => ({
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: 'https://img/25.png', type: ['Electric'],
  stats: [], matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
  gameAppearances: [], evolution: '', evolutionChain: [], attacks: [], abilities: [],
  weight: '', height: '', generation: 1,
  description: 'Un Pokémon ratón eléctrico.',
  cryUrl: '', animatedSprite: '', baseExperience: 0,
  confidenceScore: 100, scannedAt: '', scanMode: 'búsqueda por texto',
  visualReason: '', dataVersion: 'v4',
  isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
  isRegional: false, isStarter: false, isUltraBeast: false,
  isParadox: false, isBaby: false,
  ...overrides,
})

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockCtx() {
  return {
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: '' as string | CanvasGradient | CanvasPattern,
    font: '',
  }
}

/** Stubs Image so onload fires synchronously (after setTimeout 0) */
function stubImage() {
  vi.stubGlobal('Image', class MockImage {
    crossOrigin = ''
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_val: string) {
      setTimeout(() => this.onload?.(), 0)
    }
  })
}

/** Creates a canvas mock that calls toBlob with the given blob */
function makeCanvasMock(ctx: ReturnType<typeof makeMockCtx>, blob: Blob | null) {
  const originalCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      const canvas = originalCreate('canvas') as HTMLCanvasElement
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.getContext = vi.fn(() => ctx) as any
      canvas.toBlob = vi.fn((cb: BlobCallback) => setTimeout(() => cb(blob), 0))
      return canvas
    }
    if (tag === 'a') {
      const a = originalCreate('a') as HTMLAnchorElement
      a.click = vi.fn()
      return a
    }
    return originalCreate(tag)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ── Download fallback ─────────────────────────────────────────────────────────

describe('sharePokemonCard — download fallback (no navigator.share)', () => {
  beforeEach(() => {
    stubImage()
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true, writable: true })
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  it('triggers anchor click to download the image', async () => {
    const ctx = makeMockCtx()
    const clickFn = vi.fn()
    const originalCreate = document.createElement.bind(document)

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const canvas = originalCreate('canvas') as HTMLCanvasElement
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvas.getContext = vi.fn(() => ctx) as any
        canvas.toBlob = vi.fn((cb: BlobCallback) => setTimeout(() => cb(new Blob(['png'])), 0))
        return canvas
      }
      if (tag === 'a') {
        const a = originalCreate('a') as HTMLAnchorElement
        a.click = clickFn
        return a
      }
      return originalCreate(tag)
    })

    await sharePokemonCard(mkResult())
    expect(clickFn).toHaveBeenCalledOnce()
  })

  it('revokes the object URL after download', async () => {
    const ctx = makeMockCtx()
    makeCanvasMock(ctx, new Blob(['png'], { type: 'image/png' }))

    await sharePokemonCard(mkResult())
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('sets download attribute to pokemon name + .png', async () => {
    const ctx = makeMockCtx()
    const originalCreate = document.createElement.bind(document)
    let capturedAnchor: HTMLAnchorElement | null = null

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const canvas = originalCreate('canvas') as HTMLCanvasElement
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvas.getContext = vi.fn(() => ctx) as any
        canvas.toBlob = vi.fn((cb: BlobCallback) => setTimeout(() => cb(new Blob(['png'])), 0))
        return canvas
      }
      if (tag === 'a') {
        const a = originalCreate('a') as HTMLAnchorElement
        a.click = vi.fn()
        capturedAnchor = a
        return a
      }
      return originalCreate(tag)
    })

    await sharePokemonCard(mkResult({ name: 'Charizard' }))
    expect((capturedAnchor as HTMLAnchorElement | null)?.download).toBe('Charizard.png')
  })

  it('rejects when toBlob returns null', async () => {
    const ctx = makeMockCtx()
    makeCanvasMock(ctx, null)

    await expect(sharePokemonCard(mkResult())).rejects.toThrow('No se pudo generar la imagen')
  })

  it('rejects when canvas 2D context is unavailable', async () => {
    const originalCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const canvas = originalCreate('canvas') as HTMLCanvasElement
        canvas.getContext = vi.fn(() => null)
        return canvas
      }
      return originalCreate(tag)
    })

    await expect(sharePokemonCard(mkResult())).rejects.toThrow('Canvas 2D context not available')
  })
})

// ── navigator.share path ──────────────────────────────────────────────────────

describe('sharePokemonCard — navigator.share path', () => {
  let shareSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    stubImage()
    shareSpy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true, writable: true })
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true, writable: true })
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
  })

  it('calls navigator.share with title, text, and the png file', async () => {
    const ctx = makeMockCtx()
    makeCanvasMock(ctx, new Blob(['png'], { type: 'image/png' }))

    await sharePokemonCard(mkResult())

    expect(shareSpy).toHaveBeenCalledOnce()
    const shareArg = shareSpy.mock.calls[0][0] as { title: string; files: File[] }
    expect(shareArg.title).toContain('Pikachu')
    expect(shareArg.files).toHaveLength(1)
    expect(shareArg.files[0].name).toBe('Pikachu.png')
  })
})
