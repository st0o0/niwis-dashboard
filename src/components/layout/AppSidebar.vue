<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useWatchlistStore } from '../../stores/watchlist'
import { useStationStore } from '../../stores/station'
import ThemeToggle from './ThemeToggle.vue'

const route = useRoute()
const watchlistStore = useWatchlistStore()
const stationStore = useStationStore()
const collapsed = ref(false)
const watchlistOpen = ref(true)

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { to: '/karte', label: 'Karte', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { to: '/vergleich', label: 'Vergleich', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
]

function isActive(to: string): boolean {
  return route.path === to
}
</script>

<template>
  <aside
    class="h-screen flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300"
    :class="collapsed ? 'w-16' : 'w-64'"
  >
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <span v-if="!collapsed" class="text-lg font-bold text-blue-600 dark:text-blue-400">NIWIS</span>
      <button
        @click="collapsed = !collapsed"
        class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    </div>

    <nav class="flex-1 p-2 space-y-1 overflow-y-auto">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
        :class="isActive(item.to)
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/>
        </svg>
        <span v-if="!collapsed">{{ item.label }}</span>
      </RouterLink>

      <div v-if="!collapsed && watchlistStore.watchlist.length > 0" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          @click="watchlistOpen = !watchlistOpen"
          class="flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-500 dark:text-gray-400 w-full"
        >
          <svg class="w-4 h-4 transition-transform" :class="watchlistOpen ? 'rotate-90' : ''" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 6L14 10L6 14V6Z"/>
          </svg>
          Watchlist
        </button>
        <div v-if="watchlistOpen" class="mt-1 space-y-1">
          <RouterLink
            v-for="nr in watchlistStore.watchlist"
            :key="nr"
            :to="`/station/${nr}`"
            class="block px-3 py-1.5 text-sm rounded-lg truncate text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {{ stationStore.getStationByNr(nr)?.name ?? nr }}
          </RouterLink>
        </div>
      </div>
    </nav>

    <div class="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-center">
      <ThemeToggle />
    </div>
  </aside>
</template>
