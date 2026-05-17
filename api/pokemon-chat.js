import { handlePokemonChatRequest } from '../server/openaiVisionApi.js'

export const config = {
  maxDuration: 30,
}

export default function handler(request, response) {
  return handlePokemonChatRequest(request, response)
}
