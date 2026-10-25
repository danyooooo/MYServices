<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from './Icon.vue'
import { api } from '../lib/api'
import { formatDate, formatTime } from '../lib/weather'
import { loadRaster, manifestFrames } from '../lib/weatherLayers'

const kind = ref('radar')
const manifests = ref({ radar: null, rains: null })
const loadingManifest = ref(false)
const loadingRaster = ref(false)
const error = ref('')
const rasterError = ref('')
const frameIndex = ref(0)
const mapElement = ref(null)
const frames = computed(() => manifestFrames(manifests.value[kind.value], kind.value))
const frame = computed(() => frames.value[frameIndex.value])
const bounds = computed(() => manifests.value[kind.value]?.bounds)
const legend = computed(() => kind.value === 'rains'
  ? [{ label: '0.1', color: '#38bdf8' }, { label: '1', color: '#22c55e' }, { label: '5', color: '#facc15' }, { label: '15', color: '#fb923c' }, { label: '30+', color: '#f43f5e' }]
  : [{ label: '5', color: '#38bdf8' }, { label: '20', color: '#22c55e' }, { label: '35', color: '#facc15' }, { label: '45', color: '#fb923c' }, { label: '55+', color: '#f43f5e' }])
let map
let overlay
let manifestController
let rasterController

function leafletBounds(value) {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(Number.isFinite)) return null
  return [[value[1], value[0]], [value[3], value[2]]]
}

async function loadManifest(force = false) {
  const currentKind = kind.value
  if (manifests.value[currentKind] && !force) return
  manifestController?.abort()
  const controller = new AbortController()
  manifestController = controller
  loadingManifest.value = true
  error.value = ''
  try {
    const data = await (currentKind === 'radar' ? api.radarManifest(controller.signal) : api.rainsManifest(controller.signal))
    if (controller.signal.aborted) return
    if (!Array.isArray(data?.frames)) throw new Error('No frames were returned by the manifest.')
    manifests.value = { ...manifests.value, [currentKind]: data }
    frameIndex.value = currentKind === 'radar' ? Math.max(0, manifestFrames(data, currentKind).length - 1) : 0
    await nextTick()
    const extent = leafletBounds(data.bounds)
    if (extent && map) map.fitBounds(extent, { padding: [18, 18] })
  } catch (cause) {
    if (!controller.signal.aborted) error.value = cause.message || 'The manifest could not be loaded.'
  } finally {
    if (manifestController === controller) loadingManifest.value = false
  }
}

async function showFrame() {
  rasterController?.abort()
  if (overlay) { overlay.remove(); overlay = null }
  rasterError.value = ''
  const selected = frame.value
  const extent = leafletBounds(bounds.value)
  if (!selected || !extent || !map) return
  const controller = new AbortController()
  rasterController = controller
  loadingRaster.value = true
  try {
    const image = await loadRaster(selected.url, kind.value, manifests.value[kind.value].nodata, controller.signal)
    if (controller.signal.aborted) return
    overlay = L.imageOverlay(image, extent, { opacity: .85, interactive: false }).addTo(map)
  } catch (cause) {
    if (!controller.signal.aborted) rasterError.value = cause.message || 'The raster could not be rendered.'
  } finally {
    if (rasterController === controller) loadingRaster.value = false
  }
}

function selectKind(next) {
  if (kind.value === next) return
  kind.value = next
  frameIndex.value = 0
  loadManifest()
}

watch([kind, frameIndex, manifests], showFrame)
onMounted(() => {
  map = L.map(mapElement.value, { zoomControl: true, scrollWheelZoom: false }).setView([4.4, 109], 5)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 12,
  }).addTo(map)
  loadManifest()
})
onUnmounted(() => { manifestController?.abort(); rasterController?.abort(); map?.remove() })
</script>

<template>
  <section aria-labelledby="maps-title">
    <div class="view-heading"><div><span class="eyebrow">Weather imagery</span><h2 id="maps-title">Radar & RaINS</h2><p>Explore observed radar and short-range rain forecast frames over Malaysia.</p></div><button class="liquid-btn liquid-btn-glass" :disabled="loadingManifest" @click="loadManifest(true)"><Icon name="refresh" :class="{ spinning: loadingManifest }" />Refresh</button></div>
    <div class="filter-row"><div class="segmented-control" aria-label="Weather imagery"><button :class="{ active: kind === 'radar' }" :aria-pressed="kind === 'radar'" @click="selectKind('radar')">Radar</button><button :class="{ active: kind === 'rains' }" :aria-pressed="kind === 'rains'" @click="selectKind('rains')">RaINS forecast</button></div><span class="subtle">Times shown in MYT</span></div>
    <div v-if="error" class="liquid-card error-panel" role="alert"><Icon name="alert" /><h3>Imagery unavailable</h3><p>{{ error }}</p><button class="liquid-btn liquid-btn-glass" @click="loadManifest(true)">Try again</button></div>
    <div v-else class="liquid-card weather-map-card">
      <div class="weather-map-header"><div><strong>{{ kind === 'radar' ? 'Radar reflectivity' : 'RaINS precipitation rate' }}</strong><p v-if="frame" class="subtle">{{ formatDate(kind === 'radar' ? frame.epochMili : frame.validEpochMili) }} · {{ formatTime(kind === 'radar' ? frame.epochMili : frame.validEpochMili) }} MYT<span v-if="kind === 'rains'"> · +{{ frame.leadMinutes }} min from {{ formatTime(frame.baseEpochMili) }} run</span></p></div><span class="subtle">{{ frames.length ? `${frameIndex + 1} / ${frames.length}` : 'No frames' }}</span></div>
      <div class="weather-map-wrap"><div ref="mapElement" class="weather-map" aria-label="Map of Malaysian weather imagery"></div><div v-if="loadingManifest || loadingRaster" class="map-message" role="status">{{ loadingManifest ? 'Loading manifest…' : 'Rendering GeoTIFF frame…' }}</div><div v-else-if="rasterError" class="map-message map-error" role="alert"><strong>Image unavailable</strong><span>{{ rasterError }} The manifest can still be browsed.</span></div></div>
      <div v-if="frames.length" class="frame-controls"><button class="liquid-btn liquid-btn-glass" :disabled="frameIndex === 0" aria-label="Previous frame" @click="frameIndex--">←</button><input v-model.number="frameIndex" type="range" min="0" :max="frames.length - 1" step="1" aria-label="Select weather frame"><button class="liquid-btn liquid-btn-glass" :disabled="frameIndex >= frames.length - 1" aria-label="Next frame" @click="frameIndex++">→</button></div>
      <div v-else-if="!loadingManifest" class="empty-message">The current manifest has no imagery frames.</div>
      <div class="raster-legend"><span>{{ kind === 'radar' ? 'dBZ' : 'mm/h' }}</span><span v-for="stop in legend" :key="stop.label"><i :style="{ background: stop.color }"></i>{{ stop.label }}</span></div>
    </div>
  </section>
</template>
