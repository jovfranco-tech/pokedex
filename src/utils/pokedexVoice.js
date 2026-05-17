function normalize(text = '') {
  return String(text).replace(/\s+/g, ' ').trim()
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

// --- Voice pre-loading -------------------------------------------------
// getVoices() returns [] on the first call in every browser.
// We resolve the promise once the voiceschanged event fires (or immediately
// if voices were already cached by the browser).

let _voicesPromise = null

function loadVoices() {
  if (_voicesPromise) return _voicesPromise

  _voicesPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([])
      return
    }

    const immediate = window.speechSynthesis.getVoices()
    if (immediate.length) {
      resolve(immediate)
      return
    }

    let settled = false
    const settle = (voices) => {
      if (settled) return
      settled = true
      resolve(voices ?? window.speechSynthesis.getVoices())
    }

    window.speechSynthesis.addEventListener('voiceschanged', () => settle(window.speechSynthesis.getVoices()), { once: true })
    // Hard timeout — some browsers never fire the event
    window.setTimeout(() => settle(window.speechSynthesis.getVoices()), 2000)
  })

  return _voicesPromise
}

// Kick off loading as soon as the module is imported
if (typeof window !== 'undefined') loadVoices()

function chooseRoboticVoice(voices) {
  if (!voices.length) return null

  // Prefer voices that sound synthetic / robotic in Spanish
  const spanishVoices = voices.filter((v) => /^es(-|$)/i.test(v.lang))
  const allCandidates = spanishVoices.length ? spanishVoices : voices

  // Prefer known synthetic/TTS voices (they sound more robotic)
  const synthetic = allCandidates.find((v) =>
    /google|microsoft|alex|fred|victoria|compact|remote/i.test(v.name),
  )
  return synthetic ?? allCandidates[0]
}

// --- Beep --------------------------------------------------------------
// Two-tone ascending blip that sounds like a Dexter computer alert.

function scheduleTone(ctx, freq, startSec, durationSec, gain = 0.18) {
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

export async function playPokedexBeep() {
  if (typeof window === 'undefined') return
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return

  try {
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') await ctx.resume()

    // Short rising two-tone blip (Dexter/sci-fi computer style)
    scheduleTone(ctx, 1400, 0, 0.07)
    scheduleTone(ctx, 1900, 0.09, 0.09)

    await wait(220)
  } catch {
    // AudioContext blocked — skip beep silently
  }
}

// --- Speech ------------------------------------------------------------

export async function speakWithPokedexVoice(text, options = {}) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return

  const message = normalize(text)
  if (!message) return

  const voices = await loadVoices()

  const utterance = new SpeechSynthesisUtterance(message)
  utterance.lang = 'es-MX'
  // Robotic Dexter-style: very low pitch, deliberate pace
  utterance.rate = options.rate ?? 0.82
  utterance.pitch = options.pitch ?? 0.08
  utterance.volume = options.volume ?? 1

  const voice = chooseRoboticVoice(voices)
  if (voice) utterance.voice = voice

  return new Promise((resolve) => {
    utterance.onend = resolve
    utterance.onerror = resolve
    // Cancel any ongoing speech, then yield one tick before speaking
    // to avoid Chrome cancelling what we just enqueued.
    window.speechSynthesis.cancel()
    window.setTimeout(() => window.speechSynthesis.speak(utterance), 50)
  })
}

export async function speakPokedexLine(text, options = {}) {
  if (!text) return

  if (options.withBeep !== false) {
    await playPokedexBeep()
  }

  await speakWithPokedexVoice(text, options)
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
