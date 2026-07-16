<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStationStore } from '../../stores/station'
import { LANDCODE_LABELS } from '../../types/niwis'

withDefaults(defineProps<{ placeholder?: string }>(), {
  placeholder: 'Station suchen...',
})
const emit = defineEmits<{ select: [messstelleNr: string] }>()

const stationStore = useStationStore()
const query = ref('')
const isFocused = ref(false)

const results = computed(() => {
  if (query.value.length < 2) return []
  const q = query.value.toLowerCase()
  return stationStore.stations
    .filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.messstelleNr.toLowerCase().includes(q) ||
      (s.gewaesser?.toLowerCase().includes(q) ?? false),
    )
    .slice(0, 10)
})

function selectStation(nr: string) {
  query.value = ''
  isFocused.value = false
  emit('select', nr)
}

function handleBlur() {
  setTimeout(() => {
    isFocused.value = false
  }, 200)
}
</script>

<template>
  <div class="relative">
    <input
      v-model="query"
      :placeholder="placeholder"
      @focus="isFocused = true"
      @blur="handleBlur"
      class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <div
      v-if="isFocused && results.length > 0"
      class="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
    >
      <button
        v-for="station in results"
        :key="station.messstelleNr"
        @mousedown.prevent="selectStation(station.messstelleNr)"
        class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
      >
        <div class="font-medium">{{ station.name }}</div>
        <div class="text-xs text-gray-500">{{ station.gewaesser ?? '' }} · {{ LANDCODE_LABELS[station.landcode] ?? station.landcode }}</div>
      </button>
    </div>
  </div>
</template>
