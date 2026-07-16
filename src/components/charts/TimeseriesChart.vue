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
import type { NiwisMesswert } from '../../types/niwis'

use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, ToolboxComponent, LegendComponent, CanvasRenderer])

const props = withDefaults(defineProps<{
  data: NiwisMesswert[]
  title?: string
  einheit?: string
  height?: string
}>(), {
  height: '400px',
})

const emit = defineEmits<{
  'date-range-select': [range: { von: string; bis: string }]
}>()

const sortedData = computed(() => [...props.data].sort((a, b) => a.datum.localeCompare(b.datum)))

const option = computed(() => {
  const sorted = sortedData.value
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return `${p.name}<br/>${p.value} ${props.einheit ?? ''}`
      },
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
      { type: 'slider', start: 0, end: 100 },
    ],
    xAxis: {
      type: 'category',
      data: sorted.map((d) => d.datum),
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: props.einheit,
    },
    series: [{
      name: props.title ?? 'Messwert',
      type: 'line',
      data: sorted.map((d) => d.messwert),
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 1.5 },
      areaStyle: { opacity: 0.05 },
    }],
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
