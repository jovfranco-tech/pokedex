const MAX_BODY_BYTES = 8 * 1024 * 1024
const MAX_NARRATE_TEXT = 600
const MAX_VISION_CANDIDATES = 900
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

// --- Rate limiter (per-IP sliding window) --------------------------------
const _rateWindows = new Map() // ip → [timestamp, ...]

function getClientIp(request) {
  return (
    (request.headers['x-forwarded-for'] ?? '').split(',')[0].trim() ||
    request.socket?.remoteAddress ||
    'unknown'
  )
}

function isRateLimited(ip, limit, windowMs = 60_000) {
  const now = Date.now()
  const timestamps = (_rateWindows.get(ip) ?? []).filter((t) => now - t < windowMs)
  if (timestamps.length >= limit) return true
  timestamps.push(now)
  _rateWindows.set(ip, timestamps)
  return false
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['isPokemon', 'pokemonName', 'pokemonId', 'confidenceScore', 'reason', 'candidates'],
  properties: {
    isPokemon: {
      type: 'boolean',
      description: 'Whether the image appears to contain a Pokémon character, card, toy, drawing, sprite, or screenshot.',
    },
    pokemonName: {
      type: 'string',
      description: 'Best matching canonical English Pokémon species name, or an empty string if no Pokémon is visible.',
    },
    pokemonId: {
      type: 'integer',
      description: 'Best matching candidate ID. Use the PokéAPI form ID for Mega/Primal forms, or 0 if unknown.',
    },
    confidenceScore: {
      type: 'integer',
      minimum: 0,
      maximum: 100,
      description: 'Visual confidence from 0 to 100.',
    },
    reason: {
      type: 'string',
      description: 'Short child-friendly Spanish reason mentioning visual clues.',
    },
    candidates: {
      type: 'array',
      minItems: 0,
      maxItems: 3,
      description: 'Up to three plausible Pokémon candidates ordered from most likely to least likely.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['pokemonName', 'pokemonId', 'confidenceScore', 'reason'],
        properties: {
          pokemonName: {
            type: 'string',
            description: 'Canonical English Pokémon species name, or empty string.',
          },
          pokemonId: {
            type: 'integer',
            description: 'Candidate National Pokédex species ID, form ID, or 0 if unknown.',
          },
          confidenceScore: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
          reason: {
            type: 'string',
            description: 'Short Spanish visual reason for this candidate.',
          },
        },
      },
    },
  },
}

function getConfiguredModel(env, type) {
  const sharedModel = env.OPENAI_MODEL || process.env.OPENAI_MODEL

  if (type === 'chat') {
    return env.OPENAI_CHAT_MODEL || process.env.OPENAI_CHAT_MODEL || sharedModel || env.OPENAI_VISION_MODEL || process.env.OPENAI_VISION_MODEL || 'gpt-5-mini'
  }

  return env.OPENAI_VISION_MODEL || process.env.OPENAI_VISION_MODEL || sharedModel || 'gpt-5-mini'
}

function getModelFallbacks(primaryModel) {
  return [...new Set([primaryModel, 'gpt-4o-mini'])]
}

function shouldTryNextModel(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return error?.statusCode === 400 || error?.statusCode === 404 || message.includes('verified') || message.includes('model')
}

function getImageDetail(value, env) {
  const configured = value || env.OPENAI_VISION_DETAIL || process.env.OPENAI_VISION_DETAIL || 'high'
  return ['low', 'high', 'auto'].includes(configured) ? configured : 'high'
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

function readJsonBody(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    return Promise.resolve(request.body)
  }

  if (typeof request.body === 'string') {
    try {
      return Promise.resolve(JSON.parse(request.body || '{}'))
    } catch (error) {
      return Promise.reject(Object.assign(error, { statusCode: 400 }))
    }
  }

  if (Buffer.isBuffer(request.body)) {
    try {
      return Promise.resolve(JSON.parse(request.body.toString('utf8') || '{}'))
    } catch (error) {
      return Promise.reject(Object.assign(error, { statusCode: 400 }))
    }
  }

  return new Promise((resolve, reject) => {
    let body = ''
    let size = 0

    request.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload demasiado grande'), { statusCode: 413 }))
        request.destroy()
        return
      }
      body += chunk
    })

    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch (error) {
        reject(Object.assign(error, { statusCode: 400 }))
      }
    })

    request.on('error', reject)
  })
}

function extractOutputText(responseJson) {
  if (typeof responseJson.output_text === 'string') return responseJson.output_text

  for (const item of responseJson.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text
    }
  }

  return ''
}

