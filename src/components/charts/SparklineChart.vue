<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { NiwisMesswert } from '../../types/niwis'

use([LineChart, GridComponent, CanvasRenderer])

const props = withDefaults(defineProps<{
  data: NiwisMesswert[]
  color?: string
  height?: string
}>(), {
  color: '#3b82f6',
  height: '40px',
})

const option = computed(() => {
  const sorted = [...props.data].sort((a, b) => a.datum.localeCompare(b.datum))
  return {
    grid: { top: 2, right: 2, bottom: 2, left: 2 },
    xAxis: { type: 'category', show: false, data: sorted.map((d) => d.datum) },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'line',
      data: sorted.map((d) => d.messwert),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: props.color, width: 1.5 },
      areaStyle: { color: props.color, opacity: 0.1 },
    }],
  }
})
</script>

<template>
  <VChart :option="option" :style="{ height }" autoresize />
</template>
