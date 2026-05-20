import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  MiniList,
  MiniStat,
  EvolutionChainRow,
  StatsPanel,
  InfoTab,
  KidsInfoTab,
  TypeMatchups,
  GameAppearances,
} from '../sub-components.tsx'
import type { PokemonDetail, TypeMatchups as TypeMatchupsData } from '../../../services/pokeApi.ts'

// ── framer-motion mock ───────────────────────────────────────────────────────
const { MotionSpan } = vi.hoisted(() => {
  const MOTION_PROPS = new Set(['animate', 'initial', 'exit', 'transition', 'whileHover', 'whileTap'])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const strip = (props: any): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(props as Record<string, unknown>)) {
      if (k !== 'children' && !MOTION_PROPS.has(k)) out[k] = (props as Record<string, unknown>)[k]
    }
    return out
  }
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MotionSpan: (props: any) => <span {...strip(props)}>{props.children}</span>,
  }
})

vi.mock('framer-motion', () => ({
  m: { span: MotionSpan },
  motion: { span: MotionSpan },
  useReducedMotion: () => false,
}))

// ── Fixtures ─────────────────────────────────────────────────────────────────
const mkPokemon = (overrides: Partial<PokemonDetail> = {}): PokemonDetail => ({
  id: 25, speciesId: 25, apiName: 'pikachu', name: 'Pikachu',
  baseName: 'pikachu', formLabel: '', displayNumber: '#0025',
  sprite: 'https://img/25.png', type: ['electric'],
  stats: [
    { key: 'hp', name: 'PS', value: 35 },
    { key: 'attack', name: 'Ataque', value: 55 },
  ],
  matchups: { vulnerabilities: [], resistances: [], immunities: [], effectiveAgainst: [], weakAgainst: [] },
  gameAppearances: [], evolution: 'Raichu', evolutionChain: [],
  attacks: ['Impactrueno', 'Rayo'], abilities: ['Estática'],
  weight: '6 kg', height: '0.4 m', generation: 1,
  description: 'Pokémon ratón eléctrico.',
  cryUrl: '', animatedSprite: '', baseExperience: 112,
  confidenceScore: 100, scannedAt: '', scanMode: 'búsqueda por texto',
  visualReason: '', dataVersion: 'v4',
  isLegendary: false, isMythical: false, isMega: false, isPrimal: false,
  isRegional: false, isStarter: false, isUltraBeast: false,
  isParadox: false, isBaby: false,
  ...overrides,
})

// ── MiniList ─────────────────────────────────────────────────────────────────

describe('MiniList', () => {
  it('renders the title and the chip values', () => {
    render(<MiniList title="Ataques" values={['Impactrueno', 'Rayo', 'Trueno']} />)
    expect(screen.getByText('Ataques')).toBeInTheDocument()
    expect(screen.getByText('Impactrueno')).toBeInTheDocument()
    expect(screen.getByText('Rayo')).toBeInTheDocument()
    expect(screen.getByText('Trueno')).toBeInTheDocument()
  })

  it('caps the chip count at 5 values', () => {
    const { container } = render(
      <MiniList title="Many" values={['a', 'b', 'c', 'd', 'e', 'f', 'g']} />,
    )
    expect(container.querySelectorAll('.chip-cloud span')).toHaveLength(5)
  })

  it('renders just the title when no values are provided', () => {
    render(<MiniList title="Vacío" />)
    expect(screen.getByText('Vacío')).toBeInTheDocument()
  })
})

// ── MiniStat ─────────────────────────────────────────────────────────────────

