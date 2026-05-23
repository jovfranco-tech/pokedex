import type { PokemonDetail } from './pokeApi.js'
import { answerPokemonQuestion, shouldUseLocalPokemonAnswer } from './pokemonAssistant.js'
import { tryAnswerStructuredPokemonQuestion } from './pokemonKnowledge.js'

const CHAT_TIMEOUT_MS = 5200

export type ChatSource = 'local' | 'local-fallback' | 'openai'

export interface ChatResponse {
  answer: string
  source: ChatSource
  model?: string
  error?: string
}

interface ApiChatPayload {
  answer?: string
  model?: string
  code?: string
  error?: string
}

export async function askPokemonAssistant(
  question: string,
  pokemon: PokemonDetail | null,
  history: string[] = [],
  voiceOpts: { pitch?: number; accent?: string } = {}
): Promise<ChatResponse> {
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
      body: JSON.stringify({ question, pokemon, history, voiceOpts }),
      signal: controller.signal,
    })
    window.clearTimeout(timeoutId)

    const payload = await response.json().catch(() => ({})) as ApiChatPayload

    if (!response.ok) {
      return {
        answer: localAnswer,
        source: payload.code === 'missing_openai_key' ? 'local' : 'local-fallback',
        error: payload.error ?? 'La IA real no respondió.',
      }
    }

    return {
      answer: payload.answer ?? localAnswer,
      source: 'openai',
      model: payload.model,
    }
  } catch (error) {
    window.clearTimeout(timeoutId)

    return {
      answer: localAnswer,
      source: 'local-fallback',
      error: error instanceof Error && error.name === 'AbortError'
        ? 'La IA tardó demasiado; usé la respuesta local.'
        : (error instanceof Error ? error.message : 'Error desconocido'),
    }
  }
}
