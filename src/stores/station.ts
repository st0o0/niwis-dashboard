import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { getStations, getStammdaten } from '../api/niwis'
import type { NiwisStation } from '../types/niwis'

const ENRICHED_CACHE_KEY = 'niwis:enriched-stations'
const ENRICHED_TTL = 24 * 60 * 60 * 1000

interface CachedEnrichedStations {
  timestamp: number
  data: NiwisStation[]
}

export const useStationStore = defineStore('station', () => {
  const stations = ref<NiwisStation[]>([])
  const loading = ref(false)
  const enriching = ref(false)
  const enrichProgress = ref(0)
  const error = ref<string | null>(null)

  const enrichedStations = computed(() =>
    stations.value.filter((s) => s.breite !== undefined && s.laenge !== undefined),
  )

  async function fetchStations() {
    loading.value = true
    error.value = null
    try {
      if (!import.meta.env.DEV) {
        const { getStaticStations } = await import('../api/static-data')
        stations.value = await getStaticStations()
        loading.value = false
        return
      }

      const raw = await getStations()

      // Try loading enriched data from cache
      const cached = await idbGet<CachedEnrichedStations>(ENRICHED_CACHE_KEY)
      if (cached && Date.now() - cached.timestamp < ENRICHED_TTL) {
        // Merge cached enrichment data onto fresh station list
        const enrichMap = new Map(cached.data.map((s) => [s.messstelleNr, s]))
        stations.value = raw.map((s) => {
          const enriched = enrichMap.get(s.messstelleNr)
          if (enriched) {
            return {
              ...s,
              breite: enriched.breite,
              laenge: enriched.laenge,
              gewaesser: enriched.gewaesser,
              betreiber: enriched.betreiber,
              institution: enriched.institution,
              ezgGroesse: enriched.ezgGroesse,
              hoehePnp: enriched.hoehePnp,
            }
          }
          return s
        })
      } else {
        stations.value = raw
        enrichStations()
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      stations.value = []
    } finally {
      loading.value = false
    }
  }

  async function enrichStations() {
    enriching.value = true
    enrichProgress.value = 0
    const total = stations.value.length
    let done = 0

    const concurrency = 30
    const queue = [...stations.value]

    async function worker() {
      while (queue.length > 0) {
        const station = queue.shift()!
        try {
          const stamm = await getStammdaten(station.messstelleNr)
          station.breite = stamm.breite
          station.laenge = stamm.laenge
          station.gewaesser = stamm.gewaesser
          station.betreiber = stamm.betreiber
          station.institution = stamm.institution
          station.ezgGroesse = stamm.ezgGroesse
          station.hoehePnp = stamm.hoehePnp
        } catch {
          // skip failed stammdaten
        }
        done++
        enrichProgress.value = Math.round((done / total) * 100)
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))
    // Trigger reactivity
    stations.value = [...stations.value]
    // Cache the fully enriched list for subsequent visits
    await idbSet(ENRICHED_CACHE_KEY, {
      timestamp: Date.now(),
      data: stations.value,
    } as CachedEnrichedStations)
    enriching.value = false
  }

  function getStationByNr(nr: string): NiwisStation | undefined {
    return stations.value.find((s) => s.messstelleNr === nr)
  }

  const stationsByLandcode = computed(() => {
    const map = new Map<string, NiwisStation[]>()
    for (const s of stations.value) {
      const list = map.get(s.landcode) ?? []
      list.push(s)
      map.set(s.landcode, list)
    }
    return map
  })

  return {
    stations,
    enrichedStations,
    loading,
    enriching,
    enrichProgress,
    error,
    fetchStations,
    getStationByNr,
    stationsByLandcode,
  }
})
