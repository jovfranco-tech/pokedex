import { useCallback, useEffect, useRef, useState } from 'react'

export function useImagePreview() {
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const objectUrlRef = useRef('')

  const updateImageFile = useCallback((file) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = ''
    }

    setImageFile(file)

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

  function clearImage() {
    updateImageFile(null)
  }

  return {
    imageFile,
    previewUrl,
    setImageFile: updateImageFile,
    clearImage,
  }
}
