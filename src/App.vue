<script setup lang="ts">
import { onMounted } from 'vue'
import { useStationStore } from './stores/station'
import AppSidebar from './components/layout/AppSidebar.vue'

const stationStore = useStationStore()

onMounted(() => {
  stationStore.fetchStations()
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
