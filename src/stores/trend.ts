import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import type { NiwisStation } from '../types/niwis'
import type { TrendDirection } from '../types/niwis'
import { getTrend } from '../api/niwis'

const TREND_CACHE_KEY = 'niwis:all-trends'
const TREND_TTL = 15 * 60 * 1000

const MESSGROESSE_TREND: Record<string, string> = {
  'Abfluss': 'Abfluss Entwicklung letzte 7 Tage',
  'Wasserstand': 'Wasserstand Entwicklung letzte 7 Tage',
}

const VALID_TRENDS = new Set(['steigend', 'fallend', 'gleichbleibend'])

interface CachedTrends {
  timestamp: number
  data: [string, TrendDirection][]
}

export const useTrendStore = defineStore('trend', () => {
  const trends = ref(new Map<string, TrendDirection>())
  const loading = ref(false)

  function getTrendForStation(messstelleNr: string): TrendDirection | null {
    return trends.value.get(messstelleNr) ?? null
  }

  async function fetchAllTrends(stations: NiwisStation[]) {
    loading.value = true

    if (!import.meta.env.DEV) {
      const { getStaticTrends } = await import('../api/static-data')
      const data = await getStaticTrends()
      trends.value = new Map(Object.entries(data) as [string, TrendDirection][])
      loading.value = false
      return
    }

    const cached = await idbGet<CachedTrends>(TREND_CACHE_KEY)
    if (cached && Date.now() - cached.timestamp < TREND_TTL) {
      trends.value = new Map(cached.data)
      loading.value = false
      return
    }

    const concurrency = 20
    const queue = [...stations]

    async function worker() {
      while (queue.length > 0) {
        const station = queue.shift()!
        let abgeleiteteGroesse: string | null = null
        for (const mg of station.messgroesse) {
          if (MESSGROESSE_TREND[mg]) {
            abgeleiteteGroesse = MESSGROESSE_TREND[mg]
            break
          }
        }
        if (abgeleiteteGroesse) {
          try {
            const result = await getTrend(station.messstelleNr, abgeleiteteGroesse)
            if (VALID_TRENDS.has(result.einzelwert)) {
              trends.value.set(station.messstelleNr, result.einzelwert as TrendDirection)
            }
          } catch {
            // skip
          }
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))
    trends.value = new Map(trends.value)

    await idbSet(TREND_CACHE_KEY, {
      timestamp: Date.now(),
      data: [...trends.value.entries()],
    } as CachedTrends)
    loading.value = false
  }

  return { trends, loading, getTrendForStation, fetchAllTrends }
})
