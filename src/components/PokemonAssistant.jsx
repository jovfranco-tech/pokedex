import { Bot, Mic, Send, Trash2, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { askPokemonAssistant } from '../services/pokemonAiChat.js'
import { speakPokedexLine } from '../utils/pokedexVoice.js'

const fallbackQuestions = [
  '¿Este Pokémon es legendario?',
  '¿Qué Pokémon son míticos?',
  'Diferencia entre legendario y mítico',
  'Lista Pokémon de agua',
  'Compara Mewtwo vs Mew',
  '¿Cuál es la evolución de este Pokémon?',
  '¿Qué Pokémon evolucionan con piedra?',
]

function getAnswerParagraphs(text = '') {
  const cleanText = text.trim()
  if (!cleanText) return []

  const explicitParagraphs = cleanText.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  if (explicitParagraphs.length > 1) return explicitParagraphs

  if (cleanText.length < 220) return [cleanText]

  const sentences = cleanText.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)?.map((part) => part.trim()) ?? [cleanText]
  const paragraphs = []
  let current = ''

  sentences.forEach((sentence) => {
    const next = current ? `${current} ${sentence}` : sentence
    if (next.length > 190 && current) {
      paragraphs.push(current)
      current = sentence
    } else {
      current = next
    }
  })

  if (current) paragraphs.push(current)
  return paragraphs
}

export function PokemonAssistant({ pokemon }) {
  const [question, setQuestion] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [visibleAnswer, setVisibleAnswer] = useState('')
  const [source, setSource] = useState('local')
  const [isThinking, setIsThinking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    return () => recognitionRef.current?.stop?.()
  }, [])

  useEffect(() => {
    if (isThinking || !answer) {
      return undefined
    }

    let index = 0
    let timeoutId
    const chunkSize = answer.length > 420 ? 16 : 10

    function revealNextChunk() {
      index = Math.min(answer.length, index + chunkSize)
      setVisibleAnswer(answer.slice(0, index))

      if (index < answer.length) {
        timeoutId = window.setTimeout(revealNextChunk, 12)
      }
    }

    timeoutId = window.setTimeout(revealNextChunk, 8)
    return () => window.clearTimeout(timeoutId)
  }, [answer, isThinking])

  async function submitQuestion(value) {
    const trimmedQuestion = value.trim()
    if (!trimmedQuestion) return

    setIsThinking(true)
    setLastQuestion(trimmedQuestion)
    setAnswer('')
    setVisibleAnswer('')
    setQuestion('')
    setSpeechError('')

    const response = await askPokemonAssistant(trimmedQuestion, pokemon)
    setAnswer(response.answer)
    setSource(response.source)
    setIsThinking(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    submitQuestion(question)
  }

  function handleSpeak(text = answer) {
    speakPokedexLine(text, { rate: 0.88, pitch: 0.62, withBeep: true })
  }

  function handleVoiceQuestion() {
    setSpeechError('')
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechError('Este navegador no permite dictado por voz aquí. Puedes escribir la pregunta.')
      return
    }

    recognitionRef.current?.stop?.()
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'es-MX'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => {
      setIsListening(false)
      setSpeechError('No pude escuchar bien. Intenta otra vez o escribe la pregunta.')
    }
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? ''
      if (transcript) submitQuestion(transcript)
    }
    recognition.start()
  }

  function handleClear() {
    setLastQuestion('')
    setAnswer('')
    setVisibleAnswer('')
    setQuestion('')
    setSpeechError('')
  }

  return (
    <section className="assistant-panel">
      <div className="assistant-panel-actions">
        <span>{source === 'openai' ? 'Chat IA real' : 'Chat IA local'}</span>
        <div>
          <button type="button" onClick={() => handleSpeak()} disabled={!answer} aria-label="Leer respuesta">
            <Volume2 className="size-4" />
          </button>
          <button type="button" onClick={handleClear} aria-label="Limpiar conversación">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {!lastQuestion && !isThinking && !answer ? (
        <div className="assistant-welcome">
          <div className="assistant-avatar">
            {pokemon?.sprite ? <img src={pokemon.sprite} alt="" /> : <div className="pokedex-logo-mark" aria-hidden="true" />}
          </div>
          <p>
            ¡Hola! Soy tu Pokédex IA. Puedo responder cualquier pregunta
            {pokemon ? <> sobre <strong>{pokemon.name}</strong>.</> : ' sobre Pokémon.'}
          </p>
          <button type="button" className="assistant-mic-hint" onClick={handleVoiceQuestion}>
            <Mic className="size-4" />
            También puedes hablarme usando el micrófono
          </button>
          <div className="assistant-question-list">
            {fallbackQuestions.map((item) => (
              <button key={item} type="button" onClick={() => submitQuestion(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="assistant-dialogue">
          <div className="assistant-user-bubble">
            {lastQuestion}
          </div>

          <div className="assistant-answer-row">
            <span className="assistant-bot-dot">
              {isThinking ? <span className="assistant-thinking-pokeball" /> : <Bot className="size-4" />}
            </span>
            <div className="assistant-answer-bubble">
              {isThinking || !visibleAnswer ? (
                <span className="assistant-thinking-dots" aria-label="Pensando como Pokédex IA">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                getAnswerParagraphs(visibleAnswer).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {speechError && <p className="assistant-speech-error">{speechError}</p>}

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <button
          type="button"
          className={`assistant-mic-button ${isListening ? 'assistant-mic-button-active' : ''}`}
          aria-label="Dictar pregunta"
          onClick={handleVoiceQuestion}
          disabled={isThinking}
        >
          <Mic className="size-5" />
        </button>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={pokemon ? `Pregunta sobre ${pokemon.name}...` : 'Pregunta sobre Pokémon...'}
          disabled={isThinking}
          className="min-h-12 min-w-0 flex-1 rounded-lg border-2 border-dex-shell bg-white px-3 text-base font-extrabold text-dex-ink outline-none transition focus:ring-4 focus:ring-dex-blue/20"
        />
        <button type="submit" className="icon-button" aria-label="Preguntar" disabled={isThinking}>
          <Send className="size-5" />
        </button>
      </form>
    </section>
  )
}
