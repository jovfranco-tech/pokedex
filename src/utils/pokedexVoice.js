function normalize(text = '') {
  return String(text).replace(/\s+/g, ' ').trim()
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

// --- iOS detection ----------------------------------------------------
function isIOS() {
  return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
}

// --- Shared AudioContext ----------------------------------------------
let _audioCtx = null

function getAudioContext() {
  if (_audioCtx) return _audioCtx
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  try { _audioCtx = new AudioCtx() } catch { return null }
  return _audioCtx
}

// --- Synchronous voice cache ------------------------------------------
// getVoices() returns [] on first call. We update a plain array eagerly
// via voiceschanged so speak() can always be called without await.

let _voices = []

function syncVoices() {
  const v = window.speechSynthesis?.getVoices?.() ?? []
  if (v.length) _voices = v
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  syncVoices()
  window.speechSynthesis.addEventListener('voiceschanged', syncVoices)
}

function chooseRoboticVoice() {
  syncVoices()
  if (!_voices.length) return null
  const spanishVoices = _voices.filter((v) => /^es(-|$)/i.test(v.lang))
  const pool = spanishVoices.length ? spanishVoices : _voices
  // Prefer Google/Microsoft TTS — they sound more synthetic
  return (
    pool.find((v) => /google/i.test(v.name)) ??
    pool.find((v) => /microsoft/i.test(v.name)) ??
    pool.find((v) => /compact|remote|online/i.test(v.name)) ??
    pool[0]
  )
}

// --- Unlock on first gesture (iOS requirement) -----------------------
function unlockAll() {
  const ctx = getAudioContext()
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {})
  if (window.speechSynthesis) {
    syncVoices()
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', unlockAll, { capture: true, passive: true, once: true })
  window.addEventListener('pointerdown', unlockAll, { capture: true, passive: true, once: true })
}

// --- Beep (Dexter computer style) ------------------------------------

function scheduleTone(ctx, freq, startSec, durationSec, gain = 0.22) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, ctx.currentTime + startSec)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startSec + durationSec)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(ctx.currentTime + startSec)
  osc.stop(ctx.currentTime + startSec + durationSec)
}

export function playPokedexBeep() {
  if (typeof window === 'undefined') return Promise.resolve()
  try {
    const ctx = getAudioContext()
    if (!ctx) return Promise.resolve()
    const go = () => {
      scheduleTone(ctx, 1400, 0.00, 0.07)
      scheduleTone(ctx, 1900, 0.09, 0.09)
      return wait(240)
    }
    return ctx.state === 'suspended'
      ? ctx.resume().then(go).catch(() => Promise.resolve())
      : go()
  } catch {
    return Promise.resolve()
  }
}

// --- Core speak (synchronous speak() call) ---------------------------
// speak() is called immediately (no awaits before it) so iOS Safari
// accepts it from a user-gesture chain.

export function speakSyncAndWait(text, options = {}) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve()
  }
  const message = normalize(text)
  if (!message) return Promise.resolve()

  const utterance = new SpeechSynthesisUtterance(message)
  utterance.lang   = 'es-MX'
  // Dexter-computer style: mid-low pitch (not deep), deliberate pace
  utterance.rate   = options.rate   ?? 0.88
  utterance.pitch  = options.pitch  ?? 0.55
  utterance.volume = options.volume ?? 1

  const voice = chooseRoboticVoice()
  if (voice) utterance.voice = voice

  // speak() fires here — synchronously, before any Promise resolution
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)

  return new Promise((resolve) => {
    const guard = window.setTimeout(resolve, 20_000)
    const done = () => { window.clearTimeout(guard); resolve() }
    utterance.onend   = done
    utterance.onerror = done
  })
}

// --- Public API ------------------------------------------------------

// On desktop: beep finishes, then voice starts (sequential).
// On iOS:     both start synchronously at the same time (concurrent)
//             — AudioContext has lower latency so beep is heard first.
export function speakPokedexLine(text, options = {}) {
  if (!text) return Promise.resolve()
  const withBeep = options.withBeep !== false

  if (isIOS()) {
    const beepP  = withBeep ? playPokedexBeep() : Promise.resolve()
    const speakP = speakSyncAndWait(text, options)
    return Promise.all([beepP, speakP])
  }

  // Desktop: true sequential — hear full beep before voice starts
  const beepP = withBeep ? playPokedexBeep() : Promise.resolve()
  return beepP.then(() => speakSyncAndWait(text, options))
}

export async function speakWithPokedexVoice(text, options = {}) {
  return speakSyncAndWait(text, options)
}

// --- Announcement text -----------------------------------------------
// Format: "{Name}. Tipo {types}. {description}"
// Mirrors what the Pokédex card shows in the description section.

export function buildPokedexAnnouncement(pokemon) {
  if (!pokemon) return ''
  const types = pokemon.type?.join(' y ') ?? ''
  const description = pokemon.description ?? ''
  return normalize(`${pokemon.name}. Tipo ${types}. ${description}`)
}
