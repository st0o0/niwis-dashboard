<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getKlimaindikator } from '../api/niwis'
import type { NiwisKlimaindikator } from '../types/niwis'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const data = ref<NiwisKlimaindikator | null>(null)
const loading = ref(true)
const season = ref<'sommer' | 'winter'>('sommer')
const selectedBasin = ref('')

const basins = computed(() => {
  if (!data.value) return []
  return Object.keys(data.value.niedrigwasserttageSommerhalbjahrProFlussgebiet).sort()
})

const startYear = 1991

const chartOption = computed(() => {
  if (!data.value) return {}

  const basinData = season.value === 'sommer'
    ? data.value.niedrigwasserttageSommerhalbjahrProFlussgebiet
    : data.value.niedrigwassertageWinterhalbjahrProFlussgebiet

  const basinsToShow = selectedBasin.value
    ? [selectedBasin.value]
    : Object.keys(basinData).sort()

  const maxLen = Math.max(...Object.values(basinData).map(v => v.length))
  const years = Array.from({ length: maxLen }, (_, i) => String(startYear + i))

  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

  const series = basinsToShow.map((basin, i) => ({
    name: basin,
    type: basinsToShow.length === 1 ? 'bar' : 'line',
    data: basinData[basin] ?? [],
    smooth: true,
    symbol: 'none',
    itemStyle: { color: colors[i % colors.length] },
    lineStyle: { width: 2 },
  }))

  return {
    tooltip: { trigger: 'axis' },
    legend: { show: basinsToShow.length > 1, top: 0 },
    grid: { top: basinsToShow.length > 1 ? 40 : 20, bottom: 40 },
    xAxis: { type: 'category', data: years },
    yAxis: { type: 'value', name: 'Niedrigwassertage' },
    series,
  }
})

onMounted(async () => {
  try {
    if (!import.meta.env.DEV) {
      const { getStaticKlimaindikator } = await import('../api/static-data')
      data.value = await getStaticKlimaindikator()
    } else {
      data.value = await getKlimaindikator()
    }
  } catch (e) {
    console.error('Failed to load Klimaindikator', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Klimaindikator Niedrigwassertage</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Durchschnittliche Anzahl der Niedrigwassertage pro Halbjahr, aggregiert über alle Messstellen im jeweiligen Flussgebiet.
    </p>

    <div class="flex flex-wrap gap-3">
      <div class="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
        <button
          @click="season = 'sommer'"
          class="px-4 py-1.5 text-sm transition-colors"
          :class="season === 'sommer' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'"
        >Sommerhalbjahr</button>
        <button
          @click="season = 'winter'"
          class="px-4 py-1.5 text-sm transition-colors"
          :class="season === 'winter' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'"
        >Winterhalbjahr</button>
      </div>

      <select
        v-model="selectedBasin"
        class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      >
        <option value="">Alle Flussgebiete</option>
        <option v-for="b in basins" :key="b" :value="b">{{ b }}</option>
      </select>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>

    <div v-else-if="data" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <VChart :option="chartOption" style="height: 450px" autoresize />
    </div>
  </div>
</template>
