/**
 * Pokémon cry playback via Web Audio API.
 *
 * We CANNOT use new Audio(url) because the CSP media-src directive does not
 * allow raw.githubusercontent.com. Instead we fetch the audio data (connect-src
 * does allow it) and decode it with AudioContext.decodeAudioData — no media-src
 * restriction applies to this path.
 *
 * Usage:
 *   1. Call unlockAudio() synchronously at the top of every user-gesture handler
 *      (before any await). This resumes the AudioContext while the browser still
 *      considers the event trusted.
 *   2. Call playPokemonCry(url) any time after — from a gesture handler or from a
 *      useEffect. It polls briefly for the context to be running, then fetches,
 *      decodes and plays.
 */

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

let _ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext!)()
  return _ctx
}

/**
 * Resume the AudioContext while a user gesture is active.
 * Must be called synchronously inside an event handler, before any await.
 */
export function unlockAudio(): void {
  try {
    const c = getCtx()
    if (c.state === 'running') return

    // resume() within a gesture is what actually unlocks Chrome/Firefox
    c.resume().catch(() => {})

    // Silent 1-sample buffer — belt-and-suspenders for Safari
    const buf = c.createBuffer(1, 1, 22050)
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start(0)
  } catch { /* old browser / SSR */ }
}

/**
 * Fetch and play a Pokémon cry.
 * Works from gesture handlers and from useEffect (after unlockAudio was called).
 * Returns a Promise that resolves when the cry finishes (or on any error).
 *
 * @param cryUrl  — URL of the .ogg cry file
 * @param volume  — 0-1, defaults to 0.55
 */
export async function playPokemonCry(cryUrl: string, volume = 0.55): Promise<void> {
  if (!cryUrl) return

  try {
    const c = getCtx()

    // Wait up to 1.5 s for the gesture-triggered resume to finish
    if (c.state !== 'running') {
      const deadline = Date.now() + 1_500
      while (Date.now() < deadline) {
        if ((c.state as AudioContextState) === 'running') break
        await new Promise<void>((r) => window.setTimeout(r, 50))
      }
      if ((c.state as AudioContextState) !== 'running') {
        console.warn('[cry] AudioContext not running — was unlockAudio() called in a gesture handler?')
        return
      }
    }

    // fetch() is allowed by connect-src; new Audio() would be blocked by media-src
    const resp = await fetch(cryUrl)
    if (!resp.ok) return

    const decoded = await c.decodeAudioData(await resp.arrayBuffer())

    const source = c.createBufferSource()
    source.buffer = decoded

    const gain = c.createGain()
    gain.gain.value = Math.max(0, Math.min(1, volume))
    source.connect(gain)
    gain.connect(c.destination)

    return new Promise<void>((resolve) => {
      const guard = window.setTimeout(resolve, 8_000)
      source.onended = () => { window.clearTimeout(guard); resolve() }
      source.start()
    })
  } catch (e) {
    console.warn('[cry] playback error:', (e as Error).message)
  }
}
