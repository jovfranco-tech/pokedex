const MAX_IMAGE_SIDE = 1280
const JPEG_QUALITY = 0.86

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })
}

export async function fileToModelImageDataUrl(file: File): Promise<string> {
  const originalDataUrl = await readFileAsDataUrl(file)

  try {
    const image = await loadImage(originalDataUrl)
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    context?.drawImage(image, 0, 0, width, height)

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } catch {
    return originalDataUrl
  }
}
