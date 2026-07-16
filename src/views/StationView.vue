<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStationStore } from '../stores/station'
import { useClassificationStore } from '../stores/classification'
import { getStammdaten, getMesswerte } from '../api/niwis'
import type { NiwisStammdaten, NiwisMesswert, MessgroesseType } from '../types/niwis'
import { MESSGROESSE_LABELS } from '../types/niwis'
import TimeseriesChart from '../components/charts/TimeseriesChart.vue'
import ClassificationGauge from '../components/charts/ClassificationGauge.vue'
import DateRangePicker from '../components/shared/DateRangePicker.vue'
import WatchlistToggle from '../components/shared/WatchlistToggle.vue'
import ExportButton from '../components/shared/ExportButton.vue'

const route = useRoute()
const stationStore = useStationStore()
const classificationStore = useClassificationStore()

const messstelleNr = computed(() => route.params.id as string)
const station = computed(() => stationStore.getStationByNr(messstelleNr.value))
const stammdaten = ref<NiwisStammdaten | null>(null)
const messwerte = ref<NiwisMesswert[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const activeTab = ref<MessgroesseType>('abfluss')
const bis = ref(new Date().toISOString().slice(0, 10))
const von = ref(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))

const availableTabs = computed<MessgroesseType[]>(() => {
  if (!station.value?.messgroessen) return ['abfluss']
  const map: Record<string, MessgroesseType> = {
    ABFLUSS: 'abfluss',
    WASSERSTAND: 'wasserstand',
    GRUNDWASSER: 'grundwasserstand',
    QUELLSCHUETTUNG: 'quellschuettung',
  }
  return station.value.messgroessen
    .map((m) => map[m])
    .filter((m): m is MessgroesseType => m !== undefined)
})

const einheit = computed(() => {
  if (messwerte.value.length > 0) return messwerte.value[0].einheit
  return ''
})

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const [stammResult, messResult] = await Promise.all([
      getStammdaten(messstelleNr.value),
      getMesswerte(activeTab.value, messstelleNr.value, von.value, bis.value),
    ])
    stammdaten.value = stammResult
    messwerte.value = messResult
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function onPreset(days: number) {
  bis.value = new Date().toISOString().slice(0, 10)
  von.value = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

watch([messstelleNr, activeTab, von, bis], loadData)
onMounted(loadData)
</script>

<template>
  <div v-if="station" class="space-y-6">
    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold">{{ station.name }}</h1>
          <WatchlistToggle :messstelle-nr="station.messstelleNr" />
        </div>
        <div class="text-gray-500 dark:text-gray-400 mt-1">
          {{ station.gewaesser }} · {{ station.betreiber }} · {{ station.bundesland }}
        </div>
        <div class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          {{ station.breite?.toFixed(4) }}°N, {{ station.laenge?.toFixed(4) }}°E
        </div>
      </div>
      <ClassificationGauge :klasse="classificationStore.getKlasse(station.messstelleNr)" />
    </div>

    <div v-if="availableTabs.length > 1" class="flex gap-1 border-b border-gray-200 dark:border-gray-700">
      <button
        v-for="tab in availableTabs"
        :key="tab"
        @click="activeTab = tab"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === tab
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
      >
        {{ MESSGROESSE_LABELS[tab] }}
      </button>
    </div>

    <div class="flex items-center justify-between flex-wrap gap-4">
      <DateRangePicker
        :von="von"
        :bis="bis"
        @update:von="von = $event"
        @update:bis="bis = $event"
        @preset="onPreset"
      />
      <ExportButton :data="messwerte" :filename="`niwis-${station.name}-${activeTab}`" />
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>

    <div v-else-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
      {{ error }}
    </div>

    <div v-else-if="messwerte.length > 0" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <TimeseriesChart
        :data="messwerte"
        :title="MESSGROESSE_LABELS[activeTab]"
        :einheit="einheit"
        height="450px"
      />
    </div>

    <div v-else class="text-center py-12 text-gray-500 dark:text-gray-400">
      Keine Messwerte für den gewählten Zeitraum.
    </div>

    <div v-if="stammdaten" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h2 class="font-semibold mb-3">Stammdaten</h2>
      <dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <dt class="text-gray-500 dark:text-gray-400">Messstelle Nr.</dt>
        <dd>{{ stammdaten.messstelleNr }}</dd>
        <dt class="text-gray-500 dark:text-gray-400">Gewässer</dt>
        <dd>{{ stammdaten.gewaesser }}</dd>
        <dt class="text-gray-500 dark:text-gray-400">Betreiber</dt>
        <dd>{{ stammdaten.betreiber }}</dd>
        <template v-if="stammdaten.pegelnullpunkt">
          <dt class="text-gray-500 dark:text-gray-400">Pegelnullpunkt</dt>
          <dd>{{ stammdaten.pegelnullpunkt }} m ü. NHN</dd>
        </template>
        <template v-if="stammdaten.einzugsgebietsgroesse">
          <dt class="text-gray-500 dark:text-gray-400">Einzugsgebiet</dt>
          <dd>{{ stammdaten.einzugsgebietsgroesse }} km²</dd>
        </template>
      </dl>
    </div>
  </div>

  <div v-else class="flex justify-center py-12">
    <p class="text-gray-500 dark:text-gray-400">Station nicht gefunden.</p>
  </div>
</template>
