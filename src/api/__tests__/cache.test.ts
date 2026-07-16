import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('idb-keyval', () => {
  const store = new Map()
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    del: vi.fn((key: string) => {
      store.delete(key)
      return Promise.resolve()
    }),
  }
})

import { cachedFetch, invalidateCache } from '../cache'
import { get, set } from 'idb-keyval'

beforeEach(() => {
  vi.clearAllMocks()
  ;(get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
})

describe('cachedFetch', () => {
  it('calls fetcher when cache is empty', async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3])
    const result = await cachedFetch('test-key', 60_000, fetcher)
    expect(result).toEqual([1, 2, 3])
    expect(fetcher).toHaveBeenCalledOnce()
    expect(set).toHaveBeenCalledWith('test-key', {
      data: [1, 2, 3],
      timestamp: expect.any(Number),
    })
  })

  it('returns cached data when within TTL', async () => {
    ;(get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [4, 5, 6],
      timestamp: Date.now() - 30_000,
    })
    const fetcher = vi.fn()
    const result = await cachedFetch('test-key', 60_000, fetcher)
    expect(result).toEqual([4, 5, 6])
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('refetches when TTL expired', async () => {
    ;(get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [4, 5, 6],
      timestamp: Date.now() - 120_000,
    })
    const fetcher = vi.fn().mockResolvedValue([7, 8, 9])
    const result = await cachedFetch('test-key', 60_000, fetcher)
    expect(result).toEqual([7, 8, 9])
    expect(fetcher).toHaveBeenCalledOnce()
  })
})

describe('invalidateCache', () => {
  it('deletes the cache entry', async () => {
    const { del } = await import('idb-keyval')
    await invalidateCache('test-key')
    expect(del).toHaveBeenCalledWith('test-key')
  })
})
