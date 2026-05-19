/**
 * playPokemonCry — real module integration tests.
 *
 * These tests exercise the ACTUAL playPokemonCry.js module (not a mock) with
 * faked AudioContext + fetch. Their purpose: catch the class of regression
 * where the real audio path breaks (CSP URL change, API rename, etc.) while
 * all other tests stay green because they mock the module away.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock AudioContext factory ──────────────────────────────────────────────────

function makeMockCtx({ state = 'running' } = {}) {
  const source = {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    _onended: null,
  }
  // Fire onended immediately so the returned Promise resolves fast in tests
  Object.defineProperty(source, 'onended', {
    set(fn) { this._onended = fn; if (fn) setTimeout(fn, 0) },
    get() { return this._onended },
  })

  const gain = { gain: { value: 1 }, connect: vi.fn() }

  const ctx = {
    _source: source,
    _gain: gain,
    state,
    createBuffer: vi.fn(() => ({})),
    createBufferSource: vi.fn(() => source),
    createGain: vi.fn(() => gain),
    decodeAudioData: vi.fn(async () => ({})),
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
  }
  return ctx
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('playPokemonCry — real module', () => {
  beforeEach(() => {
    vi.resetModules() // fresh _ctx singleton per test
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the cry URL and decodes + plays it via Web Audio API', async () => {
    const ctx = makeMockCtx()
    vi.stubGlobal('AudioContext', function MockAudioContext() { return ctx })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
    }))

    const { playPokemonCry } = await import('../playPokemonCry.js')
    await playPokemonCry('https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/25.ogg')

    expect(fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/25.ogg',
    )
    expect(ctx.decodeAudioData).toHaveBeenCalled()
    expect(ctx._source.start).toHaveBeenCalled()
  })

  it('returns early without calling fetch when cryUrl is empty', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const { playPokemonCry } = await import('../playPokemonCry.js')
    await playPokemonCry('')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns early without calling fetch when cryUrl is undefined', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const { playPokemonCry } = await import('../playPokemonCry.js')
    await playPokemonCry(undefined)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('resolves without throwing when fetch returns a non-OK response', async () => {
    const ctx = makeMockCtx()
    vi.stubGlobal('AudioContext', function MockAudioContext() { return ctx })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    const { playPokemonCry } = await import('../playPokemonCry.js')
    await expect(
      playPokemonCry('https://example.com/cry.ogg'),
    ).resolves.toBeUndefined()
    expect(ctx.decodeAudioData).not.toHaveBeenCalled()
  })

  it('respects the volume parameter (clamps to [0,1])', async () => {
    const ctx = makeMockCtx()
    vi.stubGlobal('AudioContext', function MockAudioContext() { return ctx })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    }))

    const { playPokemonCry } = await import('../playPokemonCry.js')
    await playPokemonCry('https://example.com/cry.ogg', 1.5) // > 1, should clamp to 1

    expect(ctx._gain.gain.value).toBe(1)
  })

  it('warns instead of crashing when AudioContext stays suspended', async () => {
    const ctx = makeMockCtx({ state: 'suspended' })
    vi.stubGlobal('AudioContext', function MockAudioContext() { return ctx })
    vi.stubGlobal('fetch', vi.fn())
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.useFakeTimers()
    const { playPokemonCry } = await import('../playPokemonCry.js')
    const p = playPokemonCry('https://example.com/cry.ogg')
    // Advance past the 1500ms deadline the module uses
    await vi.runAllTimersAsync()
    vi.advanceTimersByTime(2_000)
    await vi.runAllTimersAsync()
    await p
    vi.useRealTimers()

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('AudioContext not running'),
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})
