const { app, BrowserWindow, shell } = require('electron')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

let localServer

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
}

function parseDotEnv(contents) {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((env, line) => {
      const separatorIndex = line.indexOf('=')
      if (separatorIndex <= 0) return env

      const key = line.slice(0, separatorIndex).trim()
      let value = line.slice(separatorIndex + 1).trim()

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      env[key] = value
      return env
    }, {})
}

function readOptionalEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {}
    return parseDotEnv(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return {}
  }
}

function getDesktopEnv() {
  const env = { ...process.env }
  const userEnvPath = path.join(app.getPath('userData'), 'pokedex-ia.env')
  const localEnvPath = path.join(process.cwd(), '.env')

  for (const fileEnv of [readOptionalEnvFile(userEnvPath), !app.isPackaged ? readOptionalEnvFile(localEnvPath) : {}]) {
    for (const [key, value] of Object.entries(fileEnv)) {
      if (!env[key]) env[key] = value
    }
  }

  return env
}

async function createApiMiddleware() {
  const pluginPath = path.join(__dirname, '..', 'server', 'openaiVisionApi.js')
  const { openaiVisionApiPlugin } = await import(pathToFileURL(pluginPath).href)
  let middleware = null
  const plugin = openaiVisionApiPlugin({ env: getDesktopEnv() })

  plugin.configurePreviewServer({
    middlewares: {
      use(handler) {
        middleware = handler
      },
    },
  })

  return middleware
}

function sendText(response, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  response.statusCode = statusCode
  response.setHeader('content-type', contentType)
  response.end(text)
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase()
  response.statusCode = 200
  response.setHeader('content-type', mimeTypes[extension] ?? 'application/octet-stream')
  fs.createReadStream(filePath).pipe(response)
}

function serveStaticFile(request, response, distDir) {
  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
  const decodedPathname = decodeURIComponent(requestUrl.pathname)
  const requestedPath = decodedPathname === '/' ? '/index.html' : decodedPathname
  const targetPath = path.normalize(path.join(distDir, requestedPath))

  if (!targetPath.startsWith(distDir)) {
    sendText(response, 403, 'Ruta no permitida.')
    return
  }

  fs.stat(targetPath, (error, stat) => {
    if (!error && stat.isFile()) {
      sendFile(response, targetPath)
      return
    }

    if (path.extname(targetPath)) {
      sendText(response, 404, 'Archivo no encontrado.')
      return
    }

    sendFile(response, path.join(distDir, 'index.html'))
  })
}

async function startLocalServer() {
  const distDir = path.join(__dirname, '..', 'dist')
  const apiMiddleware = await createApiMiddleware()

  localServer = http.createServer((request, response) => {
    if (request.url?.startsWith('/api/') && apiMiddleware) {
      Promise.resolve(apiMiddleware(request, response, () => serveStaticFile(request, response, distDir)))
        .catch((error) => sendText(response, 500, error.message || 'Error interno de Pokédex IA.'))
      return
    }

    serveStaticFile(request, response, distDir)
  })

  await new Promise((resolve, reject) => {
    localServer.once('error', reject)
    localServer.listen(0, '127.0.0.1', resolve)
  })

  const address = localServer.address()
  return `http://127.0.0.1:${address.port}`
}

function createWindow(appUrl) {
  const window = new BrowserWindow({
    width: 1120,
    height: 820,
    minWidth: 390,
    minHeight: 640,
    title: 'Pokédex IA',
    backgroundColor: '#f6f8fb',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.loadURL(appUrl)

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(appUrl)) shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(appUrl)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  return window
}

app.whenReady().then(async () => {
  const appUrl = await startLocalServer()
  createWindow(appUrl)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(appUrl)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  localServer?.close()
})
