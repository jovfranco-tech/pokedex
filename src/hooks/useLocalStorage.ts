import { useEffect, useState } from 'react'
import { getBackup, saveBackup } from '../utils/indexedDbBackup.js'

function readStoredValue<T>(key: string, fallbackValue: T): T {
  try {
    const storedValue = window.localStorage.getItem(key)
    return storedValue ? (JSON.parse(storedValue) as T) : fallbackValue
  } catch {
    return fallbackValue
  }
}

export function useLocalStorage<T>(
  key: string,
  fallbackValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStoredValue(key, fallbackValue))

  // 1. Asynchronously check IndexedDB on mount to see if we have a backup.
  // This handles the case where localStorage has been wiped or is empty.
  useEffect(() => {
    let active = true
    const checkBackup = async () => {
      // Only restore from IndexedDB if the current value is the fallbackValue
      // (meaning localStorage was empty or returned fallback)
      const isFallback = JSON.stringify(value) === JSON.stringify(fallbackValue)
      if (isFallback) {
        const backup = await getBackup<T>(key)
        if (active && backup !== null) {
          setValue(backup)
          // Snychronize back to localStorage
          try {
            window.localStorage.setItem(key, JSON.stringify(backup))
          } catch {
            // private browsing/block
          }
        }
      }
    }
    void checkBackup()
    return () => {
      active = false
    }
  }, [key, fallbackValue])

  // 2. Snychronize state to both localStorage and IndexedDB
  useEffect(() => {
    try {
      if (value === null || value === undefined) {
        window.localStorage.removeItem(key)
      } else {
        window.localStorage.setItem(key, JSON.stringify(value))
        // Mirror asynchronously to IndexedDB
        void saveBackup(key, value)
      }
    } catch {
      // localStorage can be blocked; fall back gracefully
    }
  }, [key, value])

  return [value, setValue]
}

