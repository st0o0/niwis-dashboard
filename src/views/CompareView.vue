<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStationStore } from '../stores/station'
import { getMesswerte } from '../api/niwis'
import type { NiwisMesswert, NiwisStation, MessgroesseType } from '../types/niwis'
import { MESSGROESSE_LABELS } from '../types/niwis'
import StationSearch from '../components/shared/StationSearch.vue'
import DateRangePicker from '../components/shared/DateRangePicker.vue'
import ExportButton from '../components/shared/ExportButton.vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, DataZoomComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, LegendComponent, CanvasRenderer])

const stationStore = useStationStore()

const selectedNrs = ref<string[]>([])
const messgroesse = ref<MessgroesseType>('abfluss')
const bis = ref(new Date().toISOString().slice(0, 10))
const von = ref(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
const loading = ref(false)

const seriesData = ref(new Map<string, NiwisMesswert[]>())

const selectedStations = computed(() =>
  selectedNrs.value
    .map((nr) => stationStore.getStationByNr(nr))
    .filter((s): s is NiwisStation => s !== undefined),
)

const allExportData = computed(() =>
  [...seriesData.value.values()].flat(),
)

const chartColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b']

const chartOption = computed(() => {
  const allDates = new Set<string>()
  for (const data of seriesData.value.values()) {
    for (const d of data) allDates.add(d.datum)
  }
  const dates = [...allDates].sort()

  const series = selectedNrs.value.map((nr, i) => {
    const data = seriesData.value.get(nr) ?? []
    const valueMap = new Map(data.map((d) => [d.datum, d.messwert]))
    const station = stationStore.getStationByNr(nr)
    return {
      name: station?.name ?? nr,
      type: 'line' as const,
      data: dates.map((d) => valueMap.get(d) ?? null),
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 1.5, color: chartColors[i] },
      itemStyle: { color: chartColors[i] },
    }
  })

  return {
    tooltip: { trigger: 'axis' },
    legend: { show: series.length > 1 },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100 },
    ],
    xAxis: { type: 'category', data: dates, axisLabel: { rotate: 45 } },
    yAxis: { type: 'value' },
    series,
  }
})

async function fetchAll() {
  loading.value = true
  const newData = new Map<string, NiwisMesswert[]>()
  await Promise.all(
    selectedNrs.value.map(async (nr) => {
      try {
        const data = await getMesswerte(messgroesse.value, nr, von.value, bis.value)
        newData.set(nr, data)
      } catch {
        newData.set(nr, [])
      }
    }),
  )
  seriesData.value = newData
  loading.value = false
}

function addStation(nr: string) {
  if (selectedNrs.value.length >= 4 || selectedNrs.value.includes(nr)) return
  selectedNrs.value = [...selectedNrs.value, nr]
}

function removeStation(nr: string) {
  selectedNrs.value = selectedNrs.value.filter((n) => n !== nr)
  seriesData.value.delete(nr)
}

function onPreset(days: number) {
  bis.value = new Date().toISOString().slice(0, 10)
  von.value = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

watch([selectedNrs, messgroesse, von, bis], () => {
  if (selectedNrs.value.length > 0) fetchAll()
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Stationsvergleich</h1>

    <div class="flex flex-wrap gap-4 items-end">
      <div class="flex-1 min-w-[250px]">
        <label class="block text-sm font-medium mb-1">Station hinzufügen (max. 4)</label>
        <StationSearch
          :placeholder="selectedNrs.length >= 4 ? 'Maximum erreicht' : 'Station suchen...'"
          @select="addStation"
        />
      </div>
      <select
        v-model="messgroesse"
        class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      >
        <option v-for="(label, key) in MESSGROESSE_LABELS" :key="key" :value="key">
          {{ label }}
        </option>
      </select>
    </div>

    <div v-if="selectedStations.length > 0" class="flex flex-wrap gap-2">
      <div
        v-for="(station, i) in selectedStations"
        :key="station.messstelleNr"
        class="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm text-white"
        :style="{ backgroundColor: chartColors[i] }"
      >
        {{ station.name }}
        <button @click="removeStation(station.messstelleNr)" class="ml-1 hover:opacity-70">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="selectedNrs.length > 0" class="flex items-center justify-between flex-wrap gap-4">
      <DateRangePicker
        :von="von"
        :bis="bis"
        @update:von="von = $event"
        @update:bis="bis = $event"
        @preset="onPreset"
      />
      <ExportButton :data="allExportData" filename="niwis-vergleich" />
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>

    <div v-else-if="selectedNrs.length > 0 && seriesData.size > 0" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <VChart :option="chartOption" style="height: 450px" autoresize />
    </div>

    <div v-else-if="selectedNrs.length === 0" class="text-center py-16 text-gray-500 dark:text-gray-400">
      <p class="text-lg">Wähle bis zu 4 Stationen zum Vergleich aus.</p>
      <p class="text-sm mt-1">Nutze die Suche oben oder füge Stationen aus deiner Watchlist hinzu.</p>
    </div>
  </div>
</template>
