import { Camera, RotateCcw, UploadCloud, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ImageScannerProps {
  error: string
  imageFile: File | null
  isScanning: boolean
  onImageSelected: (file: File | null) => void
  onReset: () => void
  previewUrl: string
}

export function ImageScanner({
  error,
  imageFile,
  isScanning,
  onImageSelected,
  onReset,
  previewUrl,
}: ImageScannerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCameraLive, setIsCameraLive] = useState(false)
  const [cameraError, setCameraError] = useState('')

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsCameraLive(false)
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    stopCamera()
    onImageSelected(event.target.files?.[0] ?? null)
    event.target.value = ''
  }

  async function handleStartCamera() {
    setCameraError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click()
      return
    }

    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      setIsCameraLive(true)

      window.requestAnimationFrame(() => {
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        // play() returns void in some envs (older Safari, jsdom) → guard the Promise call.
        const playResult = videoRef.current.play()
        if (playResult && typeof playResult.catch === 'function') playResult.catch(() => {})
      })
    } catch {
      setCameraError('No pude abrir la cámara. Puedes usar Subir archivo.')
      cameraInputRef.current?.click()
    }
  }

  function handleCaptureFrame() {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError('La cámara aún está preparando la imagen.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    context?.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('No pude capturar la foto. Intenta otra vez.')
        return
      }

      const file = new File([blob], `pokedex-camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
      stopCamera()
      onImageSelected(file)
    }, 'image/jpeg', 0.9)
  }

  return (
    <section className="console-scan-module console-scan-module-minimal">
      {isCameraLive && (
        <div className="console-camera-preview">
          <video ref={videoRef} playsInline muted className="console-camera-video" />
          <div className="console-camera-reticle" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="console-camera-scanline" aria-hidden="true" />
          <div className="console-camera-controls">
            <button type="button" className="console-capture-button" onClick={handleCaptureFrame} aria-label="Capturar fotograma">
              <Camera className="size-4" aria-hidden="true" />
              Capturar
            </button>
            <button type="button" className="console-close-camera-button" onClick={stopCamera} aria-label="Cerrar cámara">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {!isCameraLive && previewUrl && (
        <div className={`console-preview ${isScanning ? 'scan-glow' : ''}`}>
          <img src={previewUrl} alt="Vista previa para identificar Pokémon" className="console-preview-image" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{imageFile?.name}</p>
            <p className="text-xs font-bold text-white/60">{isScanning ? 'Analizando...' : 'Última imagen'}</p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="console-reset-button ml-auto"
            title="Nuevo escaneo"
            aria-label="Nuevo escaneo"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      )}

      {(error || cameraError) && (
        <p className="console-error">
          {error || cameraError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleStartCamera}
          className="console-action-button console-action-dark"
          aria-label="Abrir cámara para escanear Pokémon"
        >
          <Camera className="size-5" aria-hidden="true" />
          Cámara
        </button>

        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="console-action-button console-action-light"
          aria-label="Subir imagen desde tu dispositivo"
        >
          <UploadCloud className="size-5" aria-hidden="true" />
          Subir
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </section>
  )
}
