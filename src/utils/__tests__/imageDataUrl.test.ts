import { describe, it, expect, vi, afterEach } from 'vitest'
import { fileToModelImageDataUrl } from '../imageDataUrl.ts'

function makeFile(name = 'test.png'): File {
  return new File([new Uint8Array(10)], name, { type: 'image/png' })
}

// ── Canvas mock ───────────────────────────────────────────────────────────────

let mockDrawImage: ReturnType<typeof vi.fn>
let mockToDataURL: ReturnType<typeof vi.fn>

function setupCanvasMock(outputDataUrl: string, imgWidth = 100, imgHeight = 100) {
  mockDrawImage = vi.fn()
  mockToDataURL = vi.fn(() => outputDataUrl)

  const originalCreate = document.createElement.bind(document)

  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      const canvas = originalCreate('canvas') as HTMLCanvasElement
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.getContext = vi.fn(() => ({ drawImage: mockDrawImage })) as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.toDataURL = mockToDataURL as any
      return canvas
    }
    return originalCreate(tag)
  })

  // Mock Image constructor
  vi.stubGlobal('Image', class MockImage {
    width = imgWidth
    height = imgHeight
    crossOrigin = ''
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_val: string) {
      setTimeout(() => this.onload?.(), 0)
    }
  })
}

function setupImageErrorMock() {
  vi.stubGlobal('Image', class MockImageError {
    width = 0
    height = 0
    crossOrigin = ''
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_val: string) {
      setTimeout(() => this.onerror?.(), 0)
    }
  })
}

// ── FileReader mock ───────────────────────────────────────────────────────────

function setupFileReaderMock(dataUrl: string) {
  vi.stubGlobal('FileReader', class MockFileReader {
    result: string = dataUrl
    onload: (() => void) | null = null
    onerror: ((e: unknown) => void) | null = null
    readAsDataURL() {
      setTimeout(() => this.onload?.(), 0)
    }
  })
}

function setupFileReaderErrorMock() {
  vi.stubGlobal('FileReader', class MockFileReaderError {
    result = ''
    onload: (() => void) | null = null
    onerror: ((e: Error) => void) | null = null
    readAsDataURL() {
      setTimeout(() => this.onerror?.(new Error('read error')), 0)
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('fileToModelImageDataUrl', () => {
  it('returns the compressed jpeg data URL when image loads ok', async () => {
    setupFileReaderMock('data:image/png;base64,abc')
    setupCanvasMock('data:image/jpeg;base64,compressed', 100, 100)

    const result = await fileToModelImageDataUrl(makeFile())
    expect(result).toBe('data:image/jpeg;base64,compressed')
  })

  it('falls back to original dataUrl when Image fails to load', async () => {
    const originalUrl = 'data:image/png;base64,original'
    setupFileReaderMock(originalUrl)
    setupImageErrorMock()

    const result = await fileToModelImageDataUrl(makeFile())
    expect(result).toBe(originalUrl)
  })

  it('scales down images larger than 1280px on longest side', async () => {
    setupFileReaderMock('data:image/png;base64,big')
    setupCanvasMock('data:image/jpeg;base64,small', 2560, 1920)

    await fileToModelImageDataUrl(makeFile())

    // scale = 1280/2560 = 0.5 → 1280×960
    expect(mockDrawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1280, 960)
  })

  it('does not upscale images smaller than 1280px', async () => {
    setupFileReaderMock('data:image/png;base64,small')
    setupCanvasMock('data:image/jpeg;base64,unchanged', 640, 480)

    await fileToModelImageDataUrl(makeFile())

    // scale = 1 → original dimensions
    expect(mockDrawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 640, 480)
  })

  it('handles square images at exact 1280px (no scale)', async () => {
    setupFileReaderMock('data:image/png;base64,sq')
    setupCanvasMock('data:image/jpeg;base64,sq', 1280, 1280)

    await fileToModelImageDataUrl(makeFile())

    expect(mockDrawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1280, 1280)
  })

  it('scales square images larger than 1280px', async () => {
    setupFileReaderMock('data:image/png;base64,bigsq')
    setupCanvasMock('data:image/jpeg;base64,sq', 1600, 1600)

    await fileToModelImageDataUrl(makeFile())

    // scale = 1280/1600 = 0.8 → 1280×1280
    expect(mockDrawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1280, 1280)
  })

  it('rejects when FileReader errors', async () => {
    setupFileReaderErrorMock()

    await expect(fileToModelImageDataUrl(makeFile())).rejects.toBeDefined()
  })
})
