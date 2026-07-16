<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  LMap,
  LTileLayer,
  LCircleMarker,
  LPopup,
  LControlLayers,
} from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import type { NiwisStation } from '../../types/niwis'
import { CLASSIFICATION_COLORS } from '../../types/niwis'
import { useClassificationStore } from '../../stores/classification'
import StationPopup from './StationPopup.vue'

const props = withDefaults(defineProps<{
  stations: NiwisStation[]
  height?: string
  interactive?: boolean
}>(), {
  height: '100%',
  interactive: true,
})

const mappableStations = computed(() =>
  props.stations.filter((s) => s.breite !== undefined && s.laenge !== undefined),
)

const emit = defineEmits<{
  'station-click': [messstelleNr: string]
}>()

const classificationStore = useClassificationStore()

const center = ref<[number, number]>([51.1657, 10.4515])
const zoom = ref(6)

function markerColor(station: NiwisStation): string {
  const klasse = classificationStore.getKlasse(station.messstelleNr)
  return CLASSIFICATION_COLORS[klasse]
}

function onMarkerClick(station: NiwisStation) {
  emit('station-click', station.messstelleNr)
}
</script>

<template>
  <div :style="{ height: props.height }">
    <LMap
      :zoom="zoom"
      :center="center"
      class="w-full h-full rounded-lg z-0"
    >
      <LControlLayers v-if="props.interactive" />
      <LTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        layer-type="base"
        name="OpenStreetMap"
      />
      <LTileLayer
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenTopoMap"
        layer-type="base"
        name="Topografisch"
        :visible="false"
      />
      <LCircleMarker
        v-for="station in mappableStations"
        :key="station.messstelleNr"
        :lat-lng="[station.breite, station.laenge]"
        :radius="7"
        :color="markerColor(station)"
        :fill-color="markerColor(station)"
        :fill-opacity="0.8"
        :weight="2"
        @click="onMarkerClick(station)"
      >
        <LPopup v-if="props.interactive">
          <StationPopup :station="station" />
        </LPopup>
      </LCircleMarker>
    </LMap>
  </div>
</template>
