import { AnimatePresence, m } from 'framer-motion'
import { Bot, Volume2, X } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { ErrorBoundary } from './ErrorBoundary.js'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { speakPokedexLine } from '../utils/pokedexVoice.js'
import type { PokemonDetail } from '../services/pokeApi.js'

const PokemonAssistant = lazy(() =>
  import('./PokemonAssistant.js').then((module) => ({ default: module.PokemonAssistant }))
)

interface AssistantModalProps {
  isOpen: boolean
  onClose: () => void
  result: PokemonDetail | null
  prefersReducedMotion: boolean
  history?: string[]
  voicePitch?: number
  voiceAccent?: string
  onThinkingChange?: (thinking: boolean) => void
}

export function AssistantModal({ isOpen, onClose, result, prefersReducedMotion, history = [], voicePitch, voiceAccent, onThinkingChange }: AssistantModalProps) {
  const assistantTrapRef = useFocusTrap(isOpen)

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="assistant-modal-backdrop"
          role="presentation"
        >
          <m.section
            ref={assistantTrapRef}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.9 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', bounce: 0.25 }}
            className="assistant-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Pokédex IA"
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
          >
            <header className="assistant-modal-header">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/18">
                  <Bot className="size-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black text-white">Pokédex IA</h2>
                  <p className="truncate text-sm font-bold text-white/75">
                    {result ? `Pregunta sobre ${result.name}` : 'Pregunta sobre un Pokémon'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="assistant-modal-close"
                aria-label="Leer saludo de Pokédex IA"
                onClick={() => {
                  speakPokedexLine(
                    result ? `Hola. Soy tu Pokédex IA. Pregúntame sobre ${result.name}.` : 'Hola. Soy tu Pokédex IA.',
                    { rate: 1.0, pitch: 0.1, withBeep: true },
                  )
                }}
              >
                <Volume2 className="size-5" />
              </button>
              <button
                type="button"
                className="assistant-modal-close"
                aria-label="Cerrar Pokédex IA"
                onClick={onClose}
              >
                <X className="size-5" />
              </button>
            </header>
            <Suspense fallback={<div className="assistant-loading">Cargando asistente...</div>}>
              <ErrorBoundary message="El asistente tuvo un problema. Prueba recargando.">
                <PokemonAssistant pokemon={result} history={history} voicePitch={voicePitch} voiceAccent={voiceAccent} onThinkingChange={onThinkingChange} />
              </ErrorBoundary>
            </Suspense>
          </m.section>
        </m.div>
      )}
    </AnimatePresence>
  )
}