async function identifyWithOpenAI({ apiKey, candidates, detail, fileName, imageDataUrl, model }) {
  const candidateList = candidates
    .slice(0, MAX_VISION_CANDIDATES)
    .map((pokemon) => `${pokemon.id}:${pokemon.name}`)
    .join(',')

  const openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                'You are a careful Pokémon visual identification engine for a family Pokédex app.',
                'Write the reason in Spanish, with simple wording for a child.',
                'Return only the Pokémon species that is visibly present in the image.',
                'The image may show a toy, card, drawing, screenshot, plush, figure, official artwork, sticker, or game sprite.',
                'Use visual evidence first: silhouette, colors, ears, tail, limbs, face, markings, wings, shell, flame, horns, and pose.',
                'The filename may contain a hint, but never choose a Pokémon from filename alone.',
                'If multiple Pokémon are visible, choose the largest or most central one.',
                'Also return up to three plausible candidates. Include the best match as the first candidate when possible.',
                'Prefer the closest National Pokédex species, not a form, regional variant, costume, or evolution family.',
                'Exception: if the image clearly shows a Mega Evolution or Primal form, choose the exact Mega/Primal candidate.',
                'Confidence guide: 90-100 only for clear iconic matches; 70-89 for likely matches; 40-69 for uncertain but visible; below 40 if too unclear.',
                'If the image is unclear or not a Pokémon, set isPokemon=false and confidenceScore below 35.',
                `Image filename: ${fileName || 'unknown'}`,
                `Valid candidates are: ${candidateList}`,
              ].join('\n'),
            },
            {
              type: 'input_image',
              image_url: imageDataUrl,
              detail,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'pokemon_visual_identification',
          strict: true,
          schema: responseSchema,
        },
      },
    }),
  })

  const responseJson = await openAiResponse.json()

  if (!openAiResponse.ok) {
    const message = responseJson.error?.message ?? 'OpenAI no pudo analizar la imagen.'
    throw Object.assign(new Error(message), { statusCode: openAiResponse.status })
  }

  const outputText = extractOutputText(responseJson)
  if (!outputText) throw new Error('OpenAI no devolvió una respuesta legible.')

  return JSON.parse(outputText)
}

async function answerWithOpenAI({ apiKey, model, pokemon, question }) {
  const context = pokemon
    ? {
      name: pokemon.name,
      id: pokemon.id,
      type: pokemon.type,
      isLegendary: pokemon.isLegendary,
      isMythical: pokemon.isMythical,
      description: pokemon.description,
      height: pokemon.height,
      weight: pokemon.weight,
      generation: pokemon.generation,
      stats: pokemon.stats,
      attacks: pokemon.attacks,
      abilities: pokemon.abilities,
      evolution: pokemon.evolution,
      matchups: pokemon.matchups,
      gameAppearances: pokemon.gameAppearances?.slice(0, 20),
    }
    : null

  const openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: [
        'Eres una Pokédex IA para uso familiar.',
        'Responde en español, claro, breve y divertido para niños y fans de Pokémon.',
        'Mantén la respuesta compacta: 2 o 3 párrafos cortos como máximo.',
        'Separa ideas con una línea en blanco para que el texto respire en pantalla móvil.',
        'Usa los datos del Pokémon seleccionado cuando estén disponibles.',
        'Si preguntan si es legendario, responde usando selectedPokemon.isLegendary. Si no es legendario pero selectedPokemon.isMythical es true, aclara que es mítico.',
        'Si preguntan si es mítico, responde usando selectedPokemon.isMythical. Si no es mítico pero selectedPokemon.isLegendary es true, aclara que es legendario.',
        'Si preguntan la diferencia entre legendario y mítico, explica que legendarios son mitos principales del mundo Pokémon y míticos son una categoría todavía más rara, a menudo ligada a eventos o historias especiales.',
        'Puedes responder preguntas generales de Pokédex como listas por tipo, generación, legendarios, míticos, comparaciones y recomendaciones contra un Pokémon.',
        'Si no sabes algo con certeza, dilo y ofrece una forma segura de comprobarlo.',
        'No des consejos peligrosos ni inventes datos técnicos como si fueran oficiales.',
      ].join('\n'),
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                question,
                selectedPokemon: context,
              }),
            },
          ],
        },
      ],
      max_output_tokens: 180,
    }),
  })

  const responseJson = await openAiResponse.json()

  if (!openAiResponse.ok) {
    const message = responseJson.error?.message ?? 'OpenAI no pudo responder el chat.'
    throw Object.assign(new Error(message), { statusCode: openAiResponse.status })
  }

  const outputText = extractOutputText(responseJson)
  if (!outputText) throw new Error('OpenAI no devolvió una respuesta para el chat.')

  return outputText.trim()
}

