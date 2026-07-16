import { get, set } from 'idb-keyval'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const entry = await get<CacheEntry<T>>(key)
  if (entry && Date.now() - entry.timestamp < ttlMs) {
    return entry.data
  }
  const data = await fetcher()
  await set(key, { data, timestamp: Date.now() })
  return data
}

export async function invalidateCache(key: string): Promise<void> {
  const { del } = await import('idb-keyval')
  await del(key)
}
