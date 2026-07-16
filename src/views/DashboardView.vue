<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useStationStore } from '../stores/station'
import { useClassificationStore } from '../stores/classification'
import { useWatchlistStore } from '../stores/watchlist'
import { getMesswerte } from '../api/niwis'
import type { NiwisMesswert, NiedrigwasserKlasse } from '../types/niwis'
import { CLASSIFICATION_COLORS, CLASSIFICATION_LABELS } from '../types/niwis'
import StationMap from '../components/map/StationMap.vue'
import StatusTile from '../components/dashboard/StatusTile.vue'
import WatchlistCard from '../components/dashboard/WatchlistCard.vue'

const stationStore = useStationStore()
const classificationStore = useClassificationStore()
const watchlistStore = useWatchlistStore()

const watchlistData = ref(new Map<string, NiwisMesswert[]>())

const klassenCounts = computed(() => {
  const counts: Record<NiedrigwasserKlasse, number> = {
    keine: 0, niedrig: 0, sehr_niedrig: 0, extrem_niedrig: 0,
  }
  for (const s of stationStore.stations) {
    const k = classificationStore.getKlasse(s.messstelleNr)
    counts[k]++
  }
  return counts
})

const tiles = computed(() => [
  { label: CLASSIFICATION_LABELS.keine, count: klassenCounts.value.keine, color: CLASSIFICATION_COLORS.keine },
  { label: CLASSIFICATION_LABELS.niedrig, count: klassenCounts.value.niedrig, color: CLASSIFICATION_COLORS.niedrig },
  { label: CLASSIFICATION_LABELS.sehr_niedrig, count: klassenCounts.value.sehr_niedrig, color: CLASSIFICATION_COLORS.sehr_niedrig },
  { label: CLASSIFICATION_LABELS.extrem_niedrig, count: klassenCounts.value.extrem_niedrig, color: CLASSIFICATION_COLORS.extrem_niedrig },
])

const watchedStations = computed(() =>
  watchlistStore.watchlist
    .map((nr) => stationStore.getStationByNr(nr))
    .filter((s) => s !== undefined),
)

onMounted(async () => {
  const bis = new Date().toISOString().slice(0, 10)
  const von = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const results = await Promise.allSettled(
    watchlistStore.watchlist.map(async (nr) => {
      const data = await getMesswerte('abfluss', nr, von, bis)
      return { nr, data }
    }),
  )
  for (const result of results) {
    if (result.status === 'fulfilled') {
      watchlistData.value.set(result.value.nr, result.value.data)
    }
  }
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Dashboard</h1>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatusTile
        v-for="tile in tiles"
        :key="tile.label"
        :label="tile.label"
        :count="tile.count"
        :color="tile.color"
        :total="stationStore.stations.length"
      />
    </div>

    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <StationMap :stations="stationStore.enrichedStations" height="400px" />
    </div>

    <div v-if="watchedStations.length > 0">
      <h2 class="text-lg font-semibold mb-3">Watchlist</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <WatchlistCard
          v-for="station in watchedStations"
          :key="station.messstelleNr"
          :station="station"
          :recent-data="watchlistData.get(station.messstelleNr) ?? []"
        />
      </div>
    </div>

    <div v-if="stationStore.enriching" class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
      <div class="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
      <span>Stammdaten laden... {{ stationStore.enrichProgress }}%</span>
    </div>

    <div v-if="classificationStore.loading" class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
      <div class="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
      <span>Klassifikation laden... {{ classificationStore.progress }}%</span>
    </div>

    <div v-if="stationStore.loading" class="flex justify-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  </div>
</template>
