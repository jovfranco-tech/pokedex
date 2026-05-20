import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImagePreview } from '../useImagePreview.ts'

function makeFile(name = 'pikachu.png'): File {
  return new File(['data'], name, { type: 'image/png' })
}

beforeEach(() => {
  URL.createObjectURL = vi.fn((f: File | Blob | MediaSource) => `blob:mock/${(f as File).name ?? 'blob'}`)
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useImagePreview', () => {
  it('starts with null imageFile and empty previewUrl', () => {
    const { result } = renderHook(() => useImagePreview())
    expect(result.current.imageFile).toBeNull()
    expect(result.current.previewUrl).toBe('')
  })

  it('sets imageFile and creates a blob URL when setImageFile is called', () => {
    const { result } = renderHook(() => useImagePreview())
    const file = makeFile()

    act(() => { result.current.setImageFile(file) })

    expect(result.current.imageFile).toBe(file)
    expect(result.current.previewUrl).toMatch(/^blob:/)
    expect(URL.createObjectURL).toHaveBeenCalledWith(file)
  })

  it('revokes the previous object URL when a new file is set', () => {
    const { result } = renderHook(() => useImagePreview())

    act(() => { result.current.setImageFile(makeFile('first.png')) })
    const firstUrl = result.current.previewUrl

    act(() => { result.current.setImageFile(makeFile('second.png')) })

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl)
  })

  it('clearImage resets imageFile to null and previewUrl to empty string', () => {
    const { result } = renderHook(() => useImagePreview())

    act(() => { result.current.setImageFile(makeFile()) })
    act(() => { result.current.clearImage() })

    expect(result.current.imageFile).toBeNull()
    expect(result.current.previewUrl).toBe('')
  })

  it('revokes the object URL when clearImage is called', () => {
    const { result } = renderHook(() => useImagePreview())

    act(() => { result.current.setImageFile(makeFile()) })
    const blobUrl = result.current.previewUrl

    act(() => { result.current.clearImage() })

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl)
  })

  it('sets previewUrl to empty string when setImageFile(null) is called', () => {
    const { result } = renderHook(() => useImagePreview())

    act(() => { result.current.setImageFile(makeFile()) })
    act(() => { result.current.setImageFile(null) })

    expect(result.current.previewUrl).toBe('')
    expect(result.current.imageFile).toBeNull()
  })

  it('revokes the object URL on unmount', () => {
    const { result, unmount } = renderHook(() => useImagePreview())

    act(() => { result.current.setImageFile(makeFile()) })
    const blobUrl = result.current.previewUrl

    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl)
  })

  it('does not revoke when no file has been set and clearImage is called', () => {
    const { result } = renderHook(() => useImagePreview())
    act(() => { result.current.clearImage() })
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })
})
