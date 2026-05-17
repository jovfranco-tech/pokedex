import { getTypeMeta } from '../data/typeColors.js'

function normalize(text = '') {
  return String(text).replace(/\s+/g, ' ').trim()
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

// --- Shared AudioContext ----------------------------------------------
let _audioCtx = null

function getAudioContext() {
  if (_audioCtx) return _audioCtx
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  try { _audioCtx = new AudioCtx() } catch { return null }
  return _audioCtx
}

// --- Pre-unlocked Audio element (iOS requires play() from a gesture) --
let _audioEl = null

function getAudioEl() {
  if (_audioEl) return _audioEl
  if (typeof window === 'undefined') return null
  _audioEl = new Audio()
  _audioEl.preload = 'auto'
  return _audioEl
}

// --- Synchronous voice cache (fallback Web Speech API) ---------------
let _voices = []

function syncVoices() {
  const v = window.speechSynthesis?.getVoices?.() ?? []
  if (v.length) _voices = v
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  syncVoices()
  window.speechSynthesis.addEventListener('voiceschanged', syncVoices)
}

function chooseRoboticVoice() {
  syncVoices()
  if (!_voices.length) return null
  const spanishVoices = _voices.filter((v) => /^es(-|$)/i.test(v.lang))
  const pool = spanishVoices.length ? spanishVoices : _voices
  return (
    pool.find((v) => /google/i.test(v.name)) ??
    pool.find((v) => /microsoft/i.test(v.name)) ??
    pool[0]
  )
}

// --- Unlock on first gesture ------------------------------------------
function unlockAll() {
  // Web Audio
  const ctx = getAudioContext()
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {})

  // Audio element (iOS: play() from gesture unlocks it for later use)
  const audio = getAudioEl()
  if (audio) {
    audio.play().catch(() => {})
    audio.pause()
  }

  // Web Speech API
  if (window.speechSynthesis) {
    syncVoices()
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', unlockAll, { capture: true, passive: true, once: true })
  window.addEventListener('pointerdown', unlockAll, { capture: true, passive: true, once: true })
}

// --- Beep (Dexter computer style) ------------------------------------

function scheduleTone(ctx, freq, startSec, durationSec, gain = 0.22) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, ctx.currentTime + startSec)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startSec + durationSec)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(ctx.currentTime + startSec)
  osc.stop(ctx.currentTime + startSec + durationSec)
}

export function playPokedexBeep() {
  if (typeof window === 'undefined') return Promise.resolve()
  try {
    const ctx = getAudioContext()
    if (!ctx) return Promise.resolve()
    const go = () => {
      scheduleTone(ctx, 1400, 0.00, 0.07)
      scheduleTone(ctx, 1900, 0.09, 0.09)
      return wait(240)
    }
    return ctx.state === 'suspended'
      ? ctx.resume().then(go).catch(() => Promise.resolve())
      : go()
  } catch {
    return Promise.resolve()
  }
}

// --- OpenAI TTS with IndexedDB persistence (#1) ----------------------

const TTS_DB_NAME = 'pokedex-tts-v1'
const TTS_STORE = 'audio'
const TTS_CACHE_MAX = 50
const _ttsMemCache = new Map() // text → Blob (session-level, fast)

function openTtsDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const req = indexedDB.open(TTS_DB_NAME, 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(TTS_STORE)) {
        db.createObjectStore(TTS_STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

async function idbGetBlob(key) {
  try {
    const db = await openTtsDb()
    if (!db) return null
    return new Promise((resolve) => {
      const req = db.transaction(TTS_STORE, 'readonly').objectStore(TTS_STORE).get(key)
      req.onsuccess = () => resolve(req.result?.blob ?? null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

async function idbSetBlob(key, blob) {
  try {
    const db = await openTtsDb()
    if (!db) return
    const tx = db.transaction(TTS_STORE, 'readwrite')
    const store = tx.objectStore(TTS_STORE)
    const count = await new Promise((r) => { const q = store.count(); q.onsuccess = () => r(q.result); q.onerror = () => r(0) })
    if (count >= TTS_CACHE_MAX) {
      const cursor = await new Promise((r) => { const q = store.openCursor(); q.onsuccess = (e) => r(e.target.result); q.onerror = () => r(null) })
      cursor?.delete()
    }
    store.put({ key, blob })
  } catch {
    // IndexedDB is optional; errors are silently ignored
  }
}

function playBlob(blob) {
  const url = URL.createObjectURL(blob)
  const audio = getAudioEl() ?? new Audio()
  return new Promise((resolve) => {
    const cleanup = () => { URL.revokeObjectURL(url); resolve() }
    const guard = window.setTimeout(cleanup, 30_000)
    const done = () => { window.clearTimeout(guard); cleanup() }
    audio.addEventListener('ended', done, { once: true })
    audio.addEventListener('error', done, { once: true })
    audio.src = url
    audio.load()
    audio.play().catch(done)
  })
}

async function fetchAndPlayTTS(text) {
  const key = text.trim()

  // 1. Memory cache (fast, current session)
  const memBlob = _ttsMemCache.get(key)
  if (memBlob) return playBlob(memBlob)

  // 2. IndexedDB cache (persisted across sessions)
  const idbBlob = await idbGetBlob(key)
  if (idbBlob) { _ttsMemCache.set(key, idbBlob); return playBlob(idbBlob) }

  // 3. Fetch from OpenAI TTS API
  const response = await fetch('/api/narrate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    return { unavailable: data.code === 'missing_openai_key', error: data.error }
  }

  const blob = await response.blob()

  // Evict oldest memory entry if full
  if (_ttsMemCache.size >= TTS_CACHE_MAX) _ttsMemCache.delete(_ttsMemCache.keys().next().value)
  _ttsMemCache.set(key, blob)
  idbSetBlob(key, blob) // persist in background (no await)

  return playBlob(blob)
}

// --- Web Speech API fallback ------------------------------------------

export function speakSyncAndWait(text, options = {}) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve()
  const message = normalize(text)
  if (!message) return Promise.resolve()

  const utterance = new SpeechSynthesisUtterance(message)
  utterance.lang   = 'es-MX'
  utterance.rate   = options.rate   ?? 0.88
  utterance.pitch  = options.pitch  ?? 0.55
  utterance.volume = options.volume ?? 1

  const voice = chooseRoboticVoice()
  if (voice) utterance.voice = voice

  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)

  return new Promise((resolve) => {
    const guard = window.setTimeout(resolve, 20_000)
    const done = () => { window.clearTimeout(guard); resolve() }
    utterance.onend   = done
    utterance.onerror = done
  })
}

// --- Public API -------------------------------------------------------

// Tries OpenAI TTS (onyx voice). If unavailable, falls back to Web
// Speech API. Beep always plays via AudioContext before the voice.
// options.onEnd() is called after speech finishes (useful for UI indicators).
export async function speakPokedexLine(text, options = {}) {
  if (!text) return
  const withBeep = options.withBeep !== false

  // On iOS beep and TTS fetch must start synchronously from the gesture.
  // Both calls below fire before any await so iOS accepts them.
  const beepPromise = withBeep ? playPokedexBeep() : Promise.resolve()

  try {
    // Fetch TTS audio (async — beep plays while we wait for the API)
    const ttsResult = await fetchAndPlayTTS(normalize(text))

    if (ttsResult && (ttsResult.unavailable || ttsResult.error)) {
      // No API key or error — fall back to Web Speech API
      await beepPromise
      await speakSyncAndWait(text, options)
    } else {
      // ttsResult is undefined when audio finished playing successfully
      await beepPromise
    }
  } catch {
    // Network error — fall back
    await beepPromise
    await speakSyncAndWait(text, options)
  }

  options.onEnd?.()
}

export async function speakWithPokedexVoice(text, options = {}) {
  return speakSyncAndWait(text, options)
}

// --- Announcement text -----------------------------------------------
export function buildPokedexAnnouncement(pokemon) {
  if (!pokemon) return ''
  const types = pokemon.type?.map((t) => getTypeMeta(t).label).join(' y ') ?? ''
  const description = pokemon.description ?? ''
  return normalize(`${pokemon.name}. Tipo ${types}. ${description}`)
}
