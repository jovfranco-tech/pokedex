export function playPokemonCry(cryUrl, volume = 0.55) {
  if (!cryUrl) return Promise.resolve()

  const audio = new Audio(cryUrl)
  audio.volume = volume

  return new Promise((resolve) => {
    const guard = window.setTimeout(resolve, 8000) // safety cap
    const done = () => { window.clearTimeout(guard); resolve() }
    audio.addEventListener('ended', done, { once: true })
    audio.addEventListener('error', done, { once: true })
    audio.play().catch(done)
  })
}
