/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register'

type UpdateCallback = () => void

let updateFn: (() => void) | undefined
const pendingListeners: UpdateCallback[] = []

/** Called by App.tsx to subscribe to the "update available" signal */
export function onSwUpdate(cb: UpdateCallback): () => void {
  pendingListeners.push(cb)
  return () => {
    const idx = pendingListeners.indexOf(cb)
    if (idx !== -1) pendingListeners.splice(idx, 1)
  }
}

/** Trigger the deferred SW swap + page reload */
export function applySwUpdate(): void {
  updateFn?.()
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  updateFn = registerSW({
    immediate: true,
    onNeedRefresh() {
      for (const cb of pendingListeners) cb()
    },
    onOfflineReady() {
      // App cached successfully — no UI needed
    },
  })
}
