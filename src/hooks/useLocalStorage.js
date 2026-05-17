import { useEffect, useState } from 'react'

function readStoredValue(key, fallbackValue) {
  try {
    const storedValue = window.localStorage.getItem(key)
    return storedValue ? JSON.parse(storedValue) : fallbackValue
  } catch {
    return fallbackValue
  }
}

export function useLocalStorage(key, fallbackValue) {
  const [value, setValue] = useState(() => readStoredValue(key, fallbackValue))

  useEffect(() => {
    try {
      if (value === null || value === undefined) {
        window.localStorage.removeItem(key)
      } else {
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    } catch {
      // localStorage can be blocked in private browsing; the app still works without it.
    }
  }, [key, value])

  return [value, setValue]
}
