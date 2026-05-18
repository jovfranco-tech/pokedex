import { ignoredImageTokens } from '../data/pokemonAliases.js'
import { fileToModelImageDataUrl } from '../utils/imageDataUrl.js'
import {
  fetchPokemonDetails,
  loadPokemonIndex,
  normalizePokemonText,
  searchPokemonIndex,
} from './pokeApi.js'

const SCAN_DELAY_MS = 650
const MIN_IMAGE_MATCH_SCORE = 72
const MIN_AI_CONFIDENCE_SCORE = 38

const wait = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms))

// Session-level cache keyed by file fingerprint (avoids re-calling OpenAI for same photo)
const _visionCache = new Map()
const VISION_CACHE_MAX = 20

function fileFingerprint(file) {
  return `${file.name}|${file.size}|${file.lastModified}`
}

function fileNameTokens(fileName) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '')
  return normalizePokemonText(withoutExtension)
    .split(' ')
    .filter((token) => token.length >= 3 && !ignoredImageTokens.has(token))
}

export function scoreImageNameMatch(pokemon, tokens, compactName) {
  const normalizedName = normalizePokemonText(pokemon.name)
  const normalizedDisplayName = normalizePokemonText(pokemon.displayName)
  const aliases = (Array.isArray(pokemon.aliases) ? pokemon.aliases : []).map(normalizePokemonText)
  let score = 0

  if (compactName.includes(normalizedName.replaceAll(' ', ''))) score = Math.max(score, 98)
  if (compactName.includes(normalizedDisplayName.replaceAll(' ', ''))) score = Math.max(score, 98)

  for (const token of tokens) {
    if (token === normalizedName || token === normalizedDisplayName) score = Math.max(score, 99)
    if (aliases.includes(token)) score = Math.max(score, 98)
    if (token.length >= 4 && normalizedName.startsWith(token)) score = Math.max(score, 92)
    if (token.length >= 4 && normalizedDisplayName.startsWith(token)) score = Math.max(score, 90)
    if (aliases.some((alias) => alias.startsWith(token) && token.length >= 4)) score = Math.max(score, 88)
  }

  return score
}

function findImageNameMatches(file, index, limit = 3) {
  const tokens = fileNameTokens(file.name)
  const compactName = tokens.join('')

  if (!tokens.length) return []

  const directMatches = index
    .map((pokemon) => ({
      pokemon,
      score: scoreImageNameMatch(pokemon, tokens, compactName),
      reason: 'El nombre del archivo parece coincidir.',
    }))
    .filter((candidate) => candidate.score >= MIN_IMAGE_MATCH_SCORE)
    .sort((a, b) => b.score - a.score || a.pokemon.id - b.pokemon.id)

  if (directMatches.length) return directMatches.slice(0, limit)

  const textMatches = searchPokemonIndex(index, tokens.join(' '), limit)
  if (!textMatches.length) return []

  return textMatches.map((pokemon) => ({
    pokemon,
    score: Math.min(86, pokemon.score),
    reason: 'Coincidencia local con el texto del archivo.',
  }))
}

function findAiCandidateMatch(candidate, index) {
  if (!candidate?.pokemonName && !candidate?.pokemonId) return null

  const nameMatch = searchPokemonIndex(index, candidate.pokemonName, 1)[0]
  if (nameMatch) return nameMatch

  if (candidate.pokemonId) {
    const byId = index.find((pokemon) => pokemon.id === candidate.pokemonId)
    if (byId) return byId
  }

  return null
}

function findAiCandidateMatches(aiResult, index) {
  if (!aiResult?.isPokemon || aiResult.confidenceScore < MIN_AI_CONFIDENCE_SCORE) return []

  const rawCandidates = [
    {
      pokemonName: aiResult.pokemonName,
      pokemonId: aiResult.pokemonId,
      confidenceScore: aiResult.confidenceScore,
      reason: aiResult.reason,
    },
    ...(Array.isArray(aiResult.candidates) ? aiResult.candidates : []),
  ]

  const seen = new Set()
  return rawCandidates
    .map((candidate) => {
      const pokemon = findAiCandidateMatch(candidate, index)
      if (!pokemon) return null

      const key = pokemon.apiName ?? pokemon.name ?? pokemon.id
      if (seen.has(key)) return null
      seen.add(key)

      return {
        pokemon,
        score: Math.max(MIN_AI_CONFIDENCE_SCORE, Math.min(99, candidate.confidenceScore ?? aiResult.confidenceScore)),
        reason: candidate.reason || aiResult.reason || 'Coincidencia visual sugerida por IA.',
      }
    })
    .filter(Boolean)
    .slice(0, 3)
}

function scanCandidateSummaries(matches) {
  return matches.map(({ pokemon, reason, score }) => ({
    id: pokemon.id,
    apiName: pokemon.apiName ?? pokemon.name,
    name: pokemon.displayName ?? pokemon.name,
    displayNumber: pokemon.displayNumber,
    sprite: pokemon.sprite,
    confidenceScore: Math.round(score),
    reason,
  }))
}

async function identifyWithRealVision(file, index) {
  const imageDataUrl = await fileToModelImageDataUrl(file)
  const response = await fetch('/api/identify-pokemon', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      imageDataUrl,
      detail: 'high',
      candidates: index.map((pokemon) => ({
        id: pokemon.id,
        name: pokemon.name,
        displayName: pokemon.displayName,
      })),
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      unavailable: payload.code === 'missing_openai_key',
      error: payload.error ?? 'La IA visual no está disponible.',
      status: response.status,
    }
  }

  return payload
}

async function identifyWithFileName(file, index) {
  const matches = findImageNameMatches(file, index)
  const match = matches[0]
  if (!match) return null

  const detail = await fetchPokemonDetails(match.pokemon.name, {
    confidenceScore: Math.min(99, match.score),
    scannedAt: new Date().toISOString(),
    scanMode:
      match.score >= 92
        ? 'respaldo local por nombre de archivo'
        : 'respaldo local con pista de archivo',
  })

  return {
    ...detail,
    scanCandidates: scanCandidateSummaries(matches),
  }
}

export async function identifyPokemonFromImage(file, indexOverride) {
  const fp = fileFingerprint(file)
  const cached = _visionCache.get(fp)
  if (cached) return cached

  await wait(SCAN_DELAY_MS)

  const index = indexOverride?.length ? indexOverride : await loadPokemonIndex()
  const aiResult = await identifyWithRealVision(file, index)

  let result = null

  if (aiResult && !aiResult.unavailable && !aiResult.error) {
    const candidates = findAiCandidateMatches(aiResult, index)
    const match = candidates[0]
    if (match) {
      const detail = await fetchPokemonDetails(match.pokemon.name, {
        confidenceScore: match.score,
        scannedAt: new Date().toISOString(),
        scanMode: `IA visual real (${aiResult.model})`,
        visualReason: aiResult.reason,
      })
      result = { ...detail, scanCandidates: scanCandidateSummaries(candidates) }
    }
  }

  if (!result) result = await identifyWithFileName(file, index)

  if (result) {
    if (_visionCache.size >= VISION_CACHE_MAX) _visionCache.delete(_visionCache.keys().next().value)
    _visionCache.set(fp, result)
    return result
  }

  if (aiResult?.unavailable) {
    throw new Error('La IA visual no está configurada. Agrega OPENAI_API_KEY en Vercel para reconocer fotos de cartas, juguetes o cámara.')
  }

  if (aiResult?.status === 404) {
    throw new Error('La API de visión no está desplegada. Publica las funciones /api para reconocer fotos reales.')
  }

  if (aiResult?.error) throw new Error(aiResult.error)

  return null
}
