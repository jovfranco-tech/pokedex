export const typeMeta = {
  Bug: { label: 'Bicho', color: '#77c850', soft: '#ecfae9', text: '#235b22' },
  Dark: { label: 'Siniestro', color: '#5e5361', soft: '#f0edf2', text: '#fff' },
  Dragon: { label: 'Dragón', color: '#6f5be8', soft: '#f1efff', text: '#fff' },
  Electric: { label: 'Eléctrico', color: '#f4d23c', soft: '#fff8cc', text: '#3b3420' },
  Fairy: { label: 'Hada', color: '#ee8fc6', soft: '#fff0f8', text: '#3b2434' },
  Fighting: { label: 'Lucha', color: '#c73531', soft: '#ffecec', text: '#fff' },
  Fire: { label: 'Fuego', color: '#f47a2a', soft: '#fff0e6', text: '#fff' },
  Flying: { label: 'Volador', color: '#9b88e5', soft: '#f2efff', text: '#fff' },
  Ghost: { label: 'Fantasma', color: '#6554bd', soft: '#f0eeff', text: '#fff' },
  Grass: { label: 'Planta', color: '#64c858', soft: '#effbec', text: '#1f4b1f' },
  Ground: { label: 'Tierra', color: '#d6b24a', soft: '#fff7dc', text: '#3e3214' },
  Ice: { label: 'Hielo', color: '#75d6d8', soft: '#eaffff', text: '#1f4c50' },
  Normal: { label: 'Normal', color: '#a8aa7b', soft: '#f4f4ea', text: '#fff' },
  Poison: { label: 'Veneno', color: '#a45ac2', soft: '#f7edfb', text: '#fff' },
  Psychic: { label: 'Psíquico', color: '#f56fa4', soft: '#fff0f6', text: '#fff' },
  Rock: { label: 'Roca', color: '#b7a14a', soft: '#faf5df', text: '#fff' },
  Steel: { label: 'Acero', color: '#aaaec4', soft: '#f2f4f8', text: '#313342' },
  Water: { label: 'Agua', color: '#4d8fe8', soft: '#eef6ff', text: '#fff' },
}

export function getTypeMeta(type = '') {
  return typeMeta[type] ?? { label: type || 'Tipo', color: '#a0a6b5', soft: '#f5f7fb', text: '#fff' }
}

export function getPokemonTypeTheme(types = []) {
  const primary = getTypeMeta(types[0])
  const secondary = types[1] ? getTypeMeta(types[1]) : primary

  return {
    '--type-color': primary.color,
    '--type-soft': primary.soft,
    '--type-text': primary.text,
    '--type-color-2': secondary.color,
    '--type-soft-2': secondary.soft,
  }
}
