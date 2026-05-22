import { getTypeMeta } from '../data/typeColors.ts'
import type { PokemonDetail } from '../services/pokeApi.js'

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

function normalize(text = ''): string {
  return String(text).replace(/\s+/g, ' ').trim()
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

// --- Shared AudioContext ----------------------------------------------
let _audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (_audioCtx) return _audioCtx
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  try { _audioCtx = new AudioCtx() } catch { return null }
  return _audioCtx
}

// --- Pre-unlocked Audio element (iOS requires play() from a gesture) --
let _audioEl: HTMLAudioElement | null = null

function getAudioEl(): HTMLAudioElement | null {
  if (_audioEl) return _audioEl
  if (typeof window === 'undefined') return null
  _audioEl = new Audio()
  _audioEl.preload = 'auto'
  return _audioEl
}

// --- Synchronous voice cache (fallback Web Speech API) ---------------
let _voices: SpeechSynthesisVoice[] = []

function syncVoices(): void {
  const v = window.speechSynthesis?.getVoices?.() ?? []
  if (v.length) _voices = v
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  syncVoices()
  window.speechSynthesis.addEventListener('voiceschanged', syncVoices)
}

function chooseRoboticVoice(): SpeechSynthesisVoice | null {
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
function unlockAll(): void {
  // Web Audio
  const ctx = getAudioContext()
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {})

  // Audio element (iOS: play() from gesture unlocks it for later use)
  // play() returns void in some envs (older Safari, jsdom) → guard the Promise call.
  const audio = getAudioEl()
  if (audio) {
    const playResult = audio.play()
    if (playResult && typeof playResult.catch === 'function') playResult.catch(() => {})
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

function scheduleTone(ctx: AudioContext, freq: number, startSec: number, durationSec: number, gain = 0.22): void {
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

export function playPokedexBeep(): Promise<void> {
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

export function playUiClick(): void {
  if (typeof window === 'undefined' || isPokedexMuted()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const go = () => {
      scheduleTone(ctx, 1600, 0, 0.03, 0.1)
    }
    if (ctx.state === 'suspended') {
      ctx.resume().then(go).catch(() => {})
    } else {
      go()
    }
  } catch {
    // Safe fallback
  }
}

export function playUiSlideOpen(): void {
  if (typeof window === 'undefined' || isPokedexMuted()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const go = () => {
      const start = ctx.currentTime
      
      const osc1 = ctx.createOscillator()
      const g1 = ctx.createGain()
      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(440, start)
      osc1.frequency.exponentialRampToValueAtTime(880, start + 0.15)
      g1.gain.setValueAtTime(0.18, start)
      g1.gain.exponentialRampToValueAtTime(0.0001, start + 0.15)
      osc1.connect(g1)
      g1.connect(ctx.destination)
      osc1.start(start)
      osc1.stop(start + 0.15)

      const osc2 = ctx.createOscillator()
      const g2 = ctx.createGain()
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(660, start + 0.1)
      osc2.frequency.exponentialRampToValueAtTime(1320, start + 0.25)
      g2.gain.setValueAtTime(0.18, start + 0.1)
      g2.gain.exponentialRampToValueAtTime(0.0001, start + 0.25)
      osc2.connect(g2)
      g2.connect(ctx.destination)
      osc2.start(start + 0.1)
      osc2.stop(start + 0.25)

      const osc3 = ctx.createOscillator()
      const g3 = ctx.createGain()
      osc3.type = 'sine'
      osc3.frequency.setValueAtTime(880, start + 0.2)
      osc3.frequency.exponentialRampToValueAtTime(1760, start + 0.4)
      g3.gain.setValueAtTime(0.18, start + 0.2)
      g3.gain.exponentialRampToValueAtTime(0.0001, start + 0.4)
      osc3.connect(g3)
      g3.connect(ctx.destination)
      osc3.start(start + 0.2)
      osc3.stop(start + 0.4)
    }
    if (ctx.state === 'suspended') {
      ctx.resume().then(go).catch(() => {})
    } else {
      go()
    }
  } catch {
    // Safe fallback
  }
}

// --- OpenAI TTS with IndexedDB persistence (#1) ----------------------

const TTS_DB_NAME = 'pokedex-tts-v1'
const TTS_STORE = 'audio'
const TTS_CACHE_MAX = 50
const _ttsMemCache = new Map<string, Blob>() // text → Blob (session-level, fast)

function openTtsDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const req = indexedDB.open(TTS_DB_NAME, 1)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(TTS_STORE)) {
        db.createObjectStore(TTS_STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

async function idbGetBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openTtsDb()
    if (!db) return null
    return new Promise((resolve) => {
      const req = db.transaction(TTS_STORE, 'readonly').objectStore(TTS_STORE).get(key)
      req.onsuccess = () => resolve((req.result as { blob?: Blob })?.blob ?? null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

async function idbSetBlob(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openTtsDb()
    if (!db) return
    const tx = db.transaction(TTS_STORE, 'readwrite')
    const store = tx.objectStore(TTS_STORE)
    const count = await new Promise<number>((r) => {
      const q = store.count()
      q.onsuccess = () => r(q.result)
      q.onerror = () => r(0)
    })
    if (count >= TTS_CACHE_MAX) {
      const cursor = await new Promise<IDBCursorWithValue | null>((r) => {
        const q = store.openCursor()
        q.onsuccess = (e) => r((e.target as IDBRequest<IDBCursorWithValue | null>).result)
        q.onerror = () => r(null)
      })
      cursor?.delete()
    }
    store.put({ key, blob })
  } catch {
    // IndexedDB is optional; errors are silently ignored
  }
}

function playBlob(blob: Blob): Promise<void> {
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

interface TtsErrorResult {
  unavailable?: boolean
  error?: string
}

async function fetchAndPlayTTS(text: string): Promise<TtsErrorResult | undefined> {
  const key = text.trim()

  // 1. Memory cache (fast, current session)
  const memBlob = _ttsMemCache.get(key)
  if (memBlob) { await playBlob(memBlob); return undefined }

  // 2. IndexedDB cache (persisted across sessions)
  const idbBlob = await idbGetBlob(key)
  if (idbBlob) { _ttsMemCache.set(key, idbBlob); await playBlob(idbBlob); return undefined }

  // 3. Fetch from OpenAI TTS API
  const response = await fetch('/api/narrate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { code?: string; error?: string }
    return { unavailable: data.code === 'missing_openai_key', error: data.error }
  }

  const blob = await response.blob()

  // Evict oldest memory entry if full
  if (_ttsMemCache.size >= TTS_CACHE_MAX) {
    const oldestKey = _ttsMemCache.keys().next().value
    if (oldestKey !== undefined) _ttsMemCache.delete(oldestKey)
  }
  _ttsMemCache.set(key, blob)
  void idbSetBlob(key, blob) // persist in background (no await)

  await playBlob(blob)
  return undefined
}

// --- Web Speech API fallback ------------------------------------------

export interface SpeakOptions {
  withBeep?: boolean
  rate?: number
  pitch?: number
  volume?: number
  onEnd?: () => void
}

export function speakSyncAndWait(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve()
  const message = normalize(text)
  if (!message) return Promise.resolve()

  const utterance = new SpeechSynthesisUtterance(message)
  utterance.lang   = 'es-MX'
  utterance.rate   = options.rate   ?? 1.0
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

let _isMuted = false
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  _isMuted = localStorage.getItem('pokedex-visual-gen1:is-muted') === 'true'
}

export function isPokedexMuted(): boolean {
  return _isMuted
}

export function setPokedexMuted(muted: boolean): void {
  _isMuted = muted
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem('pokedex-visual-gen1:is-muted', String(muted))
  }
  if (muted) {
    stopPokedexVoice()
  }
}

export function stopPokedexVoice(): void {
  if (typeof window !== 'undefined') {
    // 1. Cancel Speech Synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    // 2. Reset Audio Element
    const audio = getAudioEl()
    if (audio) {
      try {
        audio.pause()
        audio.currentTime = 0
        audio.src = ''
      } catch {
        // Safe fallback
      }
    }
  }
}

// Tries OpenAI TTS (onyx voice). If unavailable, falls back to Web
// Speech API. Beep always plays via AudioContext before the voice.
// options.onEnd() is called after speech finishes (useful for UI indicators).
export async function speakPokedexLine(text: string, options: SpeakOptions = {}): Promise<void> {
  stopPokedexVoice()
  if (!text || isPokedexMuted()) {
    options.onEnd?.()
    return
  }
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

export async function speakWithPokedexVoice(text: string, options: SpeakOptions = {}): Promise<void> {
  stopPokedexVoice()
  if (isPokedexMuted()) return
  return speakSyncAndWait(text, options)
}

// --- Announcement text -----------------------------------------------
export function buildPokedexAnnouncement(pokemon: PokemonDetail | null): string {
  if (!pokemon) return ''
  const types = pokemon.type?.map((t) => getTypeMeta(t).label).join(' y ') ?? ''
  const description = pokemon.description ?? ''
  return normalize(`${pokemon.name}. Tipo ${types}. ${description}`)
}
