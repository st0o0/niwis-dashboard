<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStationStore } from '../stores/station'
import { useClassificationStore } from '../stores/classification'
import StationMap from '../components/map/StationMap.vue'
import type { MessgroesseType, NiedrigwasserKlasse } from '../types/niwis'
import { MESSGROESSE_LABELS, CLASSIFICATION_LABELS } from '../types/niwis'

const router = useRouter()
const stationStore = useStationStore()
const classificationStore = useClassificationStore()

const filterMessgroesse = ref<MessgroesseType | ''>('')
const filterBundesland = ref('')
const filterKlasse = ref<NiedrigwasserKlasse | ''>('')

const bundeslaender = computed(() => {
  const set = new Set(stationStore.stations.map((s) => s.bundesland))
  return [...set].sort()
})

const filteredStations = computed(() => {
  return stationStore.stations.filter((s) => {
    if (filterBundesland.value && s.bundesland !== filterBundesland.value) return false
    if (filterMessgroesse.value && !s.messgroessen?.includes(filterMessgroesse.value)) return false
    if (filterKlasse.value && classificationStore.getKlasse(s.messstelleNr) !== filterKlasse.value) return false
    return true
  })
})

function onStationClick(nr: string) {
  router.push(`/station/${nr}`)
}

function clearFilters() {
  filterMessgroesse.value = ''
  filterBundesland.value = ''
  filterKlasse.value = ''
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-3rem)]">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Karte</h1>
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ filteredStations.length }} / {{ stationStore.stations.length }} Stationen
      </span>
    </div>

    <div class="flex flex-wrap gap-3 mb-4">
      <select
        v-model="filterMessgroesse"
        class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      >
        <option value="">Alle Messgrößen</option>
        <option v-for="(label, key) in MESSGROESSE_LABELS" :key="key" :value="key">
          {{ label }}
        </option>
      </select>

      <select
        v-model="filterBundesland"
        class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      >
        <option value="">Alle Bundesländer</option>
        <option v-for="bl in bundeslaender" :key="bl" :value="bl">{{ bl }}</option>
      </select>

      <select
        v-model="filterKlasse"
        class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      >
        <option value="">Alle Klassen</option>
        <option v-for="(label, key) in CLASSIFICATION_LABELS" :key="key" :value="key">
          {{ label }}
        </option>
      </select>

      <button
        v-if="filterMessgroesse || filterBundesland || filterKlasse"
        @click="clearFilters"
        class="px-3 py-1.5 text-sm text-red-500 hover:text-red-700"
      >
        Filter zurücksetzen
      </button>
    </div>

    <div class="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <StationMap
        :stations="filteredStations"
        height="100%"
        @station-click="onStationClick"
      />
    </div>
  </div>
</template>
