import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../useLocalStorage.js'

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('returns the fallback value when the key is absent', () => {
    const { result } = renderHook(() => useLocalStorage('test-absent', 42))
    expect(result.current[0]).toBe(42)
  })

  it('reads an existing value from localStorage', () => {
    window.localStorage.setItem('test-existing', JSON.stringify('hello'))
    const { result } = renderHook(() => useLocalStorage('test-existing', ''))
    expect(result.current[0]).toBe('hello')
  })

  it('persists new values to localStorage on set', async () => {
    const { result } = renderHook(() => useLocalStorage('test-persist', 0))
    act(() => result.current[1](99))
    expect(JSON.parse(window.localStorage.getItem('test-persist'))).toBe(99)
  })

  it('removes the key when set to null', async () => {
    window.localStorage.setItem('test-null', JSON.stringify('value'))
    const { result } = renderHook(() => useLocalStorage('test-null', ''))
    act(() => result.current[1](null))
    expect(window.localStorage.getItem('test-null')).toBeNull()
  })

  it('handles arrays correctly', () => {
    const { result } = renderHook(() => useLocalStorage('test-array', []))
    act(() => result.current[1]([1, 2, 3]))
    expect(JSON.parse(window.localStorage.getItem('test-array'))).toEqual([1, 2, 3])
  })

  it('returns fallback when localStorage contains malformed JSON', () => {
    window.localStorage.setItem('test-bad', '{not-json}')
    const { result } = renderHook(() => useLocalStorage('test-bad', 'default'))
    expect(result.current[0]).toBe('default')
  })
})
