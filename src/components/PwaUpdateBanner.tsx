import { X } from 'lucide-react'
import { applySwUpdate } from '../utils/registerServiceWorker.js'

interface PwaUpdateBannerProps {
  onDismiss: () => void
}

export function PwaUpdateBanner({ onDismiss }: PwaUpdateBannerProps) {
  function handleReload() {
    applySwUpdate()
    window.location.reload()
  }

  return (
    <div className="sw-update-banner" role="alert">
      <span>🆕 Nueva versión disponible</span>
      <button
        type="button"
        className="sw-update-reload"
        onClick={handleReload}
      >
        Recargar
      </button>
      <button
        type="button"
        className="sw-update-dismiss"
        aria-label="Descartar"
        onClick={onDismiss}
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