export async function handlePokemonChatRequest(request, response, env = {}) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Método no permitido.' })

  if (isRateLimited(getClientIp(request), 25)) {
    return sendJson(response, 429, { error: 'Demasiadas peticiones. Espera un momento e intenta de nuevo.' })
  }

  const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return sendJson(response, 424, {
      code: 'missing_openai_key',
      error: 'Falta OPENAI_API_KEY. Se usará el chat local.',
    })
  }

  try {
    const body = await readJsonBody(request)
    const question = String(body.question ?? '').trim()

    if (!question) return sendJson(response, 400, { error: 'Escribe una pregunta.' })

    let answer = ''
    let model = ''
    let lastError = null

    for (const candidateModel of getModelFallbacks(getConfiguredModel(env, 'chat'))) {
      try {
        answer = await answerWithOpenAI({
          apiKey,
          model: candidateModel,
          pokemon: body.pokemon ?? null,
          question,
        })
        model = candidateModel
        break
      } catch (error) {
        lastError = error
        if (!shouldTryNextModel(error)) break
      }
    }

    if (!answer) throw lastError ?? new Error('OpenAI no devolvió respuesta.')

    return sendJson(response, 200, { answer, model })
  } catch (error) {
    return sendJson(response, error.statusCode ?? 500, {
      error: error.message || 'No se pudo responder con IA real.',
    })
  }
}

export async function handleIdentifyPokemonRequest(request, response, env = {}) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Método no permitido.' })

  if (isRateLimited(getClientIp(request), 15)) {
    return sendJson(response, 429, { error: 'Demasiadas peticiones. Espera un momento e intenta de nuevo.' })
  }

  const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return sendJson(response, 424, {
      code: 'missing_openai_key',
      error: 'Falta OPENAI_API_KEY. Se usará identificación local por nombre de archivo.',
    })
  }

  try {
    const body = await readJsonBody(request)
    const imageDataUrl = body.imageDataUrl
    const candidates = Array.isArray(body.candidates) ? body.candidates : []
    const detail = getImageDetail(body.detail, env)

    if (!imageDataUrl?.startsWith('data:image/')) {
      return sendJson(response, 400, { error: 'La imagen debe enviarse como data URL.' })
    }

    if (!candidates.length) {
      return sendJson(response, 400, { error: 'No hay candidatos de Pokédex para comparar.' })
    }

    let result = null
    let model = ''
    let lastError = null

    for (const candidateModel of getModelFallbacks(getConfiguredModel(env, 'vision'))) {
      try {
        result = await identifyWithOpenAI({
          apiKey,
          candidates,
          detail,
          fileName: body.fileName,
          imageDataUrl,
          model: candidateModel,
        })
        model = candidateModel
        break
      } catch (error) {
        lastError = error
        if (!shouldTryNextModel(error)) break
      }
    }

    if (!result) throw lastError ?? new Error('OpenAI no devolvió identificación.')

    return sendJson(response, 200, {
      ...result,
      model,
    })
  } catch (error) {
    return sendJson(response, error.statusCode ?? 500, {
      error: error.message || 'No se pudo analizar la imagen con IA visual.',
    })
  }
}

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech'

export async function handleNarrateRequest(request, response, env = {}) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Método no permitido.' })

  if (isRateLimited(getClientIp(request), 30)) {
    return sendJson(response, 429, { error: 'Demasiadas peticiones. Espera un momento e intenta de nuevo.' })
  }

  const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return sendJson(response, 424, {
      code: 'missing_openai_key',
      error: 'Falta OPENAI_API_KEY. Se usará la voz del navegador.',
    })
  }

  try {
    const body = await readJsonBody(request)
    const text = String(body.text ?? '').trim()
    if (!text) return sendJson(response, 400, { error: 'Texto vacío.' })
    if (text.length > MAX_NARRATE_TEXT) return sendJson(response, 400, { error: 'Texto demasiado largo.' })

    const ttsResponse = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'onyx',
        input: text,
        speed: 0.92,
      }),
    })

    if (!ttsResponse.ok) {
      const err = await ttsResponse.json().catch(() => ({}))
      throw Object.assign(new Error(err.error?.message ?? 'TTS falló.'), { statusCode: ttsResponse.status })
    }

    const buffer = await ttsResponse.arrayBuffer()
    response.statusCode = 200
    response.setHeader('content-type', 'audio/mpeg')
    response.setHeader('cache-control', 'no-store')
    response.end(Buffer.from(buffer))
  } catch (error) {
    return sendJson(response, error.statusCode ?? 500, {
      error: error.message || 'No se pudo generar la narración.',
    })
  }
}

export function openaiVisionApiPlugin({ env = {} } = {}) {
  const middleware = async (request, response, next) => {
    if (request.url?.startsWith('/api/narrate')) {
      return handleNarrateRequest(request, response, env)
    }

    if (request.url?.startsWith('/api/pokemon-chat')) {
      return handlePokemonChatRequest(request, response, env)
    }

    if (!request.url?.startsWith('/api/identify-pokemon')) return next()
    return handleIdentifyPokemonRequest(request, response, env)
  }

  return {
    name: 'pokedex-openai-vision-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
