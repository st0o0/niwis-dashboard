import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import type { NiedrigwasserKlasse, NiwisStation } from '../types/niwis'
import { getClassification } from '../api/niwis'

const KLASSE_MAP: Record<string, NiedrigwasserKlasse> = {
  'kein Niedrigwasser': 'keine',
  'niedrig': 'niedrig',
  'sehr niedrig': 'sehr_niedrig',
  'extrem niedrig': 'extrem_niedrig',
}

const MESSGROESSE_CLASSIFICATION: Record<string, string> = {
  'Abfluss': 'Abfluss Niedrigwasserklasse aktueller Tag',
  'Grundwasserstand': 'Grundwasser Niedrigwasserklasse aktueller Tag',
  'Quellschüttung': 'Quellschüttung Niedrigwasserklasse aktueller Tag',
}

const CLASSIFICATION_CACHE_KEY = 'niwis:all-classifications'
const CLASSIFICATION_TTL = 60 * 60 * 1000 // 1 hour

interface CachedClassifications {
  timestamp: number
  data: [string, NiedrigwasserKlasse][]
}

export const useClassificationStore = defineStore('classification', () => {
  const classifications = ref(new Map<string, NiedrigwasserKlasse>())
  const loading = ref(false)
  const progress = ref(0)

  function setKlasse(messstelleNr: string, klasse: NiedrigwasserKlasse) {
    classifications.value = new Map(classifications.value.set(messstelleNr, klasse))
  }

  function getKlasse(messstelleNr: string): NiedrigwasserKlasse {
    return classifications.value.get(messstelleNr) ?? 'keine'
  }

  async function fetchAllClassifications(stations: NiwisStation[]) {
    loading.value = true
    progress.value = 0

    if (!import.meta.env.DEV) {
      const { getStaticKlassifikationen } = await import('../api/static-data')
      const data = await getStaticKlassifikationen()
      for (const [nr, val] of Object.entries(data)) {
        const klasse = KLASSE_MAP[val]
        if (klasse) classifications.value.set(nr, klasse)
      }
      classifications.value = new Map(classifications.value)
      progress.value = 100
      loading.value = false
      return
    }

    // Try loading classifications from cache
    const cached = await idbGet<CachedClassifications>(CLASSIFICATION_CACHE_KEY)
    if (cached && Date.now() - cached.timestamp < CLASSIFICATION_TTL) {
      classifications.value = new Map(cached.data)
      progress.value = 100
      loading.value = false
      return
    }

    let done = 0
    const total = stations.length
    const concurrency = 20
    const queue = [...stations]

    async function worker() {
      while (queue.length > 0) {
        const station = queue.shift()!
        // Find the best classification type for this station
        let abgeleiteteGroesse: string | null = null
        for (const mg of station.messgroesse) {
          if (MESSGROESSE_CLASSIFICATION[mg]) {
            abgeleiteteGroesse = MESSGROESSE_CLASSIFICATION[mg]
            break
          }
        }
        if (abgeleiteteGroesse) {
          try {
            const result = await getClassification(station.messstelleNr, abgeleiteteGroesse)
            const klasse = KLASSE_MAP[result.einzelwert]
            if (klasse) {
              setKlasse(station.messstelleNr, klasse)
            }
          } catch {
            // skip failed classification
          }
        }
        done++
        progress.value = Math.round((done / total) * 100)
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))
    // Cache the full classification map for subsequent visits
    await idbSet(CLASSIFICATION_CACHE_KEY, {
      timestamp: Date.now(),
      data: [...classifications.value.entries()],
    } as CachedClassifications)
    loading.value = false
  }

  return { classifications, loading, progress, setKlasse, getKlasse, fetchAllClassifications }
})
