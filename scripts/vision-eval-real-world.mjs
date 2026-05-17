import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join, relative, resolve } from 'node:path'

const DEFAULT_APP_URL = 'http://localhost:5174'
const fixturePath = resolve(process.cwd(), 'scripts/vision-real-world-fixtures.json')
const catalogPath = resolve(process.cwd(), 'src/data/pokemonFullCatalog.json')

function argValue(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`))
  return match ? match.slice(name.length + 1) : fallback
}

function hasFlag(name) {
  return process.argv.includes(name)
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
  return basename(filePath)
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

function contentTypeFromPath(filePath) {
  const extension = extname(filePath).toLowerCase()
  if (extension === '.png') return 'image/png'
  if (extension === '.webp') return 'image/webp'
  return 'image/jpeg'
}

function loadCandidates() {
  return JSON.parse(readFileSync(catalogPath, 'utf8')).map((pokemon) => ({
    id: pokemon.id,
    name: pokemon.name,
    displayName: pokemon.displayName,
  }))
}

async function remoteImageToDataUrl(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No pude descargar ${url}`)

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const buffer = Buffer.from(await response.arrayBuffer())
  return `data:${contentType};base64,${buffer.toString('base64')}`
}

function localImageToDataUrl(filePath) {
  const buffer = readFileSync(filePath)
  return `data:${contentTypeFromPath(filePath)};base64,${buffer.toString('base64')}`
}

function isExpectedMatch(payload, expected) {
  if (expected.expectedId && payload.pokemonId === expected.expectedId) return true

  const expectedName = normalizeName(expected.expectedName)
  const predictedName = normalizeName(payload.pokemonName)
  return Boolean(expectedName && predictedName && (
    expectedName.includes(predictedName) || predictedName.includes(expectedName)
  ))
}

async function identify({ appUrl, candidates, detail, imageDataUrl, item }) {
  const response = await fetch(`${appUrl}/api/identify-pokemon`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: item.fileName || item.name,
      imageDataUrl,
      detail,
      candidates,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  const ok = response.ok && isExpectedMatch(payload, item)

  return {
    name: item.name,
    kind: item.kind,
    expectedId: item.expectedId ?? null,
    expectedName: item.expectedName,
    predictedId: payload.pokemonId ?? null,
    predictedName: payload.pokemonName ?? '',
    confidenceScore: payload.confidenceScore ?? null,
    model: payload.model ?? '',
    ok,
    status: response.status,
    reason: payload.reason ?? '',
    error: payload.error ?? '',
  }
}

async function main() {
  const appUrl = argValue('--base', DEFAULT_APP_URL)
  const detail = argValue('--detail', 'high')
  const photosDirectory = argValue('--photos', '')
  const limitArg = Number(argValue('--limit', '0'))
  const candidates = loadCandidates()
  const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8'))
  const items = []

  for (const fixture of fixtures) {
    items.push({ ...fixture, imageDataUrl: await remoteImageToDataUrl(fixture.url) })
  }

  if (photosDirectory) {
    for (const filePath of listImageFiles(resolve(process.cwd(), photosDirectory))) {
      items.push({
        name: relative(process.cwd(), filePath),
        fileName: relative(process.cwd(), filePath),
        expectedName: expectedNameFromFile(filePath),
        kind: 'local-photo',
        imageDataUrl: localImageToDataUrl(filePath),
      })
    }
  }

  const selectedItems = limitArg > 0 ? items.slice(0, limitArg) : items

  if (hasFlag('--dry-run')) {
    console.log(`Casos listos: ${selectedItems.length}`)
    console.log(selectedItems.map((item) => `${item.kind}: ${item.expectedName} -> ${item.name}`).join('\n'))
    return
  }

  const startedAt = new Date().toISOString()
  const results = []

  for (const item of selectedItems) {
    const result = await identify({
      appUrl,
      candidates,
      detail,
      imageDataUrl: item.imageDataUrl,
      item,
    })
    results.push(result)

    const status = result.ok ? 'OK' : 'FALLO'
    console.log(`${status} ${item.kind} ${item.expectedName} -> ${result.predictedName || result.error} (${result.confidenceScore ?? '-'}%)`)
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
  writeFileSync(resolve(process.cwd(), 'reports/vision-real-world-latest.json'), JSON.stringify(report, null, 2))

  console.log(`\nResultado real-world: ${passed}/${results.length} (${report.score}%)`)
  console.log('Reporte: reports/vision-real-world-latest.json')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
