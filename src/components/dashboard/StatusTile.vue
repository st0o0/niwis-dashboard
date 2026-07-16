<script setup lang="ts">
const props = defineProps<{
  label: string
  count: number
  color: string
  total: number
}>()
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
    <div class="flex items-center justify-between">
      <div>
        <div class="text-2xl font-bold">{{ count }}</div>
        <div class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ label }}</div>
      </div>
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
        :style="{ backgroundColor: color }"
      >
        {{ total > 0 ? Math.round(count / total * 100) : 0 }}%
      </div>
    </div>
  </div>
</template>
