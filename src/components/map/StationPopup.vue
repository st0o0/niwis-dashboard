<script setup lang="ts">
import { computed } from 'vue'
import type { NiwisStation } from '../../types/niwis'
import { CLASSIFICATION_COLORS, CLASSIFICATION_LABELS } from '../../types/niwis'
import { useClassificationStore } from '../../stores/classification'
import { useTrendStore } from '../../stores/trend'

const props = defineProps<{ station: NiwisStation }>()
const classificationStore = useClassificationStore()
const trendStore = useTrendStore()

const klasse = computed(() => classificationStore.getKlasse(props.station.messstelleNr))
const trend = computed(() => trendStore.getTrendForStation(props.station.messstelleNr))

const trendIcon = computed(() => {
  switch (trend.value) {
    case 'steigend': return '↗'
    case 'fallend': return '↘'
    case 'gleichbleibend': return '→'
    default: return null
  }
})

const trendLabel = computed(() => {
  switch (trend.value) {
    case 'steigend': return 'steigend'
    case 'fallend': return 'fallend'
    case 'gleichbleibend': return 'gleichbleibend'
    default: return null
  }
})
</script>

<template>
  <div class="min-w-[200px]">
    <div class="font-bold text-sm">{{ station.name }}</div>
    <div class="text-xs text-gray-500 mt-0.5">{{ station.gewaesser ?? station.landcode }}</div>
    <div class="flex items-center gap-1.5 mt-2">
      <span
        class="inline-block w-3 h-3 rounded-full"
        :style="{ backgroundColor: CLASSIFICATION_COLORS[klasse] }"
      />
      <span class="text-xs">{{ CLASSIFICATION_LABELS[klasse] }}</span>
    </div>
    <div v-if="trendIcon" class="flex items-center gap-1.5 mt-1">
      <span class="text-sm">{{ trendIcon }}</span>
      <span class="text-xs text-gray-500">{{ trendLabel }}</span>
    </div>
    <RouterLink
      :to="{ name: 'station', params: { id: station.messstelleNr } }"
      class="inline-block mt-2 text-xs text-blue-600 hover:underline"
    >
      Details anzeigen
    </RouterLink>
  </div>
</template>
