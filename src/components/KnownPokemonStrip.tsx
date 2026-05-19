import { Sparkles } from 'lucide-react'
import { formatPokemonNumber } from '../utils/formatPokemonNumber.js'
import type { PokemonIndexItem } from '../services/pokeApi.js'

interface KnownPokemonStripProps {
  onSelect?: (item: PokemonIndexItem) => void
  pokemon: PokemonIndexItem[]
}

export function KnownPokemonStrip({ onSelect, pokemon }: KnownPokemonStripProps) {
  return (
    <section className="mt-4 rounded-lg border border-dex-shell/10 bg-white/75 p-3 shadow-[0_10px_30px_rgba(22,23,28,0.08)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase text-dex-redDark/75">Atajos familiares</p>
          <h2 className="text-xl font-black leading-tight text-dex-ink">Pokémon populares para probar rápido</h2>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border-2 border-dex-shell bg-dex-yellow shadow-[0_4px_0_#16171c]">
          <Sparkles className="size-5" aria-hidden="true" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
        {pokemon.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Elegir ${item.name}`}
            onClick={() => onSelect?.(item)}
            className="pokopia-cell min-h-32 p-2 text-center"
          >
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-[#f4f1fb]">
              <img src={item.sprite} alt="" className="h-16 w-16 object-contain" loading="lazy" />
            </div>
            <p className="mt-1 text-xs font-black text-dex-ink/50">{formatPokemonNumber(item.id)}</p>
            <h3 className="truncate text-base font-black text-dex-ink">{item.name}</h3>
          </button>
        ))}
      </div>
    </section>
  )
}
