<script setup lang="ts">
import type { NiwisMesswert } from '../../types/niwis'

const props = withDefaults(defineProps<{
  data: NiwisMesswert[]
  filename?: string
}>(), {
  filename: 'niwis-export',
})

function exportCsv() {
  if (props.data.length === 0) return
  const header = 'Messstelle;Datum;Messwert;Einheit;Flag'
  const rows = props.data.map((d) =>
    `${d.messstelleNr};${d.datum};${d.messwert};${d.einheit};${d.flag ?? ''}`,
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <button
    @click="exportCsv"
    :disabled="data.length === 0"
    class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
    CSV Export
  </button>
</template>
