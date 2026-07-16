<script setup lang="ts">
import { CLASSIFICATION_COLORS, CLASSIFICATION_LABELS, type NiedrigwasserKlasse } from '../../types/niwis'

const props = defineProps<{ klasse: NiedrigwasserKlasse }>()
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      class="inline-block w-3 h-3 rounded-full shrink-0"
      :style="{ backgroundColor: CLASSIFICATION_COLORS[props.klasse] }"
    />
    <span class="text-sm font-medium">{{ CLASSIFICATION_LABELS[props.klasse] }}</span>
  </div>
</template>
