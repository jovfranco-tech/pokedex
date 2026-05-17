function normalize(text = '') {
  return String(text).replace(/\s+/g, ' ').trim()
}

function chooseSpanishVoice() {
  const voices = window.speechSynthesis?.getVoices?.() ?? []
  const spanishVoices = voices.filter((voice) => /^es(-|$)/i.test(voice.lang))
  if (!spanishVoices.length) return null

  const robotLike = spanishVoices.find((voice) => /monica|paulina|helena|google|microsoft/i.test(voice.name))
  return robotLike ?? spanishVoices[0]
}

export function speakWithPokedexVoice(text, options = {}) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return

  const message = normalize(text)
  if (!message) return

  const utterance = new SpeechSynthesisUtterance(message)
  utterance.lang = 'es-MX'
  utterance.rate = options.rate ?? 0.88
  utterance.pitch = options.pitch ?? 0.64
  utterance.volume = options.volume ?? 1

  const voice = chooseSpanishVoice()
  if (voice) utterance.voice = voice

  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
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