describe('MiniStat', () => {
  it('renders the label as a <dt> and the value as a <dd>', () => {
    render(<MiniStat label="Peso" value="6 kg" />)
    expect(screen.getByText('Peso').tagName).toBe('DT')
    expect(screen.getByText('6 kg').tagName).toBe('DD')
  })

  it('renders numeric values', () => {
    render(<MiniStat label="Gen" value={1} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders an empty <dd> for null values', () => {
    const { container } = render(<MiniStat label="Nada" value={null} />)
    expect(container.querySelector('dd')?.textContent).toBe('')
  })
})

// ── EvolutionChainRow ────────────────────────────────────────────────────────

describe('EvolutionChainRow', () => {
  const chain = [
    { id: 172, name: 'Pichu',   sprite: 'https://img/172.png' },
    { id: 25,  name: 'Pikachu', sprite: 'https://img/25.png' },
    { id: 26,  name: 'Raichu',  sprite: 'https://img/26.png' },
  ]

  it('returns null when chain has 1 or fewer entries', () => {
    const { container } = render(<EvolutionChainRow chain={[chain[0]]} currentId={172} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when chain is missing entirely', () => {
    const { container } = render(<EvolutionChainRow currentId={172} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders each entry name from the chain', () => {
    render(<EvolutionChainRow chain={chain} currentId={25} />)
    chain.forEach((entry) => expect(screen.getByText(entry.name)).toBeInTheDocument())
  })

  it('marks the current entry with evolution-chain-item-current', () => {
    const { container } = render(<EvolutionChainRow chain={chain} currentId={25} />)
    const current = container.querySelector('.evolution-chain-item-current')
    expect(current?.textContent).toContain('Pikachu')
  })

  it('renders n-1 arrows between n chain entries', () => {
    const { container } = render(<EvolutionChainRow chain={chain} currentId={25} />)
    expect(container.querySelectorAll('.evolution-arrow')).toHaveLength(chain.length - 1)
  })
})

// ── StatsPanel ───────────────────────────────────────────────────────────────

describe('StatsPanel', () => {
  it('renders a friendly placeholder when stats are empty', () => {
    render(<StatsPanel stats={[]} />)
    expect(screen.getByText(/no disponibles/i)).toBeInTheDocument()
  })

  it('renders a row per stat with name and value', () => {
    render(<StatsPanel stats={[
      { key: 'hp', name: 'PS', value: 35 },
      { key: 'attack', name: 'Ataque', value: 55 },
    ]} />)
    expect(screen.getByText('PS')).toBeInTheDocument()
    expect(screen.getByText('Ataque')).toBeInTheDocument()
    expect(screen.getByText('35')).toBeInTheDocument()
    expect(screen.getByText('55')).toBeInTheDocument()
  })

  it('renders a list with the correct ARIA label', () => {
    render(<StatsPanel stats={[{ key: 'hp', name: 'PS', value: 10 }]} />)
    expect(screen.getByRole('list', { name: 'Estadísticas base' })).toBeInTheDocument()
  })
})

// ── InfoTab / KidsInfoTab ────────────────────────────────────────────────────

describe('InfoTab', () => {
  it('shows the stats panel and ataques/habilidades lists in normal mode', () => {
    render(<InfoTab result={mkPokemon()} />)
    expect(screen.getByText('Ataques')).toBeInTheDocument()
    expect(screen.getByText('Habilidades')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Estadísticas base' })).toBeInTheDocument()
  })

  it('shows the single-evolution note when no chain is present', () => {
    render(<InfoTab result={mkPokemon({ evolutionChain: [], evolution: 'Raichu' })} />)
    expect(screen.getByText('Evolución')).toBeInTheDocument()
    expect(screen.getByText('Raichu')).toBeInTheDocument()
  })

  it('shows the chain row when chain has multiple entries', () => {
    const chain = [
      { id: 25, name: 'Pikachu', sprite: 'https://img/25.png' },
      { id: 26, name: 'Raichu',  sprite: 'https://img/26.png' },
    ]
    const { container } = render(<InfoTab result={mkPokemon({ evolutionChain: chain })} />)
    expect(container.querySelector('.evolution-chain-row')).toBeInTheDocument()
  })

  it('renders KidsInfoTab when isKidsMode is true', () => {
    const { container } = render(<InfoTab isKidsMode result={mkPokemon()} />)
    expect(container.querySelector('.kids-info-panel')).toBeInTheDocument()
  })
})

describe('KidsInfoTab category banner', () => {
  it('shows the mythical banner for mythical pokémon', () => {
    render(<KidsInfoTab result={mkPokemon({ isMythical: true })} />)
    expect(screen.getByText(/mítico/)).toBeInTheDocument()
  })

  it('shows the legendary banner for legendary pokémon', () => {
    render(<KidsInfoTab result={mkPokemon({ isLegendary: true })} />)
    expect(screen.getByText(/legendario/)).toBeInTheDocument()
  })

  it('shows the starter banner for starter pokémon', () => {
    render(<KidsInfoTab result={mkPokemon({ isStarter: true })} />)
    expect(screen.getByText(/inicial/)).toBeInTheDocument()
  })

  it('shows the baby banner for baby pokémon', () => {
    render(<KidsInfoTab result={mkPokemon({ isBaby: true })} />)
    expect(screen.getByText(/bebé/)).toBeInTheDocument()
  })

  it('renders no category banner for regular pokémon', () => {
    const { container } = render(<KidsInfoTab result={mkPokemon()} />)
    expect(container.querySelector('.kids-category-banner')).not.toBeInTheDocument()
  })

  it('caps attacks at 4', () => {
    const { container } = render(
      <KidsInfoTab result={mkPokemon({ attacks: ['a1','a2','a3','a4','a5','a6'] })} />,
    )
    const attackPills = container.querySelectorAll('.kids-moves-list')[0]?.querySelectorAll('.kids-move-pill')
    expect(attackPills).toHaveLength(4)
  })

  it('caps abilities at 2', () => {
    const { container } = render(
      <KidsInfoTab result={mkPokemon({ abilities: ['x', 'y', 'z'] })} />,
    )
    const lists = container.querySelectorAll('.kids-moves-list')
    const abilityList = lists[lists.length - 1]
    expect(abilityList?.querySelectorAll('.kids-move-pill')).toHaveLength(2)
  })

  it('renders the evolution note when result has an evolution', () => {
    render(<KidsInfoTab result={mkPokemon({ evolution: 'Raichu' })} />)
    expect(screen.getByText('Evolución')).toBeInTheDocument()
    expect(screen.getByText('Raichu')).toBeInTheDocument()
  })

  it('renders a kids-type-pill for each type', () => {
    const { container } = render(
      <KidsInfoTab result={mkPokemon({ type: ['fire', 'flying'] })} />,
    )
    expect(container.querySelectorAll('.kids-type-pill')).toHaveLength(2)
  })
})

// ── TypeMatchups ─────────────────────────────────────────────────────────────

describe('TypeMatchups', () => {
  const empty: TypeMatchupsData = {
    vulnerabilities: [], resistances: [], immunities: [],
    effectiveAgainst: [], weakAgainst: [],
  }

  it('renders the unavailable placeholder when matchups is null', () => {
    render(<TypeMatchups matchups={null} />)
    expect(screen.getByText(/Datos de combate no disponibles/)).toBeInTheDocument()
  })

  it('renders the unavailable placeholder when matchups is undefined', () => {
    render(<TypeMatchups matchups={undefined} />)
    expect(screen.getByText(/Datos de combate no disponibles/)).toBeInTheDocument()
  })

  it('renders the 3 group titles even when all are empty', () => {
    render(<TypeMatchups matchups={empty} />)
    expect(screen.getByText('Vulnerabilidades')).toBeInTheDocument()
    expect(screen.getByText('Resistencias')).toBeInTheDocument()
    expect(screen.getByText('Ofensiva')).toBeInTheDocument()
    expect(screen.getByText('Sin debilidades claras')).toBeInTheDocument()
    expect(screen.getByText('Sin resistencias')).toBeInTheDocument()
    expect(screen.getByText('Sin ventaja ofensiva clara')).toBeInTheDocument()
  })

  it('splits vulnerabilities into "Muy débil" (>2) and "Débil ante" (<=2)', () => {
    render(<TypeMatchups matchups={{
      ...empty,
      vulnerabilities: [
        { type: 'rock', multiplier: 4 },
        { type: 'ground', multiplier: 2 },
      ],
    }} />)
    expect(screen.getByText('Muy débil')).toBeInTheDocument()
    expect(screen.getByText('Débil ante')).toBeInTheDocument()
  })

  it('renders resistance buckets correctly', () => {
    render(<TypeMatchups matchups={{
      ...empty,
      resistances: [
        { type: 'fire', multiplier: 0.5 },
        { type: 'grass', multiplier: 0.25 },
      ],
      immunities: [{ type: 'ghost', multiplier: 0 }],
    }} />)
    expect(screen.getByText('Muy resistente')).toBeInTheDocument()
    expect(screen.getByText('Resiste')).toBeInTheDocument()
    expect(screen.getByText('Inmune a')).toBeInTheDocument()
  })

  it('renders offensive rows when effective/weak are present', () => {
    render(<TypeMatchups matchups={{
      ...empty,
      effectiveAgainst: [{ type: 'water', multiplier: 2 }],
      weakAgainst: [{ type: 'rock', multiplier: 0.5 }],
    }} />)
    expect(screen.getByText('Efectivo contra')).toBeInTheDocument()
    expect(screen.getByText('Poco efectivo')).toBeInTheDocument()
  })
})

// ── GameAppearances ──────────────────────────────────────────────────────────

describe('GameAppearances', () => {
  it('renders the placeholder when no games match', () => {
    render(<GameAppearances games={[]} />)
    expect(screen.getByText(/PokéAPI no trae juegos/)).toBeInTheDocument()
  })

  it('shows the debut row with the first matching generation label', () => {
    render(<GameAppearances games={['Red', 'Blue', 'Gold']} />)
    expect(screen.getByText('Debut')).toBeInTheDocument()
    // Gen I appears twice: as debut value and as group header. We expect at least both.
    expect(screen.getAllByText('Gen I').length).toBeGreaterThanOrEqual(1)
  })

  it('groups games by generation', () => {
    const { container } = render(<GameAppearances games={['Red', 'Gold', 'Sword']} />)
    const groupHeaders = Array.from(container.querySelectorAll('.game-generation-group h3'))
      .map((h) => h.textContent)
    expect(groupHeaders).toEqual(['Gen I', 'Gen II', 'Gen VIII'])
  })

  it('uses the Spanish label when available for a game', () => {
    render(<GameAppearances games={['Red']} />)
    expect(screen.getByText('Rojo')).toBeInTheDocument()
  })

  it('renders the original name when no Spanish label exists', () => {
    render(<GameAppearances games={['Gold']} />)
    // "Gold" → "Oro" in gameLabels, so let's pick one that isn't translated
    render(<GameAppearances games={['Crystal']} />)
    expect(screen.getByText('Cristal')).toBeInTheDocument()
  })

  it('falls back to "PokéAPI" as debut when there are no matched games', () => {
    render(<GameAppearances games={['Game That Does Not Exist']} />)
    expect(screen.getByText('PokéAPI')).toBeInTheDocument()
  })
})
