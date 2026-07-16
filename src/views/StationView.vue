<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStationStore } from '../stores/station'
import { useClassificationStore } from '../stores/classification'
import { useTrendStore } from '../stores/trend'
import { getStammdaten, getMesswerte, getReferenceValue, getReferenceSeries } from '../api/niwis'
import type { NiwisStammdaten, NiwisMesswert, MessgroesseType, NiwisZeitreihenReferenz, TrendDirection } from '../types/niwis'
import { MESSGROESSE_LABELS, MESSGROESSE_API_MAP, LANDCODE_LABELS } from '../types/niwis'
import TimeseriesChart from '../components/charts/TimeseriesChart.vue'
import ClassificationGauge from '../components/charts/ClassificationGauge.vue'
import DateRangePicker from '../components/shared/DateRangePicker.vue'
import WatchlistToggle from '../components/shared/WatchlistToggle.vue'
import ExportButton from '../components/shared/ExportButton.vue'
import CollapsibleSection from '../components/shared/CollapsibleSection.vue'

const route = useRoute()
const stationStore = useStationStore()
const classificationStore = useClassificationStore()
const trendStore = useTrendStore()

const messstelleNr = computed(() => route.params.id as string)
const station = computed(() => stationStore.getStationByNr(messstelleNr.value))
const stammdaten = ref<NiwisStammdaten | null>(null)
const messwerte = ref<NiwisMesswert[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const activeTab = ref<MessgroesseType>('abfluss')
const bis = ref(new Date().toISOString().slice(0, 10))
const von = ref(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))

interface RefStat {
  label: string
  value: number
  einheit: string
}

const referenceStats = ref<RefStat[]>([])
const referenceSeries = ref<{
  median: NiwisZeitreihenReferenz | null
  max: NiwisZeitreihenReferenz | null
  min: NiwisZeitreihenReferenz | null
}>({ median: null, max: null, min: null })

const ABFLUSS_STATS = [
  { key: 'NQ', label: 'NQ' },
  { key: 'MNQ', label: 'MNQ' },
  { key: 'MQ', label: 'MQ' },
  { key: 'Median Q Statisch', label: 'Median' },
]

const WASSERSTAND_STATS = [
  { key: 'NW', label: 'NW' },
  { key: 'MNW', label: 'MNW' },
  { key: 'MW', label: 'MW' },
]

const availableTabs = computed<MessgroesseType[]>(() => {
  if (!station.value?.messgroesse) return ['abfluss']
  return station.value.messgroesse
    .map((m) => MESSGROESSE_API_MAP[m])
    .filter((m): m is MessgroesseType => m !== undefined)
})

const einheit = computed(() => {
  if (messwerte.value.length > 0) return messwerte.value[0].einheit
  return ''
})

