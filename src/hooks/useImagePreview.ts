import { useCallback, useEffect, useRef, useState } from 'react'

export interface ImagePreviewState {
  imageFile: File | null
  previewUrl: string
  setImageFile: (file: File | null) => void
  clearImage: () => void
}

export function useImagePreview(): ImagePreviewState {
  const [imageFile, setImageFileState] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const objectUrlRef = useRef('')

  const updateImageFile = useCallback((file: File | null): void => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = ''
    }

    setImageFileState(file)

    if (file) {
      const nextUrl = URL.createObjectURL(file)
      objectUrlRef.current = nextUrl
      setPreviewUrl(nextUrl)
    } else {
      setPreviewUrl('')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  function clearImage(): void {
    updateImageFile(null)
  }

  return {
    imageFile,
    previewUrl,
    setImageFile: updateImageFile,
    clearImage,
  }
}
