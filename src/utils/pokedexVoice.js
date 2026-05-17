function normalize(text = '') {
  return String(text).replace(/\s+/g, ' ').trim()
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

// --- Shared AudioContext -----------------------------------------------
let _audioCtx = null

function getAudioContext() {
  if (_audioCtx) return _audioCtx
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  try { _audioCtx = new AudioCtx() } catch { return null }
  return _audioCtx
}

// --- Voice cache (synchronous) ----------------------------------------
// We keep voices in a plain array that is updated eagerly so that
// speak() can be called synchronously without any await.

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
  return (
    pool.find((v) => /google|microsoft/i.test(v.name)) ??
    pool.find((v) => /compact|remote|online/i.test(v.name)) ??
    pool[0]
  )
}

// --- Unlock on first user touch/click ---------------------------------
// iOS Safari requires AudioContext AND speechSynthesis to be activated
// from a synchronous user-gesture handler before async code can use them.

function unlockAll() {
  // Unlock Web Audio
  const ctx = getAudioContext()
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {})

  // Unlock speechSynthesis: speak a silent utterance synchronously so
  // iOS marks the API as "user activated" for the rest of the session.
  if (window.speechSynthesis) {
    syncVoices()
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    u.rate = 1
    window.speechSynthesis.speak(u)
  }
}

if (typeof window !== 'undefined') {
  // Use both touchstart and pointerdown to cover all iOS versions
  window.addEventListener('touchstart', unlockAll, { capture: true, passive: true, once: true })
  window.addEventListener('pointerdown', unlockAll, { capture: true, passive: true, once: true })
}

// --- Beep -------------------------------------------------------------

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
      return wait(220)
    }
    return ctx.state === 'suspended'
      ? ctx.resume().then(go).catch(() => {})
      : go()
  } catch {
    return Promise.resolve()
  }
}

// --- Speech (synchronous speak call) ----------------------------------
// iOS Safari: speak() MUST be called synchronously from a user gesture.
// This function calls speak() immediately (no awaits before it) and
// returns a Promise that resolves when speech finishes.

export function speakSyncAndWait(text, options = {}) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve()
  }

  const message = normalize(text)
  if (!message) return Promise.resolve()

  const utterance = new SpeechSynthesisUtterance(message)
  utterance.lang = 'es-MX'
  utterance.rate   = options.rate   ?? 0.82
  utterance.pitch  = options.pitch  ?? 0.1
  utterance.volume = options.volume ?? 1

  const voice = chooseRoboticVoice()
  if (voice) utterance.voice = voice

  // speak() is called HERE — synchronously, before any await anywhere
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)

  return new Promise((resolve) => {
    const guard = window.setTimeout(resolve, 15_000)
    const done = () => { window.clearTimeout(guard); resolve() }
    utterance.onend   = done
    utterance.onerror = done
  })
}

// --- Public API -------------------------------------------------------

// speakPokedexLine: starts beep AND speech simultaneously (both sync),
// then awaits both to finish. Beep and voice overlap slightly at start,
// which is acceptable on iOS where sequential await is not allowed.
export function speakPokedexLine(text, options = {}) {
  if (!text) return Promise.resolve()

  // Both calls are synchronous — speak() fires before any microtask
  const beepPromise   = options.withBeep !== false ? playPokedexBeep() : Promise.resolve()
  const speechPromise = speakSyncAndWait(text, options)

  return Promise.all([beepPromise, speechPromise])
}

export async function speakWithPokedexVoice(text, options = {}) {
  return speakSyncAndWait(text, options)
}

export function buildPokedexAnnouncement(pokemon) {
  if (!pokemon) return ''

  const kind = pokemon.isMythical
    ? 'mítico'
    : pokemon.isLegendary
      ? 'legendario'
      : 'registrado'

  const types = pokemon.type?.join(' y ') ?? 'desconocido'
  const topStat = pokemon.stats?.slice().sort((a, b) => b.value - a.value)[0]
  const statLine = topStat ? `Dato clave: ${topStat.name} ${topStat.value}.` : ''

  return `Pokédex en línea. ${pokemon.name}. Tipo ${types}. Estado ${kind}. Generación ${pokemon.generation}. ${statLine}`.trim()
}
