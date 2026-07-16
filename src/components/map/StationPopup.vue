<script setup lang="ts">
import type { NiwisStation } from '../../types/niwis'
import { CLASSIFICATION_COLORS, CLASSIFICATION_LABELS } from '../../types/niwis'
import { useClassificationStore } from '../../stores/classification'

const props = defineProps<{ station: NiwisStation }>()
const classificationStore = useClassificationStore()

const klasse = classificationStore.getKlasse(props.station.messstelleNr)
</script>

<template>
  <div class="min-w-[200px]">
    <div class="font-bold text-sm">{{ station.name }}</div>
    <div class="text-xs text-gray-500 mt-0.5">{{ station.gewaesser }}</div>
    <div class="flex items-center gap-1.5 mt-2">
      <span
        class="inline-block w-3 h-3 rounded-full"
        :style="{ backgroundColor: CLASSIFICATION_COLORS[klasse] }"
      />
      <span class="text-xs">{{ CLASSIFICATION_LABELS[klasse] }}</span>
    </div>
    <RouterLink
      :to="`/station/${station.messstelleNr}`"
      class="inline-block mt-2 text-xs text-blue-600 hover:underline"
    >
      Details anzeigen
    </RouterLink>
  </div>
</template>
