<script setup lang="ts">
import { computed } from 'vue'
import type { NiwisStation, NiwisMesswert } from '../../types/niwis'
import { useClassificationStore } from '../../stores/classification'
import { useTrendStore } from '../../stores/trend'
import SparklineChart from '../charts/SparklineChart.vue'
import ClassificationGauge from '../charts/ClassificationGauge.vue'
import WatchlistToggle from '../shared/WatchlistToggle.vue'
import { CLASSIFICATION_COLORS } from '../../types/niwis'

const props = defineProps<{
  station: NiwisStation
  recentData: NiwisMesswert[]
}>()

const classificationStore = useClassificationStore()
const trendStore = useTrendStore()
const klasse = computed(() => classificationStore.getKlasse(props.station.messstelleNr))
const trend = computed(() => trendStore.getTrendForStation(props.station.messstelleNr))
const latestValue = computed(() => props.recentData.length > 0
  ? props.recentData.reduce((a, b) => a.datum > b.datum ? a : b)
  : null)
</script>

<template>
  <RouterLink
    :to="`/station/${station.messstelleNr}`"
    class="block bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
  >
    <div class="flex items-start justify-between">
      <div>
        <div class="font-semibold text-sm">{{ station.name }}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">{{ station.gewaesser ?? '' }}</div>
      </div>
      <WatchlistToggle :messstelle-nr="station.messstelleNr" />
    </div>
    <div v-if="latestValue" class="mt-2 text-lg font-bold">
      {{ latestValue.messwert }} <span class="text-sm font-normal text-gray-500">{{ latestValue.einheit }}</span>
      <span v-if="trend" class="text-sm ml-1" :class="{
        'text-red-500': trend === 'fallend',
        'text-green-500': trend === 'steigend',
        'text-gray-400': trend === 'gleichbleibend',
      }">
        {{ trend === 'steigend' ? '↗' : trend === 'fallend' ? '↘' : '→' }}
      </span>
    </div>
    <SparklineChart
      v-if="recentData.length > 0"
      :data="recentData"
      :color="CLASSIFICATION_COLORS[klasse]"
      height="40px"
      class="mt-2"
    />
    <ClassificationGauge :klasse="klasse" class="mt-2" />
  </RouterLink>
</template>
