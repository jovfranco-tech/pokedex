export function playPokemonCry(cryUrl, volume = 0.55) {
  if (!cryUrl) return

  const audio = new Audio(cryUrl)
  audio.volume = volume
  audio.play().catch(() => {
    // Some browsers block autoplay until the page has a user gesture.
  })
}
