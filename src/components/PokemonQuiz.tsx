import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useState } from 'react'
import type { PokemonIndexItem } from '../services/pokeApi.js'

interface Question {
  pokemon: PokemonIndexItem | null
  options: PokemonIndexItem[]
}

function pickQuizPokemon(index: PokemonIndexItem[]): PokemonIndexItem | null {
  const pool = index.filter((p) => !p.isMega && !p.isPrimal && p.id <= 1025)
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

function buildOptions(index: PokemonIndexItem[], correct: PokemonIndexItem): PokemonIndexItem[] {
  const pool = index.filter((p) => !p.isMega && !p.isPrimal && p.id !== correct.id)
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3)
  return [...shuffled, correct].sort(() => Math.random() - 0.5)
}

function makeQuestion(index: PokemonIndexItem[]): Question {
  const pokemon = pickQuizPokemon(index)
  return { pokemon, options: pokemon ? buildOptions(index, pokemon) : [] }
}

interface PokemonQuizProps {
  index: PokemonIndexItem[]
  onClose: () => void
}

export function PokemonQuiz({ index, onClose }: PokemonQuizProps) {
  const prefersReducedMotion = useReducedMotion()
  const [{ pokemon, options }, setQuestion] = useState<Question>(() => makeQuestion(index))
  const [selected, setSelected] = useState<PokemonIndexItem | null>(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [questionKey, setQuestionKey] = useState(0)

  function nextQuestion() {
    setQuestion(makeQuestion(index))
    setSelected(null)
    setQuestionKey((k) => k + 1)
  }

  function handleAnswer(option: PokemonIndexItem) {
    if (selected !== null) return
    setSelected(option)
    setTotal((t) => t + 1)
    if (option.id === pokemon?.id) setScore((s) => s + 1)
  }

  if (!pokemon) return null

  const revealed = selected !== null
  const correct = revealed && selected.id === pokemon.id

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2 className="quiz-title">¿Quién es ese Pokémon?</h2>
        <div className="quiz-score" aria-live="polite" aria-atomic="true">{score}/{total}</div>
        <button type="button" className="assistant-modal-close" aria-label="Cerrar quiz" onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Silhouette — scales + un-blurs on reveal */}
      <div className="quiz-silhouette-wrap">
        <m.img
          key={`sprite-${questionKey}`}
          src={pokemon.sprite}
          alt={revealed ? pokemon.displayName : 'Pokémon desconocido'}
          className={`quiz-silhouette ${revealed ? 'quiz-silhouette-revealed' : ''}`}
          animate={revealed
            ? { scale: 1.08, filter: 'brightness(1) drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }
            : { scale: 1, filter: 'brightness(0) drop-shadow(none)' }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
        />
        <AnimatePresence>
          {revealed && (
            <m.p
              className="quiz-pokemon-name"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25 }}
            >
              {pokemon.displayName}
            </m.p>
          )}
        </AnimatePresence>
      </div>

      {/* Options — stagger in on each new question */}
      <m.div
        key={`options-${questionKey}`}
        className="quiz-options"
        role="group"
        aria-label="Opciones de respuesta"
      >
        {options.map((option, i) => {
          let cls = 'quiz-option'
          let ariaCurrent: 'true' | undefined
          if (revealed) {
            if (option.id === pokemon.id) { cls += ' quiz-option-correct'; ariaCurrent = 'true' }
            else if (option.id === selected?.id) cls += ' quiz-option-wrong'
            else cls += ' quiz-option-dim'
          }
          return (
            <m.button
              key={option.id}
              type="button"
              className={cls}
              aria-current={ariaCurrent}
              onClick={() => handleAnswer(option)}
              disabled={revealed}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, delay: i * 0.05 }}
            >
              {option.displayName}
            </m.button>
          )
        })}
      </m.div>

      {/* Result — slides up */}
      <AnimatePresence>
        {revealed && (
          <m.div
            className="quiz-result"
            role="status"
            aria-live="polite"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.28, type: 'spring', bounce: 0.3 }}
          >
            <p className="quiz-result-text">
              {correct ? '¡Correcto! 🎉' : `Era ${pokemon.displayName} 😅`}
            </p>
            <button type="button" className="quiz-next-button" onClick={nextQuestion}>
              Siguiente →
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
