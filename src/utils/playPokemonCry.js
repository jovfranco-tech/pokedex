/**
 * Web Audio API – single persistent AudioContext for the whole session.
 *
 * Key design:
 *  - unlockAudio() MUST be called synchronously at the top of every user-gesture
 *    handler (before any await). It fires ctx.resume() and plays a silent buffer
 *    so the context becomes 'running' immediately on all browsers (incl. Safari).
 *    The resulting promise is stored so playPokemonCry can await it safely from
 *    outside the gesture window without hanging.
 *
 *  - playPokemonCry() never calls ctx.resume() itself (that would hang outside a
 *    gesture). Instead it awaits the stored promise with a 2-second safety cap.
 */

let _ctx = null
let _readyPromise = null  // Promise<void> created inside a gesture — safe to await later

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  return _ctx
}

/**
 * Call this synchronously at the TOP of any user-gesture handler
 * (button onClick, form onSubmit, etc.) BEFORE any await.
 *
 * Unlocks the AudioContext for the rest of the session by:
 *  1. Playing a zero-duration silent buffer (immediately makes ctx 'running' in Chrome/Safari)
 *  2. Calling ctx.resume() within the gesture and storing the promise for later use
 */
export function unlockAudio() {
  try {
    const c = getCtx()
    if (c.state === 'running') return  // already unlocked

    // Play a silent 1-sample buffer — this immediately counts as audio
    // activity and satisfies the browser's autoplay requirement on all browsers
    const silentBuf = c.createBuffer(1, 1, 22050)
    const src = c.createBufferSource()
    src.buffer = silentBuf
    src.connect(c.destination)
    src.start(0)

    // Store the resume promise so we can await it from non-gesture code later
    _readyPromise = c.resume().catch(() => {})
  } catch { /* ignore — SSR, old browser, etc. */ }
}

/**
 * Fetch, decode and play a Pokémon cry via the Web Audio API.
 * Returns a Promise that resolves when the cry ends (or on any error).
 *
 * Requires unlockAudio() to have been called within a user gesture earlier
 * in the same session.
 *
 * @param {string} cryUrl
 * @param {number} [volume=0.55]
 */
export async function playPokemonCry(cryUrl, volume = 0.55) {
  if (!cryUrl) return

  try {
    const c = getCtx()

    // If the context isn't running yet, wait for the resume promise that was
    // kicked off in unlockAudio() (inside a gesture). Cap at 2 s to avoid hanging.
    if (c.state !== 'running') {
      if (_readyPromise) {
        await Promise.race([
          _readyPromise,
          new Promise((_, reject) => window.setTimeout(() => reject(new Error('unlock timeout')), 2_000)),
        ])
      }
      if (c.state !== 'running') return  // give up — context never unlocked
    }

    const resp = await fetch(cryUrl)
    if (!resp.ok) return

    const arrayBuf = await resp.arrayBuffer()
    const decoded = await c.decodeAudioData(arrayBuf)

    const source = c.createBufferSource()
    source.buffer = decoded

    const gain = c.createGain()
    gain.gain.value = Math.max(0, Math.min(1, volume))
    source.connect(gain)
    gain.connect(c.destination)

    return new Promise((resolve) => {
      const guard = window.setTimeout(resolve, 8_000) // safety cap
      source.onended = () => { window.clearTimeout(guard); resolve() }
      source.start()
    })
  } catch { /* swallow — NotAllowedError, decode error, network error, etc. */ }
}
