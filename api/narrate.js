import { handleNarrateRequest } from '../server/openaiVisionApi.js'

export const config = {
  maxDuration: 15,
}

export default function handler(request, response) {
  return handleNarrateRequest(request, response)
}
