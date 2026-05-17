import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const API_BASE = 'https://pokeapi.co/api/v2'
const DEFAULT_APP_URL = 'http://localhost:5174'
const sampleIds = [
  1, 4, 7, 25, 39, 54, 94, 133, 143, 150,
  151, 152, 155, 158, 172, 196, 197, 248, 252, 255,
  258, 282, 303, 384, 387, 390, 393, 448, 493, 495,
  498, 501, 658, 700, 722, 725, 728, 778, 906, 909,
]

function argValue(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`))
  return match ? match.slice(name.length + 1) : fallback
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function idFromResourceUrl(url) {
  return Number(url.match(/\/(\d+)\/?$/)?.[1])
}

function artworkUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

function normalizeName(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function expectedNameFromFile(filePath) {
  const fileName = relative(process.cwd(), filePath).split('/').pop() ?? filePath
  return fileName
    .replace(/\.[^.]+$/, '')
    .split('__')[0]
    .replace(/[_-]+/g, ' ')
    .trim()
}

function listImageFiles(directory) {
  const files = []

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      files.push(...listImageFiles(fullPath))
      continue
    }

    if (['.jpg', '.jpeg', '.png', '.webp'].includes(extname(fullPath).toLowerCase())) files.push(fullPath)
  }

  return files.sort()
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No pude leer ${url}`)
  return response.json()
}

async function loadCandidates() {
  const countData = await fetchJson(`${API_BASE}/pokemon?limit=1`)
  const limit = Number.isInteger(countData.count) ? countData.count : 1350
  const speciesData = await fetchJson(`${API_BASE}/pokemon?limit=${limit}`)

  return speciesData.results.map((entry) => ({
    id: idFromResourceUrl(entry.url),
    name: entry.name,
    displayName: entry.name,
  }))
}

async function imageUrlToDataUrl(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No pude descargar imagen ${url}`)

  const contentType = response.headers.get('content-type') || 'image/png'
  const buffer = Buffer.from(await response.arrayBuffer())
  return `data:${contentType};base64,${buffer.toString('base64')}`
}

function localImageToDataUrl(filePath) {
  const extension = extname(filePath).toLowerCase()
  const contentType = extension === '.png'
    ? 'image/png'
    : extension === '.webp'
      ? 'image/webp'
      : 'image/jpeg'
  const buffer = readFileSync(filePath)
  return `data:${contentType};base64,${buffer.toString('base64')}`
}

async function identifySample({ appUrl, candidates, detail, id }) {
  const imageDataUrl = await imageUrlToDataUrl(artworkUrl(id))
  const response = await fetch(`${appUrl}/api/identify-pokemon`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: `official-artwork-${id}.png`,
      imageDataUrl,
      detail,
      candidates,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      expectedId: id,
      ok: false,
      error: payload.error || `HTTP ${response.status}`,
    }
  }

  return {
    expectedId: id,
    predictedId: payload.pokemonId,
    predictedName: payload.pokemonName,
    confidenceScore: payload.confidenceScore,
    model: payload.model,
    ok: payload.pokemonId === id,
    reason: payload.reason,
  }
}

async function identifyLocalPhoto({ appUrl, candidates, detail, filePath }) {
  const expectedName = expectedNameFromFile(filePath)
  const imageDataUrl = localImageToDataUrl(filePath)
  const response = await fetch(`${appUrl}/api/identify-pokemon`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: relative(process.cwd(), filePath),
      imageDataUrl,
      detail,
      candidates,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      expectedName,
      filePath,
      ok: false,
      error: payload.error || `HTTP ${response.status}`,
    }
  }

  return {
    expectedName,
    filePath,
    predictedId: payload.pokemonId,
    predictedName: payload.pokemonName,
    confidenceScore: payload.confidenceScore,
    model: payload.model,
    ok: normalizeName(payload.pokemonName).includes(normalizeName(expectedName))
      || normalizeName(expectedName).includes(normalizeName(payload.pokemonName)),
    reason: payload.reason,
  }
}

async function main() {
  const appUrl = argValue('--base', DEFAULT_APP_URL)
  const detail = argValue('--detail', 'low')
  const photosDirectory = argValue('--photos', '')
  const limit = Number(argValue('--limit', String(sampleIds.length)))
  const selectedIds = sampleIds.slice(0, Math.max(1, Math.min(limit, sampleIds.length)))

  if (photosDirectory) {
    const photoPaths = listImageFiles(resolve(process.cwd(), photosDirectory)).slice(0, Math.max(1, limit))

    if (hasFlag('--dry-run')) {
      console.log(`Fotos listas: ${photoPaths.length}`)
      console.log(photoPaths.map((filePath) => `${expectedNameFromFile(filePath)} -> ${relative(process.cwd(), filePath)}`).join('\n'))
      return
    }

    const candidates = await loadCandidates()
    const startedAt = new Date().toISOString()
    const results = []

    for (const filePath of photoPaths) {
      const result = await identifyLocalPhoto({ appUrl, candidates, detail, filePath })
      results.push(result)
      const status = result.ok ? 'OK' : 'FALLO'
      console.log(`${status} ${relative(process.cwd(), filePath)} -> ${result.predictedName || result.error} (${result.confidenceScore ?? '-'}%)`)
    }

    const passed = results.filter((result) => result.ok).length
    const report = {
      startedAt,
      finishedAt: new Date().toISOString(),
      appUrl,
      detail,
      photosDirectory,
      total: results.length,
      passed,
      score: results.length ? Math.round((passed / results.length) * 100) : 0,
      results,
    }

    mkdirSync(resolve(process.cwd(), 'reports'), { recursive: true })
    writeFileSync(resolve(process.cwd(), 'reports/vision-eval-photos-latest.json'), JSON.stringify(report, null, 2))

    console.log(`\nResultado fotos: ${passed}/${results.length} (${report.score}%)`)
    console.log('Reporte: reports/vision-eval-photos-latest.json')
    return
  }

  if (hasFlag('--dry-run')) {
    console.log(`Muestras listas: ${selectedIds.length}`)
    console.log(selectedIds.map((id) => `${id}: ${artworkUrl(id)}`).join('\n'))
    return
  }

  const candidates = await loadCandidates()
  const startedAt = new Date().toISOString()
  const results = []

  for (const id of selectedIds) {
    const result = await identifySample({ appUrl, candidates, detail, id })
    results.push(result)
    const status = result.ok ? 'OK' : 'FALLO'
    console.log(`${status} #${id} -> ${result.predictedName || result.error} (${result.confidenceScore ?? '-'}%)`)
  }

  const passed = results.filter((result) => result.ok).length
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    appUrl,
    detail,
    total: results.length,
    passed,
    score: Math.round((passed / results.length) * 100),
    results,
  }

  mkdirSync(resolve(process.cwd(), 'reports'), { recursive: true })
  writeFileSync(resolve(process.cwd(), 'reports/vision-eval-latest.json'), JSON.stringify(report, null, 2))

  console.log(`\nResultado: ${passed}/${results.length} (${report.score}%)`)
  console.log('Reporte: reports/vision-eval-latest.json')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
