import { useState } from 'react'
import { X } from 'lucide-react'

function pickQuizPokemon(index) {
  const pool = index.filter((p) => !p.isMega && !p.isPrimal && p.id <= 1025)
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

function buildOptions(index, correct) {
  const pool = index.filter((p) => !p.isMega && !p.isPrimal && p.id !== correct.id)
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3)
  return [...shuffled, correct].sort(() => Math.random() - 0.5)
}

function makeQuestion(index) {
  const pokemon = pickQuizPokemon(index)
  return { pokemon, options: pokemon ? buildOptions(index, pokemon) : [] }
}

export function PokemonQuiz({ index, onClose }) {
  const [{ pokemon, options }, setQuestion] = useState(() => makeQuestion(index))
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)

  function nextQuestion() {
    setQuestion(makeQuestion(index))
    setSelected(null)
  }

  function handleAnswer(option) {
    if (selected !== null) return
    setSelected(option)
    setTotal((t) => t + 1)
    if (option.id === pokemon.id) setScore((s) => s + 1)
  }

  if (!pokemon) return null

  const revealed = selected !== null
  const correct = revealed && selected.id === pokemon.id

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2 className="quiz-title">¿Quién es ese Pokémon?</h2>
        <div className="quiz-score">{score}/{total}</div>
        <button type="button" className="assistant-modal-close" aria-label="Cerrar quiz" onClick={onClose}>
          <X className="size-5" />
        </button>
      </div>

      <div className="quiz-silhouette-wrap">
        <img
          src={pokemon.sprite}
          alt={revealed ? pokemon.displayName : '???'}
          className={`quiz-silhouette ${revealed ? 'quiz-silhouette-revealed' : ''}`}
        />
        {revealed && (
          <p className="quiz-pokemon-name">{pokemon.displayName}</p>
        )}
      </div>

      <div className="quiz-options">
        {options.map((option) => {
          let cls = 'quiz-option'
          if (revealed) {
            if (option.id === pokemon.id) cls += ' quiz-option-correct'
            else if (option.id === selected.id) cls += ' quiz-option-wrong'
            else cls += ' quiz-option-dim'
          }
          return (
            <button
              key={option.id}
              type="button"
              className={cls}
              onClick={() => handleAnswer(option)}
              disabled={revealed}
            >
              {option.displayName}
            </button>
          )
        })}
      </div>

      {revealed && (
        <div className="quiz-result">
          <p className="quiz-result-text">
            {correct ? '¡Correcto! 🎉' : `Era ${pokemon.displayName} 😅`}
          </p>
          <button type="button" className="quiz-next-button" onClick={nextQuestion}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
