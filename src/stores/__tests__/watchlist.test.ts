import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWatchlistStore } from '../watchlist'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('useWatchlistStore', () => {
  it('starts with empty watchlist', () => {
    const store = useWatchlistStore()
    expect(store.watchlist).toEqual([])
  })

  it('toggles station in watchlist', () => {
    const store = useWatchlistStore()
    store.toggle('S1')
    expect(store.isWatched('S1')).toBe(true)
    store.toggle('S1')
    expect(store.isWatched('S1')).toBe(false)
  })

  it('removes station from watchlist', () => {
    const store = useWatchlistStore()
    store.toggle('S1')
    store.toggle('S2')
    store.remove('S1')
    expect(store.watchlist).toEqual(['S2'])
  })

  it('persists to localStorage', () => {
    const store = useWatchlistStore()
    store.toggle('S1')
    expect(JSON.parse(localStorage.getItem('niwis-watchlist')!)).toEqual(['S1'])
  })

  it('restores from localStorage', () => {
    localStorage.setItem('niwis-watchlist', JSON.stringify(['S1', 'S2']))
    const store = useWatchlistStore()
    expect(store.watchlist).toEqual(['S1', 'S2'])
  })
})
