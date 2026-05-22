const DB_NAME = 'pokedex-backup-db'
const STORE_NAME = 'backup-store'
const DB_VERSION = 1

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error || new Error('Failed to open database'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
  })
}

export async function saveBackup(key: string, value: any): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put({ key, value, updatedAt: new Date().toISOString() })

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error || new Error('Failed to save backup'))
      }
    })
  } catch (error) {
    // Fail silently or warn in console to not disrupt the UI
    console.warn('[IndexedDB Backup] Failed to save backup for key:', key, error)
  }
}

export async function getBackup<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result
        resolve(result ? (result.value as T) : null)
      }

      request.onerror = () => {
        reject(request.error || new Error('Failed to retrieve backup'))
      }
    })
  } catch (error) {
    console.warn('[IndexedDB Backup] Failed to get backup for key:', key, error)
    return null
  }
}
