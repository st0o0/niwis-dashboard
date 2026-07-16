import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getStations } from '../api/niwis'
import type { NiwisStation } from '../types/niwis'

export const useStationStore = defineStore('station', () => {
  const stations = ref<NiwisStation[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStations() {
    loading.value = true
    error.value = null
    try {
      stations.value = await getStations()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      stations.value = []
    } finally {
      loading.value = false
    }
  }

  function getStationByNr(nr: string): NiwisStation | undefined {
    return stations.value.find((s) => s.messstelleNr === nr)
  }

  const stationsByBundesland = computed(() => {
    const map = new Map<string, NiwisStation[]>()
    for (const s of stations.value) {
      const list = map.get(s.bundesland) ?? []
      list.push(s)
      map.set(s.bundesland, list)
    }
    return map
  })

  return { stations, loading, error, fetchStations, getStationByNr, stationsByBundesland }
})
