import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NiedrigwasserKlasse } from '../types/niwis'

export const useClassificationStore = defineStore('classification', () => {
  const classifications = ref(new Map<string, NiedrigwasserKlasse>())
  const loading = ref(false)

  function setKlasse(messstelleNr: string, klasse: NiedrigwasserKlasse) {
    classifications.value = new Map(classifications.value.set(messstelleNr, klasse))
  }

  function getKlasse(messstelleNr: string): NiedrigwasserKlasse {
    return classifications.value.get(messstelleNr) ?? 'keine'
  }

  return { classifications, loading, setKlasse, getKlasse }
})
