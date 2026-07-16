import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMesswerte } from '../api/niwis'
import type { NiwisMesswert, MessgroesseType } from '../types/niwis'

export const useMeasurementStore = defineStore('measurement', () => {
  const messwerte = ref<NiwisMesswert[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMesswerte(
    type: MessgroesseType,
    messstelleNr: string,
    von: string,
    bis: string,
  ) {
    loading.value = true
    error.value = null
    try {
      messwerte.value = await getMesswerte(type, messstelleNr, von, bis)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function clearMesswerte() {
    messwerte.value = []
  }

  return { messwerte, loading, error, fetchMesswerte, clearMesswerte }
})
