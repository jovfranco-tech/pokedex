import { AnimatePresence, m } from 'framer-motion'
import { ErrorBoundary } from './ErrorBoundary.js'
import { PokemonQuiz } from './PokemonQuiz.js'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import type { PokemonIndexItem } from '../services/pokeApi.js'

interface QuizModalProps {
  isOpen: boolean
  onClose: () => void
  pokemonIndex: PokemonIndexItem[]
  prefersReducedMotion: boolean
  onCorrectAnswer?: () => void
}

export function QuizModal({ isOpen, onClose, pokemonIndex, prefersReducedMotion, onCorrectAnswer }: QuizModalProps) {
  const quizTrapRef = useFocusTrap(isOpen)

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
            ref={quizTrapRef}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.9 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', bounce: 0.25 }}
            className="assistant-modal quiz-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Quiz Pokémon"
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
          >
            <ErrorBoundary message="El quiz tuvo un problema. Prueba cerrándolo y volviéndolo a abrir.">
              <PokemonQuiz
                index={pokemonIndex.length ? pokemonIndex : []}
                onClose={onClose}
                onCorrectAnswer={onCorrectAnswer}
              />
            </ErrorBoundary>
          </m.section>
        </m.div>
      )}
    </AnimatePresence>
  )
}