// Trend
const trend = computed(() => trendStore.getTrendForStation(messstelleNr.value))
const trendIcon = computed(() => {
  switch (trend.value) {
    case 'steigend': return '↗'
    case 'fallend': return '↘'
    case 'gleichbleibend': return '→'
    default: return ''
  }
})
const trendClass = computed(() => {
  switch (trend.value) {
    case 'steigend': return 'text-green-500'
    case 'fallend': return 'text-red-500'
    default: return 'text-gray-400'
  }
})

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const [stammResult, messResult] = await Promise.all([
      getStammdaten(messstelleNr.value),
      getMesswerte(activeTab.value, messstelleNr.value, von.value, bis.value),
    ])
    stammdaten.value = stammResult
    messwerte.value = messResult

    const statsToFetch = activeTab.value === 'abfluss' ? ABFLUSS_STATS
      : activeTab.value === 'wasserstand' ? WASSERSTAND_STATS
      : []

    const statResults = await Promise.allSettled(
      statsToFetch.map(async (s) => {
        const result = await getReferenceValue(messstelleNr.value, s.key)
        return { label: s.label, value: result.einzelwert, einheit: result.einheit ?? '' }
      })
    )
    referenceStats.value = statResults
      .filter((r): r is PromiseFulfilledResult<RefStat> => r.status === 'fulfilled')
      .map(r => r.value)

    // Load reference time series for chart overlay
    if (activeTab.value === 'abfluss') {
      const [med, max, min] = await Promise.allSettled([
        getReferenceSeries(messstelleNr.value, 'Median Q pro Kalendertag'),
        getReferenceSeries(messstelleNr.value, 'Max Q pro Kalendartag'),
        getReferenceSeries(messstelleNr.value, 'Min Q pro Kalendartag'),
      ])
      referenceSeries.value = {
        median: med.status === 'fulfilled' ? med.value : null,
        max: max.status === 'fulfilled' ? max.value : null,
        min: min.status === 'fulfilled' ? min.value : null,
      }
    } else if (activeTab.value === 'wasserstand') {
      const [med] = await Promise.allSettled([
        getReferenceSeries(messstelleNr.value, 'Median W pro Kalendertag'),
      ])
      referenceSeries.value = {
        median: med.status === 'fulfilled' ? med.value : null,
        max: null,
        min: null,
      }
    } else {
      referenceSeries.value = { median: null, max: null, min: null }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function onPreset(days: number) {
  bis.value = new Date().toISOString().slice(0, 10)
  von.value = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

const latestValue = computed(() => {
  if (messwerte.value.length === 0) return null
  return messwerte.value.reduce((a, b) => a.datum > b.datum ? a : b)
})

const latestComparison = computed(() => {
  if (!latestValue.value || referenceStats.value.length === 0) return null
  const mnStat = referenceStats.value.find(s => s.label === 'MNQ' || s.label === 'MNW')
  if (!mnStat) return null
  const current = latestValue.value.messwert
  const mn = mnStat.value
  if (current < mn) {
    const pct = Math.round((1 - current / mn) * 100)
    return {
      text: `Aktuell ${pct}% unter ${mnStat.label} (${mn.toFixed(1)} ${mnStat.einheit})`,
      class: 'text-red-600 dark:text-red-400 font-medium',
    }
  }
  return null
})

watch([messstelleNr, activeTab, von, bis], loadData)
onMounted(loadData)
</script>

<template>
  <div v-if="station" class="space-y-4">
    <!-- Hero: current value -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold">{{ station.name }}</h1>
            <WatchlistToggle :messstelle-nr="station.messstelleNr" />
          </div>
          <div class="text-gray-500 dark:text-gray-400 mt-1">
            {{ station.gewaesser ?? '' }} · {{ station.betreiber ?? '' }} · {{ LANDCODE_LABELS[station.landcode] ?? station.landcode }}
          </div>
        </div>
        <ClassificationGauge :klasse="classificationStore.getKlasse(station.messstelleNr)" />
      </div>

      <!-- Current value big display -->
      <div v-if="latestValue" class="mt-4 flex items-end gap-3">
        <span class="text-4xl font-bold">{{ latestValue.messwert }}</span>
        <span class="text-lg text-gray-500 dark:text-gray-400 mb-1">{{ latestValue.einheit }}</span>
        <span v-if="trend" class="text-2xl mb-0.5" :class="trendClass">{{ trendIcon }}</span>
        <span class="text-sm text-gray-400 dark:text-gray-500 mb-1.5">{{ latestValue.datum }}</span>
      </div>
      <div v-if="latestComparison" class="mt-2 text-sm" :class="latestComparison.class">
        {{ latestComparison.text }}
      </div>
    </div>

    <!-- Tabs -->
    <div v-if="availableTabs.length > 1" class="flex gap-1 border-b border-gray-200 dark:border-gray-700">
      <button
        v-for="tab in availableTabs"
        :key="tab"
        @click="activeTab = tab"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === tab
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
      >
        {{ MESSGROESSE_LABELS[tab] }}
      </button>
    </div>

    <!-- Zeitreihe (open by default) -->
    <CollapsibleSection title="Zeitreihe">
      <div class="pt-3 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <DateRangePicker
            :von="von"
            :bis="bis"
            @update:von="von = $event"
            @update:bis="bis = $event"
            @preset="onPreset"
          />
          <ExportButton :data="messwerte" :filename="`niwis-${station.name}-${activeTab}`" />
        </div>

        <div v-if="loading" class="flex justify-center py-12">
          <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>

        <div v-else-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
          {{ error }}
        </div>

        <div v-else-if="messwerte.length > 0">
          <TimeseriesChart
            :data="messwerte"
            :title="MESSGROESSE_LABELS[activeTab]"
            :einheit="einheit"
            :reference-series="referenceSeries"
            height="450px"
          />
        </div>

        <div v-else class="text-center py-12 text-gray-500 dark:text-gray-400">
          Keine Messwerte für den gewählten Zeitraum.
        </div>
      </div>
    </CollapsibleSection>

    <!-- Kennwerte (closed by default) -->
    <CollapsibleSection title="Kennwerte (Referenz 1991–2020)" :default-open="false">
      <div class="pt-3">
        <div v-if="referenceStats.length > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            v-for="stat in referenceStats"
            :key="stat.label"
            class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ stat.label }}</div>
            <div class="text-lg font-bold mt-1">{{ stat.value.toFixed(1) }}</div>
            <div class="text-xs text-gray-400 dark:text-gray-500">{{ stat.einheit }}</div>
          </div>
        </div>
        <div v-else class="text-sm text-gray-500 dark:text-gray-400">
          Keine Kennwerte verfügbar.
        </div>
        <div v-if="stammdaten?.nnq != null" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Historisches Minimum (NNQ): <strong>{{ stammdaten.nnq }} {{ einheit }}</strong>
          <span v-if="stammdaten.nnqDatum"> am {{ stammdaten.nnqDatum }}</span>
        </div>
        <div v-if="stammdaten?.nnw != null" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Historisches Minimum (NNW): <strong>{{ stammdaten.nnw }} cm</strong>
          <span v-if="stammdaten.nnwDatum"> am {{ stammdaten.nnwDatum }}</span>
        </div>
      </div>
    </CollapsibleSection>

    <!-- Stammdaten (closed by default) -->
    <CollapsibleSection v-if="stammdaten" title="Stammdaten" :default-open="false">
      <div class="pt-3">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt class="text-gray-500 dark:text-gray-400">Messstelle Nr.</dt>
          <dd>{{ stammdaten.messstelleNr }}</dd>
          <dt class="text-gray-500 dark:text-gray-400">Gewässer</dt>
          <dd>{{ stammdaten.gewaesser }}</dd>
          <dt class="text-gray-500 dark:text-gray-400">Betreiber</dt>
          <dd>{{ stammdaten.betreiber }}</dd>
          <dt class="text-gray-500 dark:text-gray-400">Institution</dt>
          <dd>{{ stammdaten.institution }}</dd>
          <dt class="text-gray-500 dark:text-gray-400">Bundesland</dt>
          <dd>{{ LANDCODE_LABELS[stammdaten.landcode] ?? stammdaten.landcode }}</dd>
          <dt class="text-gray-500 dark:text-gray-400">Koordinaten</dt>
          <dd>{{ stammdaten.breite?.toFixed(4) }}°N, {{ stammdaten.laenge?.toFixed(4) }}°E</dd>
          <template v-if="stammdaten.hoehePnp != null">
            <dt class="text-gray-500 dark:text-gray-400">Pegelnullpunkt</dt>
            <dd>{{ stammdaten.hoehePnp }} m ü. NHN{{ stammdaten.hoehensystem ? ` (${stammdaten.hoehensystem})` : '' }}</dd>
          </template>
          <template v-if="stammdaten.ezgGroesse != null">
            <dt class="text-gray-500 dark:text-gray-400">Einzugsgebiet</dt>
            <dd>{{ stammdaten.ezgGroesse }} km²</dd>
          </template>
          <template v-if="stammdaten.gkz != null">
            <dt class="text-gray-500 dark:text-gray-400">Gewässerkennzahl</dt>
            <dd>{{ stammdaten.gkz }}</dd>
          </template>
          <template v-if="stammdaten.lageGewaesser">
            <dt class="text-gray-500 dark:text-gray-400">Flusskilometer</dt>
            <dd>{{ stammdaten.lageGewaesser }}</dd>
          </template>
          <dt class="text-gray-500 dark:text-gray-400">Lizenz</dt>
          <dd>{{ stammdaten.lizenz }}</dd>
        </dl>
        <a
          v-if="stammdaten.urlMessstelle"
          :href="stammdaten.urlMessstelle"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Daten beim Betreiber ansehen
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </a>
      </div>
    </CollapsibleSection>
  </div>

  <div v-else class="flex justify-center py-12">
    <p class="text-gray-500 dark:text-gray-400">Station nicht gefunden.</p>
  </div>
</template>
