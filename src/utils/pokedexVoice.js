function normalize(text = '') {
  return String(text).replace(/\s+/g, ' ').trim()
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function chooseSpanishVoice() {
  const voices = window.speechSynthesis?.getVoices?.() ?? []
  const spanishVoices = voices.filter((voice) => /^es(-|$)/i.test(voice.lang))
  if (!spanishVoices.length) return null

  const robotLike = spanishVoices.find((voice) => /monica|paulina|helena|google|microsoft/i.test(voice.name))
  return robotLike ?? spanishVoices[0]
}

function playTone(context, freq, durationMs, gainValue = 0.05) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'square'
  oscillator.frequency.value = freq
  gain.gain.setValueAtTime(gainValue, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationMs / 1000)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + durationMs / 1000)
}

export async function playPokedexBeep() {
  if (typeof window === 'undefined') return
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return

  const context = new AudioCtx()
  if (context.state === 'suspended') {
    await context.resume()
  }

  playTone(context, 1180, 80, 0.05)
  await wait(105)
  playTone(context, 880, 110, 0.05)
}

export function speakWithPokedexVoice(text, options = {}) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve()

  const message = normalize(text)
  if (!message) return Promise.resolve()

  const utterance = new SpeechSynthesisUtterance(message)
  utterance.lang = 'es-MX'
  utterance.rate = options.rate ?? 0.84
  utterance.pitch = options.pitch ?? 0.58
  utterance.volume = options.volume ?? 1

  const voice = chooseSpanishVoice()
  if (voice) utterance.voice = voice

  return new Promise((resolve) => {
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  })
}

export async function speakPokedexLine(text, options = {}) {
  if (!text) return
  if (options.withBeep !== false) {
    await playPokedexBeep()
    await wait(90)
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
