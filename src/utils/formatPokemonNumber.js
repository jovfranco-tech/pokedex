export function formatPokemonNumber(id) {
  return `#${String(id).padStart(3, '0')}`
}
