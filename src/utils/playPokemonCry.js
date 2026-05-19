/**
 * Pokémon cry playback.
 *
 * Two modes:
 *  1. Direct (button click) — new Audio() is the most reliable for a real
 *     user gesture; no AudioContext needed.
 *  2. Auto (useEffect after search) — needs a pre-unlocked AudioContext
 *     because the gesture window is already closed.
 *
 * Call unlockAudio() synchronously at the top of every gesture handler
 * (before any await) so the AudioContext is running by the time the
 * useEffect fires.
 */

let _ctx = null
let _unlocked = false

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return _ctx
}

/**
 * Unlock the AudioContext. Call synchronously inside every user-gesture
 * handler (onClick, onSubmit…) BEFORE any await.
 */
export function unlockAudio() {
  try {
    const c = getCtx()
    if (_unlocked) return
    // Resume within the gesture and play a silent buffer — both are needed
    // for reliable unlock on Chrome + Safari
    c.resume().then(() => { _unlocked = true }).catch(() => {})
    const buf = c.createBuffer(1, 1, 22050)
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start(0)
    src.onended = () => { _unlocked = true }
  } catch (e) {
    console.warn('[unlockAudio] error:', e.message)
  }
}

/**
 * Play a Pokémon cry.
 * - When called from a button click (gesture), it tries new Audio() first
 *   because that's the simplest and most reliable in a gesture context.
 * - When called from auto-play (useEffect), it uses the pre-unlocked
 *   AudioContext so it can play without a live gesture.
 *
 * @param {string} cryUrl
 * @param {number} [volume=0.55]
 * @param {{ direct?: boolean }} [opts]  direct=true skips the AudioContext path
 */
export async function playPokemonCry(cryUrl, volume = 0.55, opts = {}) {
  if (!cryUrl) {
    console.warn('[playPokemonCry] no cryUrl')
    return
  }

  // ── Direct path (button click with live gesture) ──────────────────────────
  if (opts.direct) {
    return new Promise((resolve) => {
      const audio = new Audio(cryUrl)
      audio.volume = volume
      const guard = window.setTimeout(resolve, 8_000)
      const done = () => { window.clearTimeout(guard); resolve() }
      audio.addEventListener('ended', done, { once: true })
      audio.addEventListener('error', (e) => {
        console.warn('[playPokemonCry] direct audio error:', e.message ?? e.type)
        done()
      }, { once: true })
      audio.play().catch((e) => {
        console.warn('[playPokemonCry] direct play() rejected:', e.message)
        done()
      })
    })
  }

  // ── AudioContext path (auto-play from useEffect) ──────────────────────────
  try {
    const c = getCtx()

    if (c.state !== 'running') {
      // Wait up to 1.5 s for the gesture-triggered resume to complete
      const deadline = Date.now() + 1_500
      while (c.state !== 'running' && Date.now() < deadline) {
        await new Promise((r) => window.setTimeout(r, 50))
      }
      if (c.state !== 'running') {
        console.warn('[playPokemonCry] AudioContext still', c.state, '— skipping cry')
        return
      }
    }

    const resp = await fetch(cryUrl)
    if (!resp.ok) {
      console.warn('[playPokemonCry] fetch failed:', resp.status)
      return
    }

    const arrayBuf = await resp.arrayBuffer()
    const decoded = await c.decodeAudioData(arrayBuf)

    const source = c.createBufferSource()
    source.buffer = decoded

    const gain = c.createGain()
    gain.gain.value = Math.max(0, Math.min(1, volume))
    source.connect(gain)
    gain.connect(c.destination)

    return new Promise((resolve) => {
      const guard = window.setTimeout(resolve, 8_000)
      source.onended = () => { window.clearTimeout(guard); resolve() }
      source.start()
    })
  } catch (e) {
    console.warn('[playPokemonCry] AudioContext path error:', e.message)
  }
}
