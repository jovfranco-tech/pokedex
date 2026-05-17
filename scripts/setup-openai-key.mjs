import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const ENV_PATH = '.env'

function upsertEnvValue(contents, key, value) {
  const line = `${key}=${value}`
  const pattern = new RegExp(`^${key}=.*$`, 'm')

  if (pattern.test(contents)) return contents.replace(pattern, line)

  const separator = contents.trim() ? '\n' : ''
  return `${contents.trimEnd()}${separator}${line}\n`
}

function normalizeModel(value, fallback) {
  const normalized = value.trim()
  return normalized || fallback
}

const rl = createInterface({ input, output })

try {
  console.log('Configuración local de Pokédex IA + OpenAI')
  console.log('Tu API key se guarda solamente en el archivo .env de esta carpeta.\n')

  const apiKey = (await rl.question('Pega tu OPENAI_API_KEY: ')).trim()
  if (!apiKey) throw new Error('No escribiste una API key.')

  const sharedModel = normalizeModel(
    await rl.question('Modelo para visión/chat [gpt-5-mini]: '),
    'gpt-5-mini',
  )
  const detail = normalizeModel(
    await rl.question('Detalle de imagen: low, high o auto [high]: '),
    'high',
  )

  const currentEnv = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : ''
  const nextEnv = [
    ['OPENAI_API_KEY', apiKey],
    ['OPENAI_MODEL', sharedModel],
    ['OPENAI_VISION_DETAIL', detail],
  ].reduce((contents, [key, value]) => upsertEnvValue(contents, key, value), currentEnv)

  writeFileSync(ENV_PATH, nextEnv)
  console.log('\nListo. Reinicia la app con npm run dev para usar IA real.')
} catch (error) {
  console.error(`\nNo pude guardar la configuración: ${error.message}`)
  process.exitCode = 1
} finally {
  rl.close()
}
