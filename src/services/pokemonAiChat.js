import { answerPokemonQuestion, shouldUseLocalPokemonAnswer } from './pokemonAssistant.js'
import { tryAnswerStructuredPokemonQuestion } from './pokemonKnowledge.js'

const CHAT_TIMEOUT_MS = 5200

export async function askPokemonAssistant(question, pokemon) {
  const localAnswer = answerPokemonQuestion(question, pokemon)
  const structuredAnswer = await tryAnswerStructuredPokemonQuestion(question, pokemon)

  if (structuredAnswer) {
    return {
      answer: structuredAnswer,
      source: 'local',
    }
  }

  if (shouldUseLocalPokemonAnswer(question, pokemon)) {
    return {
      answer: localAnswer,
      source: 'local',
    }
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

  try {
    const response = await fetch('/api/pokemon-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, pokemon }),
      signal: controller.signal,
    })
    window.clearTimeout(timeoutId)

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        answer: localAnswer,
        source: payload.code === 'missing_openai_key' ? 'local' : 'local-fallback',
        error: payload.error ?? 'La IA real no respondió.',
      }
    }

    return {
      answer: payload.answer,
      source: 'openai',
      model: payload.model,
    }
  } catch (error) {
    window.clearTimeout(timeoutId)

    return {
      answer: localAnswer,
      source: 'local-fallback',
      error: error.name === 'AbortError' ? 'La IA tardó demasiado; usé la respuesta local.' : error.message,
    }
  }
}
