<script setup lang="ts">
const props = defineProps<{ von: string; bis: string }>()
const emit = defineEmits<{
  'update:von': [value: string]
  'update:bis': [value: string]
  preset: [days: number]
}>()

const presets = [
  { label: '7T', days: 7 },
  { label: '30T', days: 30 },
  { label: '90T', days: 90 },
  { label: '1J', days: 365 },
]
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <button
      v-for="p in presets"
      :key="p.days"
      @click="emit('preset', p.days)"
      class="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {{ p.label }}
    </button>
    <div class="flex items-center gap-1 ml-2">
      <input
        type="date"
        :value="props.von"
        @input="emit('update:von', ($event.target as HTMLInputElement).value)"
        class="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      />
      <span class="text-gray-400">–</span>
      <input
        type="date"
        :value="props.bis"
        @input="emit('update:bis', ($event.target as HTMLInputElement).value)"
        class="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      />
    </div>
  </div>
</template>
