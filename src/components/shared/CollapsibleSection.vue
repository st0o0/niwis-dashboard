<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  defaultOpen?: boolean
}>(), {
  defaultOpen: true,
})

const open = ref(props.defaultOpen)
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
    <button
      @click="open = !open"
      class="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-xl"
      :class="{ 'rounded-b-xl': !open }"
    >
      <span>{{ title }}</span>
      <svg
        class="w-4 h-4 transition-transform duration-200"
        :class="{ 'rotate-180': open }"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
    <div v-show="open" class="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
      <slot />
    </div>
  </div>
</template>
