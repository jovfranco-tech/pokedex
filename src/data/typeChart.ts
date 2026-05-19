export const allTypes: string[] = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
]

export const attackEffectiveness: Record<string, Record<string, number>> = {
  Normal:   { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire:     { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water:    { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass:    { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice:      { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison:   { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground:   { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying:   { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic:  { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug:      { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock:     { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost:    { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon:   { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark:     { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel:    { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy:    { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 },
}

export interface TypeMatchupEntry {
  type: string
  multiplier: number
}

export function getAttackMultiplier(attackType: string, defenderTypes: string[]): number {
  return defenderTypes.reduce((multiplier, defenderType) => {
    return multiplier * (attackEffectiveness[attackType]?.[defenderType] ?? 1)
  }, 1)
}

export function getDefensiveMatchups(defenderTypes: string[]): TypeMatchupEntry[] {
  return allTypes
    .map((attackType) => ({
      type: attackType,
      multiplier: getAttackMultiplier(attackType, defenderTypes),
    }))
    .sort((a, b) => b.multiplier - a.multiplier || a.type.localeCompare(b.type))
}

export function getOffensiveMatchups(attackerTypes: string[]): TypeMatchupEntry[] {
  return allTypes
    .map((defenderType) => {
      const multiplier = Math.max(...attackerTypes.map((attackType) => getAttackMultiplier(attackType, [defenderType])))
      return { type: defenderType, multiplier }
    })
    .sort((a, b) => b.multiplier - a.multiplier || a.type.localeCompare(b.type))
}

export function getOffensiveWeakMatchups(attackerTypes: string[]): TypeMatchupEntry[] {
  return allTypes
    .map((defenderType) => {
      const multiplier = Math.min(...attackerTypes.map((attackType) => getAttackMultiplier(attackType, [defenderType])))
      return { type: defenderType, multiplier }
    })
    .filter((entry) => entry.multiplier < 1)
    .sort((a, b) => a.multiplier - b.multiplier || a.type.localeCompare(b.type))
}

export interface TypeMatchups {
  vulnerabilities: TypeMatchupEntry[]
  resistances: TypeMatchupEntry[]
  immunities: TypeMatchupEntry[]
  effectiveAgainst: TypeMatchupEntry[]
  weakAgainst: TypeMatchupEntry[]
}

export function buildTypeMatchups(types: string[]): TypeMatchups {
  const defensive = getDefensiveMatchups(types)
  const offensive = getOffensiveMatchups(types)
  const offensiveWeak = getOffensiveWeakMatchups(types)

  return {
    vulnerabilities: defensive.filter((entry) => entry.multiplier > 1),
    resistances:     defensive.filter((entry) => entry.multiplier > 0 && entry.multiplier < 1),
    immunities:      defensive.filter((entry) => entry.multiplier === 0),
    effectiveAgainst: offensive.filter((entry) => entry.multiplier > 1),
    weakAgainst: offensiveWeak,
  }
}
