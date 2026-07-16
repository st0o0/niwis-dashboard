<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWatchlistStore } from '../../stores/watchlist'
import { useStationStore } from '../../stores/station'
import ThemeToggle from './ThemeToggle.vue'

const route = useRoute()
const watchlistStore = useWatchlistStore()
const stationStore = useStationStore()
const collapsed = ref(false)
const watchlistOpen = ref(true)

interface NavItem {
  to: string
  label: string
  icon: string
}

interface NavCategory {
  label: string
  icon: string
  open: boolean
  items: NavItem[]
}

const topItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
]

const categories = ref<NavCategory[]>([
  {
    label: 'Oberflächengewässer',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    open: true,
    items: [
      { to: '/karte?kat=oberflaechengewaesser', label: 'Karte', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
      { to: '/vergleich', label: 'Vergleich', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ],
  },
  {
    label: 'Grundwasser',
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    open: false,
    items: [
      { to: '/karte?kat=grundwasser', label: 'Karte', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
    ],
  },
])

const bottomItems: NavItem[] = [
  { to: '/karte', label: 'Alle Stationen', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { to: '/klima', label: 'Klimaindikator', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
]

const stationCounts = computed(() => {
  const stations = stationStore.stations
  return {
    oberflaechengewaesser: stations.filter(s =>
      s.messgroesse.some(m => ['Abfluss', 'Wasserstand', 'Quellschüttung'].includes(m)),
    ).length,
    grundwasser: stations.filter(s =>
      s.messgroesse.includes('Grundwasserstand'),
    ).length,
  }
})

function isActive(to: string): boolean {
  if (to.includes('?')) {
    const [path, query] = to.split('?')
    return route.path === path && route.fullPath.includes(query)
  }
  return route.path === to
}

function toggleCategory(cat: NavCategory) {
  cat.open = !cat.open
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
      <!-- Top-level items -->
      <RouterLink
        v-for="item in topItems"
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

      <!-- Hierarchical categories -->
      <template v-if="!collapsed">
        <div
          v-for="cat in categories"
          :key="cat.label"
          class="mt-3"
        >
          <button
            @click="toggleCategory(cat)"
            class="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-full hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="cat.icon"/>
            </svg>
            <span class="flex-1 text-left">{{ cat.label }}</span>
            <span class="text-[10px] font-normal normal-case tracking-normal text-gray-400">
              {{ cat.label === 'Oberflächengewässer' ? stationCounts.oberflaechengewaesser : stationCounts.grundwasser }}
            </span>
            <svg
              class="w-3 h-3 transition-transform duration-200"
              :class="{ 'rotate-180': cat.open }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div v-show="cat.open" class="ml-2 space-y-0.5">
            <RouterLink
              v-for="item in cat.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors"
              :class="isActive(item.to)
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/>
              </svg>
              {{ item.label }}
            </RouterLink>
          </div>
        </div>

        <!-- Divider + bottom items -->
        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-0.5">
          <RouterLink
            v-for="item in bottomItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
            :class="isActive(item.to)
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
          >
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/>
            </svg>
            {{ item.label }}
          </RouterLink>
        </div>
      </template>

      <!-- Collapsed: show only icons for bottom items -->
      <template v-else>
        <RouterLink
          v-for="item in bottomItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center justify-center px-3 py-2 rounded-lg transition-colors"
          :class="isActive(item.to)
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/>
          </svg>
        </RouterLink>
      </template>

      <!-- Watchlist -->
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
