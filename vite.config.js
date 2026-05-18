import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { openaiVisionApiPlugin } from './server/openaiVisionApi.js'
import { VitePWA } from 'vite-plugin-pwa'

function readHttpsOptions(env) {
  const wantsHttps = /^(1|true|yes)$/i.test(env.POKEDEX_HTTPS ?? '')
  if (!wantsHttps) return undefined

  const keyPath = resolve(process.cwd(), env.POKEDEX_HTTPS_KEY || 'certs/localhost-key.pem')
  const certPath = resolve(process.cwd(), env.POKEDEX_HTTPS_CERT || 'certs/localhost.pem')

  if (!existsSync(keyPath) || !existsSync(certPath)) {
    console.warn('[pokedex] POKEDEX_HTTPS=true, pero faltan certificados. Ejecuta npm run cert:local.')
    return undefined
  }

  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const https = readHttpsOptions(env)

  return {
    plugins: [
      openaiVisionApiPlugin({ env }),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/pokeapi\.co\/api\/v2\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'pokeapi-cache',
                expiration: {
                  maxEntries: 1200,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'pokemon-sprites-cache',
                expiration: {
                  maxEntries: 2000,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      host: '0.0.0.0',
      port: 5174,
      ...(https ? { https } : {}),
    },
    preview: {
      host: '0.0.0.0',
      port: 4174,
      ...(https ? { https } : {}),
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      globals: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react-vendor'
            if (id.includes('node_modules/framer-motion')) return 'motion-vendor'
            if (id.includes('node_modules/lucide-react')) return 'icons-vendor'
            if (id.includes('src/data/pokemonFullCatalog.json')) return 'pokemon-catalog'
            return undefined
          },
        },
      },
    },
  }
})
