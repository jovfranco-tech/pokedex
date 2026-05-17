export const legendaryPokemonByGeneration = [
  { generation: 'I', pokemon: ['Articuno', 'Zapdos', 'Moltres', 'Mewtwo'] },
  { generation: 'II', pokemon: ['Raikou', 'Entei', 'Suicune', 'Lugia', 'Ho-Oh'] },
  { generation: 'III', pokemon: ['Regirock', 'Regice', 'Registeel', 'Latias', 'Latios', 'Kyogre', 'Groudon', 'Rayquaza'] },
  { generation: 'IV', pokemon: ['Uxie', 'Mesprit', 'Azelf', 'Dialga', 'Palkia', 'Heatran', 'Regigigas', 'Giratina', 'Cresselia'] },
  { generation: 'V', pokemon: ['Cobalion', 'Terrakion', 'Virizion', 'Tornadus', 'Thundurus', 'Reshiram', 'Zekrom', 'Landorus', 'Kyurem'] },
  { generation: 'VI', pokemon: ['Xerneas', 'Yveltal', 'Zygarde'] },
  { generation: 'VII', pokemon: ['Type: Null', 'Silvally', 'Tapu Koko', 'Tapu Lele', 'Tapu Bulu', 'Tapu Fini', 'Cosmog', 'Cosmoem', 'Solgaleo', 'Lunala', 'Necrozma'] },
  { generation: 'VIII', pokemon: ['Zacian', 'Zamazenta', 'Eternatus', 'Kubfu', 'Urshifu', 'Regieleki', 'Regidrago', 'Glastrier', 'Spectrier', 'Calyrex', 'Enamorus'] },
  { generation: 'IX', pokemon: ['Wo-Chien', 'Chien-Pao', 'Ting-Lu', 'Chi-Yu', 'Koraidon', 'Miraidon', 'Okidogi', 'Munkidori', 'Fezandipiti', 'Ogerpon', 'Terapagos'] },
]

export const mythicalPokemonByGeneration = [
  { generation: 'I', pokemon: ['Mew'] },
  { generation: 'II', pokemon: ['Celebi'] },
  { generation: 'III', pokemon: ['Jirachi', 'Deoxys'] },
  { generation: 'IV', pokemon: ['Phione', 'Manaphy', 'Darkrai', 'Shaymin', 'Arceus'] },
  { generation: 'V', pokemon: ['Victini', 'Keldeo', 'Meloetta', 'Genesect'] },
  { generation: 'VI', pokemon: ['Diancie', 'Hoopa', 'Volcanion'] },
  { generation: 'VII', pokemon: ['Magearna', 'Marshadow', 'Zeraora', 'Meltan', 'Melmetal'] },
  { generation: 'VIII', pokemon: ['Zarude'] },
  { generation: 'IX', pokemon: ['Pecharunt'] },
]

export const starterSpeciesIds = new Set([
  1, 4, 7,
  152, 155, 158,
  252, 255, 258,
  387, 390, 393,
  495, 498, 501,
  650, 653, 656,
  722, 725, 728,
  810, 813, 816,
  906, 909, 912,
])

export const ultraBeastSpeciesIds = new Set([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806])

export const paradoxSpeciesIds = new Set([
  984, 985, 986, 987, 988, 989,
  990, 991, 992, 993, 994, 995,
  1005, 1006, 1007, 1008, 1009, 1010,
  1020, 1021, 1022, 1023,
])

const regionalFormTokens = ['-alola', '-galar', '-hisui', '-paldea']

export function isRegionalFormName(name = '') {
  return regionalFormTokens.some((token) => name.includes(token))
}

export function getPokemonCategoryFlags({ apiName = '', isBaby = false, isLegendary = false, isMega = false, isMythical = false, isPrimal = false, speciesId }) {
  return {
    isBaby: Boolean(isBaby),
    isLegendary: Boolean(isLegendary),
    isMega: Boolean(isMega),
    isMythical: Boolean(isMythical),
    isParadox: paradoxSpeciesIds.has(speciesId),
    isPrimal: Boolean(isPrimal),
    isRegional: isRegionalFormName(apiName),
    isStarter: starterSpeciesIds.has(speciesId),
    isUltraBeast: ultraBeastSpeciesIds.has(speciesId),
  }
}
