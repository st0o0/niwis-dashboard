<script setup lang="ts">
import { onMounted } from 'vue'
import { useStationStore } from './stores/station'
import { useClassificationStore } from './stores/classification'
import { useTrendStore } from './stores/trend'
import AppSidebar from './components/layout/AppSidebar.vue'

const stationStore = useStationStore()
const classificationStore = useClassificationStore()
const trendStore = useTrendStore()

onMounted(async () => {
  await stationStore.fetchStations()
  classificationStore.fetchAllClassifications(stationStore.stations)
  trendStore.fetchAllTrends(stationStore.stations)
})
</script>

<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-6">
      <RouterView />
    </main>
  </div>
</template>
