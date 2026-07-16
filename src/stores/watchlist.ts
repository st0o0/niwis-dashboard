import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'niwis-watchlist'

export const useWatchlistStore = defineStore('watchlist', () => {
  const watchlist = ref<string[]>(loadFromStorage())

  function loadFromStorage(): string[] {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist.value))
  }

  function isWatched(messstelleNr: string): boolean {
    return watchlist.value.includes(messstelleNr)
  }

  function toggle(messstelleNr: string) {
    if (isWatched(messstelleNr)) {
      watchlist.value = watchlist.value.filter((nr) => nr !== messstelleNr)
    } else {
      watchlist.value = [...watchlist.value, messstelleNr]
    }
    persist()
  }

  function remove(messstelleNr: string) {
    watchlist.value = watchlist.value.filter((nr) => nr !== messstelleNr)
    persist()
  }

  return { watchlist, isWatched, toggle, remove }
})
