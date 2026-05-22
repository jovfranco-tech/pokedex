/**
 * Pokémon cry playback via Web Audio API.
 *
 * We CANNOT use new Audio(url) because the CSP media-src directive does not
 * allow raw.githubusercontent.com. Instead we fetch the audio data (connect-src
 * does allow it) and decode it with AudioContext.decodeAudioData — no media-src
 * restriction applies to this path.
 */
import { getBackup, saveBackup } from './indexedDbBackup.js'

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

let _ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!_ctx) {
    const Ctor = window.AudioContext ?? window.webkitAudioContext
    if (!Ctor) throw new Error('Web Audio API not supported in this browser')
    _ctx = new Ctor()
  }
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

    // Check IndexedDB cache first
    let arrayBuffer: ArrayBuffer | null = null
    try {
      const cached = await getBackup<{ buffer: ArrayBuffer }>(`cry-cache:${cryUrl}`)
      if (cached && cached.buffer) {
        arrayBuffer = cached.buffer
      }
    } catch {
      // ignore
    }

    if (!arrayBuffer) {
      const resp = await fetch(cryUrl)
      if (!resp.ok) return
      arrayBuffer = await resp.arrayBuffer()
      try {
        void saveBackup(`cry-cache:${cryUrl}`, { buffer: arrayBuffer })
      } catch {
        // ignore
      }
    }

    const decoded = await c.decodeAudioData(arrayBuffer.slice(0))

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
