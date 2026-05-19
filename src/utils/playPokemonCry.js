/**
 * Persistent AudioContext — created once, reused forever.
 * Must be unlocked (resumed) synchronously inside a user-gesture handler
 * before any async work, so subsequent playback works without a gesture.
 */
let _ctx = null

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return _ctx
}

/**
 * Call this synchronously at the TOP of any user-gesture handler
 * (button onClick, form onSubmit, etc.) BEFORE any await.
 * This resumes the AudioContext while the browser still considers the
 * event a trusted interaction, unlocking audio for the rest of the session.
 */
export function unlockAudio() {
  try {
    const c = getCtx()
    if (c.state === 'suspended') c.resume()
  } catch { /* ignore — older browsers or SSR */ }
}

/**
 * Fetch, decode and play a Pokémon cry via the Web Audio API.
 * Returns a Promise that resolves when the cry ends (or on any error).
 * @param {string} cryUrl
 * @param {number} [volume=0.55]
 */
export async function playPokemonCry(cryUrl, volume = 0.55) {
  if (!cryUrl) return

  try {
    const c = getCtx()

    // Best-effort resume in case the context is still suspended
    if (c.state === 'suspended') {
      try { await c.resume() } catch { return }
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
  } catch { /* swallow — NotAllowedError, network error, decode error, etc. */ }
}
