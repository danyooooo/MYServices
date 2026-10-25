<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import Icon from './Icon.vue'
import { api } from '../lib/api'
import { formatDate, formatTime, number } from '../lib/weather'

const advisories = ref([])
const detail = ref(null)
const selectedId = ref('')
const query = ref('')
const scope = ref('latest')
const visibleCount = ref(24)
const loading = ref(false)
const detailLoading = ref(false)
const error = ref('')
const detailError = ref('')
const trackElement = ref(null)
const sorted = computed(() => [...advisories.value].sort((a, b) => Date.parse(b.issueTime) - Date.parse(a.issueTime)))
const listed = computed(() => {
  const seen = new Set()
  const needle = query.value.trim().toLowerCase()
  return sorted.value.filter(item => {
    if (scope.value === 'latest') {
      const key = String(item.cycloneName || item.cycloneId || item.id).toUpperCase()
      if (seen.has(key)) return false
      seen.add(key)
    }
    return !needle || [item.cycloneName, item.cycloneId, item.grade, item.tcac].some(value => String(value || '').toLowerCase().includes(needle))
  })
})
const visible = computed(() => listed.value.slice(0, visibleCount.value))
const forecast = computed(() => Array.isArray(detail.value?.forecastData?.forecasts) ? detail.value.forecastData.forecasts : [])
let controller
let detailController
let trackMap

async function load() {
  controller?.abort()
  controller = new AbortController()
  const current = controller
  loading.value = true
  error.value = ''
  try {
    const data = await api.cyclones(current.signal)
    if (current.signal.aborted) return
    if (!Array.isArray(data)) throw new Error('No advisory list was returned.')
    advisories.value = data
  } catch (cause) {
    if (!current.signal.aborted) error.value = cause.message || 'Cyclone advisories could not be loaded.'
  } finally {
    if (controller === current) loading.value = false
  }
}

async function selectAdvisory(id) {
  detailController?.abort()
  detail.value = null
  detailError.value = ''
  selectedId.value = id
  if (!id) return
  const current = new AbortController()
  detailController = current
  detailLoading.value = true
  try {
    const data = await api.cyclone(id, current.signal)
    if (!current.signal.aborted) detail.value = data
  } catch (cause) {
    if (!current.signal.aborted) detailError.value = cause.message || 'The advisory could not be loaded.'
  } finally {
    if (detailController === current) detailLoading.value = false
  }
}

async function drawTrack() {
  trackMap?.remove()
  trackMap = null
  if (!detail.value) return
  await nextTick()
  if (!trackElement.value) return
  trackMap = L.map(trackElement.value, { scrollWheelZoom: false })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 12 }).addTo(trackMap)
  const points = []
  const lat = Number(detail.value.obsLat)
  const lon = Number(detail.value.obsLon)
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    points.push([lat, lon])
    L.circleMarker([lat, lon], { radius: 8, color: '#7dd3fc', fillColor: '#38bdf8', fillOpacity: 1 }).addTo(trackMap).bindPopup('Observed position')
  }
  for (const item of forecast.value) {
    const point = [Number(item.lat), Number(item.lon)]
    if (!point.every(Number.isFinite)) continue
    points.push(point)
    L.circleMarker(point, { radius: 5, color: '#fbbf24', fillColor: '#f59e0b', fillOpacity: .9 }).addTo(trackMap)
      .bindPopup(`+${item.step_hours} h · ${formatDate(item.dt)} ${formatTime(item.dt)} MYT`)
  }
  if (points.length > 1) L.polyline(points, { color: '#fbbf24', weight: 3, dashArray: '7 6' }).addTo(trackMap)
  if (points.length) trackMap.fitBounds(L.latLngBounds(points).pad(.35), { maxZoom: 7 })
  else trackMap.setView([10, 115], 4)
}

watch(detail, drawTrack)
watch([query, scope], () => { visibleCount.value = 24 })
onMounted(load)
onUnmounted(() => { controller?.abort(); detailController?.abort(); trackMap?.remove() })
</script>

