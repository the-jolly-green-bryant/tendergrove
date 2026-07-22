const CACHE_PREFIX = 'tendergrove:offline:'

export interface CachedValue<T> {
  savedAt: string
  value: T
}

export const readCachedValue = <T>(key: string): CachedValue<T> | undefined => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    return raw ? (JSON.parse(raw) as CachedValue<T>) : undefined
  } catch {
    return undefined
  }
}

export const writeCachedValue = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ savedAt: new Date().toISOString(), value }),
    )
  } catch {
    // The network result is still usable when device storage is unavailable.
  }
}

export const clearOfflineCache = (): void => {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // Nothing else to clear when device storage is unavailable.
  }
}
