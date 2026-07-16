<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  ToolboxComponent,
  LegendComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { NiwisMesswert, NiwisZeitreihenReferenz } from '../../types/niwis'

use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, ToolboxComponent, LegendComponent, CanvasRenderer])

const props = withDefaults(defineProps<{
  data: NiwisMesswert[]
  title?: string
  einheit?: string
  height?: string
  referenceSeries?: {
    median: NiwisZeitreihenReferenz | null
    max: NiwisZeitreihenReferenz | null
    min: NiwisZeitreihenReferenz | null
  }
}>(), {
  height: '400px',
})

const emit = defineEmits<{
  'date-range-select': [range: { von: string; bis: string }]
}>()

const sortedData = computed(() => [...props.data].sort((a, b) => a.datum.localeCompare(b.datum)))

function dayOfYear(dateStr: string): number {
  const d = new Date(dateStr)
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
}

function referenceValue(series: NiwisZeitreihenReferenz | null | undefined, dateStr: string): number | null {
  if (!series?.werte) return null
  const doy = dayOfYear(dateStr) - 1 // 0-indexed
  return doy >= 0 && doy < series.werte.length ? series.werte[doy] : null
}

const option = computed(() => {
  const sorted = sortedData.value
  const series: any[] = [{
    name: props.title ?? 'Messwert',
    type: 'line',
    data: sorted.map((d) => d.messwert),
    smooth: false,
    symbol: 'none',
    lineStyle: { width: 1.5 },
    areaStyle: { opacity: 0.05 },
    z: 2,
  }]

  // Min/Max envelope (area between two lines using stack)
  if (props.referenceSeries?.min) {
    series.push({
      name: 'Min (1991–2020)',
      type: 'line',
      data: sorted.map(d => referenceValue(props.referenceSeries!.min, d.datum)),
      lineStyle: { opacity: 0 },
      itemStyle: { color: '#dbeafe' },
      symbol: 'none',
      stack: 'envelope',
      z: 0,
    })
  }
  if (props.referenceSeries?.max && props.referenceSeries?.min) {
    series.push({
      name: 'Max (1991–2020)',
      type: 'line',
      data: sorted.map(d => {
        const maxVal = referenceValue(props.referenceSeries!.max, d.datum)
        const minVal = referenceValue(props.referenceSeries!.min, d.datum)
        return maxVal !== null && minVal !== null ? maxVal - minVal : null
      }),
      lineStyle: { opacity: 0 },
      areaStyle: { color: 'rgba(147, 197, 253, 0.15)' },
      itemStyle: { color: '#dbeafe' },
      symbol: 'none',
      stack: 'envelope',
      z: 0,
    })
  }

  // Median reference line
  if (props.referenceSeries?.median) {
    series.push({
      name: 'Median (1991–2020)',
      type: 'line',
      data: sorted.map(d => referenceValue(props.referenceSeries!.median, d.datum)),
      lineStyle: { type: 'dashed', color: '#9ca3af', width: 1.5 },
      itemStyle: { color: '#9ca3af' },
      symbol: 'none',
      z: 1,
    })
  }

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params]
        const unit = props.einheit ?? ''
        let html = `<b>${items[0].name}</b>`
        for (const item of items) {
          if (item.value == null) continue
          html += `<br/>${item.marker} ${item.seriesName}: ${typeof item.value === 'number' ? item.value.toFixed(2) : item.value} ${unit}`
        }
        return html
      },
    },
    legend: {
      show: series.length > 1,
      top: 0,
      left: 'center',
      textStyle: { fontSize: 11 },
    },
    toolbox: {
      feature: {
        dataZoom: { yAxisIndex: 'none' },
        restore: {},
        saveAsImage: {},
      },
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, bottom: 10 },
    ],
    grid: {
      top: series.length > 1 ? 60 : 30,
      bottom: 70,
    },
    xAxis: {
      type: 'category',
      data: sorted.map((d) => d.datum),
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: props.einheit,
    },
    series,
  }
})

function onDataZoom(params: any) {
  const sorted = sortedData.value
  if (sorted.length === 0) return

  const batchItem = Array.isArray(params.batch) ? params.batch[0] : params
  const start: number | undefined = batchItem?.start
  const end: number | undefined = batchItem?.end
  if (start == null || end == null) return

  const startIdx = Math.round((start / 100) * (sorted.length - 1))
  const endIdx = Math.round((end / 100) * (sorted.length - 1))
  const von = sorted[Math.min(startIdx, endIdx)]?.datum
  const bis = sorted[Math.max(startIdx, endIdx)]?.datum

  if (von && bis) {
    emit('date-range-select', { von, bis })
  }
}
</script>

<template>
  <VChart :option="option" :style="{ height }" autoresize @datazoom="onDataZoom" />
</template>