<template>
  <section aria-labelledby="cyclones-title">
    <div class="view-heading"><div><span class="eyebrow">Tropical cyclone reports</span><h2 id="cyclones-title">Cyclone advisories</h2><p>Read issued advisories and inspect forecast positions. Historical reports are included.</p></div><button class="liquid-btn liquid-btn-glass" :disabled="loading" @click="load"><Icon name="refresh" :class="{ spinning: loading }" />Refresh</button></div>
    <div v-if="error" class="liquid-card error-panel" role="alert"><Icon name="alert" /><h3>Advisories unavailable</h3><p>{{ error }}</p><button class="liquid-btn liquid-btn-glass" @click="load">Try again</button></div>
    <template v-else>
      <div class="cyclone-controls"><div class="segmented-control" aria-label="Advisory scope"><button :class="{ active: scope === 'latest' }" :aria-pressed="scope === 'latest'" @click="scope = 'latest'">Latest per cyclone</button><button :class="{ active: scope === 'all' }" :aria-pressed="scope === 'all'" @click="scope = 'all'">All advisories</button></div><label class="cyclone-search"><Icon name="search" /><span class="sr-only">Search cyclones</span><input v-model="query" type="search" placeholder="Search name, ID or agency"></label></div>
      <p v-if="loading" class="liquid-card loading-panel" role="status">Loading cyclone advisories…</p>
      <div v-else-if="visible.length" class="cyclone-list"><button v-for="item in visible" :key="item.id" class="liquid-card cyclone-row" :class="{ selected: selectedId === item.id }" @click="selectAdvisory(item.id)"><span class="cyclone-symbol"><Icon name="cyclone" /></span><span class="cyclone-row-main"><strong>{{ item.cycloneName || 'Unnamed cyclone' }} <small>{{ item.cycloneId }}</small></strong><span>{{ item.grade || 'Cyclone' }} · {{ item.tcac || 'Advisory' }}</span></span><span class="cyclone-row-date">{{ formatDate(item.issueTime) }}<small>{{ formatTime(item.issueTime) }} MYT</small></span><Icon name="chevron" /></button></div>
      <div v-else class="liquid-card empty-panel"><Icon name="cyclone" /><h3>No matching advisories</h3><p>Try another name or show all advisories.</p></div>
      <div v-if="listed.length > visibleCount" class="pagination"><button class="liquid-btn liquid-btn-glass" @click="visibleCount += 24">Show more</button><span>{{ visible.length }} of {{ listed.length }}</span></div>
      <div v-if="selectedId" class="cyclone-detail-section"><div class="view-heading"><div><span class="eyebrow">Selected report</span><h2>{{ detail?.cycloneName || 'Cyclone advisory' }}</h2></div><button class="liquid-btn liquid-btn-glass" @click="selectAdvisory('')"><Icon name="close" />Close</button></div>
        <p v-if="detailLoading" class="liquid-card loading-panel" role="status">Loading advisory…</p>
        <div v-else-if="detailError" class="liquid-card error-panel" role="alert"><h3>Advisory unavailable</h3><p>{{ detailError }}</p><button class="liquid-btn liquid-btn-glass" @click="selectAdvisory(selectedId)">Try again</button></div>
        <template v-else-if="detail"><div class="cyclone-summary"><div class="liquid-card metric-card"><span class="section-label">Issued</span><div class="metric-value cyclone-metric">{{ formatDate(detail.issueTime) }}</div><p class="metric-note">{{ formatTime(detail.issueTime) }} MYT · {{ detail.tcac }}</p></div><div class="liquid-card metric-card"><span class="section-label">Maximum wind</span><div class="metric-value">{{ number(detail.maxWind) }}<small>kt</small></div><p class="metric-note">Gusts {{ number(detail.gustWind) }} kt</p></div><div class="liquid-card metric-card"><span class="section-label">Pressure</span><div class="metric-value">{{ number(detail.pressure) }}<small>hPa</small></div><p class="metric-note">{{ detail.grade || 'Cyclone' }}</p></div></div>
          <div class="liquid-card cyclone-track-card"><div class="section-heading"><h2>Observed position & forecast track</h2><span class="subtle">{{ number(detail.obsLat, 1) }}°N · {{ number(detail.obsLon, 1) }}°E</span></div><div ref="trackElement" class="cyclone-track-map" aria-label="Cyclone forecast track map"></div><p class="subtle">Blue: observed position · Amber: forecast positions. The path follows the positions in this issued advisory.</p></div>
          <div v-if="forecast.length" class="liquid-card wind-table-card"><div class="section-heading"><h2>Forecast positions</h2></div><div class="wind-table-wrap"><table class="wind-table"><thead><tr><th scope="col">Lead</th><th scope="col">Valid time (MYT)</th><th scope="col">Latitude</th><th scope="col">Longitude</th><th scope="col">Wind</th></tr></thead><tbody><tr v-for="point in forecast" :key="`${point.step_hours}-${point.dt}`"><th scope="row">+{{ point.step_hours }} h</th><td>{{ formatDate(point.dt) }} {{ formatTime(point.dt) }}</td><td>{{ number(point.lat, 1) }}°</td><td>{{ number(point.lon, 1) }}°</td><td>{{ point.wind_speed_kt == null ? '—' : `${number(point.wind_speed_kt)} kt` }}</td></tr></tbody></table></div></div>
          <details v-if="detail.rawText" class="liquid-card cyclone-raw"><summary>Original advisory text</summary><pre>{{ detail.rawText }}</pre></details>
        </template>
      </div>
    </template>
  </section>
</template>
