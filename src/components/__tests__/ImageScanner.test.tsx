import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageScanner } from '../ImageScanner.tsx'

describe('ImageScanner', () => {
  const defaultProps = {
    error: '',
    imageFile: null,
    isScanning: false,
    onImageSelected: vi.fn(),
    onReset: vi.fn(),
    previewUrl: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Cámara and Subir buttons in empty state', () => {
    render(<ImageScanner {...defaultProps} />)
    expect(screen.getByLabelText(/Abrir cámara/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Subir imagen/i)).toBeInTheDocument()
  })

  it('does not render preview when previewUrl is empty', () => {
    render(<ImageScanner {...defaultProps} />)
    expect(screen.queryByAltText(/Vista previa/i)).not.toBeInTheDocument()
  })

  it('renders preview when previewUrl is provided', () => {
    render(<ImageScanner {...defaultProps} previewUrl="blob:preview-1" imageFile={new File([''], 'shot.png', { type: 'image/png' })} />)
    const img = screen.getByAltText(/Vista previa/i) as HTMLImageElement
    expect(img.src).toContain('preview-1')
    expect(screen.getByText('shot.png')).toBeInTheDocument()
  })

  it('shows "Analizando..." while scanning', () => {
    render(<ImageScanner {...defaultProps} previewUrl="blob:x" isScanning />)
    expect(screen.getByText('Analizando...')).toBeInTheDocument()
  })

  it('shows "Última imagen" when not scanning', () => {
    render(<ImageScanner {...defaultProps} previewUrl="blob:x" />)
    expect(screen.getByText('Última imagen')).toBeInTheDocument()
  })

  it('renders the error message when error prop is provided', () => {
    render(<ImageScanner {...defaultProps} error="Imagen demasiado grande" />)
    expect(screen.getByText('Imagen demasiado grande')).toBeInTheDocument()
  })

  it('calls onReset when reset button is clicked', () => {
    const onReset = vi.fn()
    render(<ImageScanner {...defaultProps} previewUrl="blob:x" onReset={onReset} />)
    fireEvent.click(screen.getByLabelText(/Nuevo escaneo/i))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('triggers the hidden gallery input when Subir is clicked', () => {
    const { container } = render(<ImageScanner {...defaultProps} />)
    const fileInputs = container.querySelectorAll('input[type="file"]')
    // Two inputs: one for camera (capture=environment), one gallery
    expect(fileInputs).toHaveLength(2)
    const clickSpy = vi.spyOn(fileInputs[1] as HTMLInputElement, 'click')
    fireEvent.click(screen.getByLabelText(/Subir imagen/i))
    expect(clickSpy).toHaveBeenCalled()
  })

  it('falls back to the hidden camera input when getUserMedia is not available', async () => {
    // jsdom does not implement mediaDevices — explicitly remove it
    const originalMediaDevices = navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })

    const { container } = render(<ImageScanner {...defaultProps} />)
    const cameraInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement
    const clickSpy = vi.spyOn(cameraInput, 'click')
    fireEvent.click(screen.getByLabelText(/Abrir cámara/i))
    expect(clickSpy).toHaveBeenCalled()

    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: originalMediaDevices })
  })

  it('calls onImageSelected when a file is chosen via the input', () => {
    const onImageSelected = vi.fn()
    const { container } = render(<ImageScanner {...defaultProps} onImageSelected={onImageSelected} />)
    const galleryInput = container.querySelectorAll('input[type="file"]')[1] as HTMLInputElement
    const file = new File(['data'], 'pikachu.jpg', { type: 'image/jpeg' })

    // jsdom requires explicit assignment of files
    Object.defineProperty(galleryInput, 'files', { configurable: true, value: [file] })
    fireEvent.change(galleryInput)

    expect(onImageSelected).toHaveBeenCalledWith(file)
  })

  it('does not show the scan-glow class when not scanning', () => {
    const { container } = render(<ImageScanner {...defaultProps} previewUrl="blob:x" />)
    const preview = container.querySelector('.console-preview')
    expect(preview?.className).not.toContain('scan-glow')
  })

  it('adds the scan-glow class while scanning', () => {
    const { container } = render(<ImageScanner {...defaultProps} previewUrl="blob:x" isScanning />)
    const preview = container.querySelector('.console-preview')
    expect(preview?.className).toContain('scan-glow')
  })

  // ── Camera flow (getUserMedia happy path + capture) ──────────────────────

  describe('camera flow', () => {
    /** Build a fake MediaStream with a stop() spy on its single video track. */
    function fakeStream() {
      const stop = vi.fn()
      const track = { stop, kind: 'video' as const } as unknown as MediaStreamTrack
      const stream = { getTracks: () => [track] } as unknown as MediaStream
      return { stream, stop }
    }

    let originalMediaDevices: MediaDevices
    beforeEach(() => {
      originalMediaDevices = navigator.mediaDevices
    })

    function restoreMediaDevices() {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: originalMediaDevices,
      })
    }

    it('opens the live camera preview when getUserMedia succeeds', async () => {
      const { stream } = fakeStream()
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      })

      render(<ImageScanner {...defaultProps} />)
      fireEvent.click(screen.getByLabelText(/Abrir cámara/i))

      // Wait for the async getUserMedia chain to resolve
      await screen.findByLabelText(/Capturar fotograma/i)
      expect(screen.getByLabelText(/Cerrar cámara/i)).toBeInTheDocument()
      restoreMediaDevices()
    })

    it('falls back to the file input and shows an error when getUserMedia rejects', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: vi.fn().mockRejectedValue(new Error('NotAllowedError')) },
      })

      const { container } = render(<ImageScanner {...defaultProps} />)
      const cameraInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement
      const clickSpy = vi.spyOn(cameraInput, 'click')

      fireEvent.click(screen.getByLabelText(/Abrir cámara/i))
      // Wait one microtask for the rejected promise to settle
      await Promise.resolve()
      await Promise.resolve()

      expect(clickSpy).toHaveBeenCalled()
      expect(await screen.findByText(/No pude abrir la cámara/i)).toBeInTheDocument()
      restoreMediaDevices()
    })

    it('closes the camera (stops the stream) when X is clicked', async () => {
      const { stream, stop } = fakeStream()
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      })

      render(<ImageScanner {...defaultProps} />)
      fireEvent.click(screen.getByLabelText(/Abrir cámara/i))
      const closeBtn = await screen.findByLabelText(/Cerrar cámara/i)

      fireEvent.click(closeBtn)
      expect(stop).toHaveBeenCalled()
      expect(screen.queryByLabelText(/Capturar fotograma/i)).not.toBeInTheDocument()
      restoreMediaDevices()
    })

    it('shows an error when the video has no frame yet on capture', async () => {
      const { stream } = fakeStream()
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      })

      render(<ImageScanner {...defaultProps} />)
      fireEvent.click(screen.getByLabelText(/Abrir cámara/i))
      const captureBtn = await screen.findByLabelText(/Capturar fotograma/i)

      // jsdom <video> has videoWidth=0 by default → handleCaptureFrame returns early
      fireEvent.click(captureBtn)
      expect(await screen.findByText(/La cámara aún está preparando la imagen/i))
        .toBeInTheDocument()
      restoreMediaDevices()
    })

    it('captures a frame, calls onImageSelected with a File and stops the stream', async () => {
      const { stream, stop } = fakeStream()
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      })

      // Mock the canvas pipeline so toBlob returns a real Blob and drawImage doesn't error
      const ctx = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D
      const blob = new Blob(['fake-jpeg'], { type: 'image/jpeg' })
      const origGetContext = HTMLCanvasElement.prototype.getContext
      const origToBlob = HTMLCanvasElement.prototype.toBlob
      HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as typeof origGetContext
      HTMLCanvasElement.prototype.toBlob = vi.fn(function (this: HTMLCanvasElement, cb) {
        cb?.(blob)
      }) as unknown as typeof origToBlob

      const onImageSelected = vi.fn()
      render(<ImageScanner {...defaultProps} onImageSelected={onImageSelected} />)
      fireEvent.click(screen.getByLabelText(/Abrir cámara/i))
      const captureBtn = await screen.findByLabelText(/Capturar fotograma/i)

      // Fake a ready video element with dimensions
      const video = document.querySelector('video') as HTMLVideoElement
      Object.defineProperty(video, 'videoWidth',  { configurable: true, value: 640 })
      Object.defineProperty(video, 'videoHeight', { configurable: true, value: 480 })

      fireEvent.click(captureBtn)

      expect(onImageSelected).toHaveBeenCalledTimes(1)
      const file = onImageSelected.mock.calls[0][0] as File
      expect(file).toBeInstanceOf(File)
      expect(file.type).toBe('image/jpeg')
      expect(file.name).toMatch(/^pokedex-camera-\d+\.jpg$/)
      expect(stop).toHaveBeenCalled()  // stream stopped after capture

      // Restore canvas
      HTMLCanvasElement.prototype.getContext = origGetContext
      HTMLCanvasElement.prototype.toBlob = origToBlob
      restoreMediaDevices()
    })

    it('shows an error when canvas.toBlob returns null', async () => {
      const { stream } = fakeStream()
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      })

      const ctx = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D
      const origGetContext = HTMLCanvasElement.prototype.getContext
      const origToBlob = HTMLCanvasElement.prototype.toBlob
      HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as typeof origGetContext
      HTMLCanvasElement.prototype.toBlob = vi.fn(function (this: HTMLCanvasElement, cb) {
        cb?.(null as unknown as Blob)  // simulate failure to encode
      }) as unknown as typeof origToBlob

      const onImageSelected = vi.fn()
      render(<ImageScanner {...defaultProps} onImageSelected={onImageSelected} />)
      fireEvent.click(screen.getByLabelText(/Abrir cámara/i))
      const captureBtn = await screen.findByLabelText(/Capturar fotograma/i)

      const video = document.querySelector('video') as HTMLVideoElement
      Object.defineProperty(video, 'videoWidth',  { configurable: true, value: 640 })
      Object.defineProperty(video, 'videoHeight', { configurable: true, value: 480 })

      fireEvent.click(captureBtn)

      expect(onImageSelected).not.toHaveBeenCalled()
      expect(await screen.findByText(/No pude capturar la foto/i)).toBeInTheDocument()

      HTMLCanvasElement.prototype.getContext = origGetContext
      HTMLCanvasElement.prototype.toBlob = origToBlob
      restoreMediaDevices()
    })
  })
})
