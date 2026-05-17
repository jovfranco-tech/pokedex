function normalize(text = '') {
  return String(text).replace(/\s+/g, ' ').trim()
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

// --- iOS / browser unlock ----------------------------------------------
// Web Audio and Web Speech both require a user gesture to start.
// After any pointer interaction we "unlock" both APIs so subsequent
// async calls (after awaits) still work on iOS Safari and Chrome.

let _audioCtx = null

function getAudioContext() {
  if (_audioCtx) return _audioCtx
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  try { _audioCtx = new AudioCtx() } catch { return null }
  return _audioCtx
}

function unlockAudio() {
  // Resume Web Audio if suspended
  const ctx = getAudioContext()
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {})

  // iOS needs at least one speak() call from a synchronous user-gesture
  // handler before any async speak() calls work.
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const warm = new SpeechSynthesisUtterance('')
    warm.volume = 0
    window.speechSynthesis.speak(warm)
  }
}

if (typeof window !== 'undefined') {
  // Capture-phase so we fire before the target handler
  window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true })
}

// --- Voice pre-loading -------------------------------------------------
// getVoices() returns [] on the very first call in every browser.
// We wait for the voiceschanged event (or a 2-second fallback) so a
// voice is always assigned before we call speak().

let _voicesPromise = null

function loadVoices() {
  if (_voicesPromise) return _voicesPromise

  _voicesPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([])
      return
    }

    const immediate = window.speechSynthesis.getVoices()
    if (immediate.length) { resolve(immediate); return }

    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve(window.speechSynthesis.getVoices())
    }

    window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true })
    window.setTimeout(finish, 2000)
  })

  return _voicesPromise
}

if (typeof window !== 'undefined') loadVoices()

function chooseRoboticVoice(voices) {
  if (!voices.length) return null
  const spanishVoices = voices.filter((v) => /^es(-|$)/i.test(v.lang))
  const pool = spanishVoices.length ? spanishVoices : voices
  // Prefer known TTS engines — they sound more synthetic/robotic
  return (
    pool.find((v) => /google|microsoft/i.test(v.name)) ??
    pool.find((v) => /compact|remote|online/i.test(v.name)) ??
    pool[0]
  )
}

// --- Beep --------------------------------------------------------------
// Rising two-tone blip — Dexter computer style.

function scheduleTone(ctx, freq, startSec, durationSec, gain = 0.2) {
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
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') await ctx.resume()
    scheduleTone(ctx, 1400, 0.00, 0.07)
    scheduleTone(ctx, 1900, 0.09, 0.09)
    await wait(220)
  } catch {
    // Silently skip if blocked
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
  // Low pitch = robotic Dexter effect; 0.1 is audibly synthetic without breaking
  utterance.rate   = options.rate   ?? 0.82
  utterance.pitch  = options.pitch  ?? 0.1
  utterance.volume = options.volume ?? 1

  const voice = chooseRoboticVoice(voices)
  if (voice) utterance.voice = voice

  return new Promise((resolve) => {
    // Safety: resolve after 15 s in case onend never fires
    const safeguard = window.setTimeout(resolve, 15_000)
    const done = () => { window.clearTimeout(safeguard); resolve() }
    utterance.onend   = done
    utterance.onerror = done

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  })
}

export async function speakPokedexLine(text, options = {}) {
  if (!text) return
  if (options.withBeep !== false) await playPokedexBeep()
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
