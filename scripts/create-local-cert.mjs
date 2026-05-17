import { mkdirSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const keyPath = resolve(process.cwd(), 'certs/localhost-key.pem')
const certPath = resolve(process.cwd(), 'certs/localhost.pem')

function localIps() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry?.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address)
}

const subjectAltName = [
  'DNS:localhost',
  'IP:127.0.0.1',
  'IP:::1',
  ...localIps().map((ip) => `IP:${ip}`),
].join(',')

mkdirSync(dirname(keyPath), { recursive: true })

const result = spawnSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-sha256',
    '-days',
    '825',
    '-keyout',
    keyPath,
    '-out',
    certPath,
    '-subj',
    '/CN=localhost',
    '-addext',
    `subjectAltName=${subjectAltName}`,
  ],
  { stdio: 'inherit' },
)

if (result.error || result.status !== 0) {
  console.error('\nNo pude crear el certificado. Revisa que OpenSSL esté instalado en tu sistema.')
  process.exit(result.status || 1)
}

console.log('\nCertificado local creado:')
console.log(`- ${keyPath}`)
console.log(`- ${certPath}`)
console.log('\nDespués ejecuta: npm run dev:https')
