<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  provider: { type: String, required: true },
  lines: { type: Array, default: () => [] },
  selectedRouteId: { type: String, default: '' },
  selectedStopId: { type: [String, Number], default: '' },
  vehicles: { type: Array, default: () => [] },
  networkLoading: { type: Boolean, default: false },
  updatedAt: { type: Date, default: null },
})
const emit = defineEmits(['select-stop', 'refresh', 'retry-network'])
const mapElement = ref(null)
const tileFailed = ref(false)
const visibleLineIds = ref([])
const visibleLines = computed(() => props.lines.filter(line => visibleLineIds.value.includes(String(line.id))))
const visibleStopCount = computed(() => new Set(visibleLines.value.flatMap(line => (line.stops || []).map(stop => String(stop.stop_id ?? stop.number)))).size)
const loadedLineCount = computed(() => props.lines.filter(line => line.loaded).length)
const visibleVehicles = computed(() => visibleLineIds.value.includes(String(props.selectedRouteId)) ? props.vehicles : [])
const providerName = computed(() => ({ rapidkl: 'Rapid KL', gokl: 'GoKL', sits: 'SITS' })[props.provider] || 'Transit')
let map
let routeLayer
let stopLayer
let vehicleLayer
let stopMarkers = new Map()
let routeBounds = null
let followSelectedStop = false

function coords(point) {
  const lat = Number(Array.isArray(point) ? point[0] : point?.lat ?? point?.stop_lat)
  const lng = Number(Array.isArray(point) ? point[1] : point?.lng ?? point?.stop_lon)
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null
}
function stopData(stop) {
  const location = stop.location || stop
  return { id: String(stop.stop_id ?? stop.number ?? ''), name: stop.stop_name || stop.name || 'Stop', point: coords(location) }
}
function popup(title, details = []) {
  const root = document.createElement('div')
  root.className = 'map-popup'
  const heading = document.createElement('strong')
  heading.textContent = title
  root.appendChild(heading)
  for (const detail of details.filter(Boolean)) {
    const line = document.createElement('span')
    line.textContent = detail
    root.appendChild(line)
  }
  return root
}
function lineColor(hex) {
  hex = String(hex || '').replace(/^#/, '')
  if (!/^[a-f\d]{6}$/i.test(hex)) return '#f9a8d4'
  const channels = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16))
  const brightness = (channels[0] * 299 + channels[1] * 587 + channels[2] * 114) / 1000
  return brightness < 130 ? `#${channels.map(channel => Math.round(channel * .55 + 255 * .45).toString(16).padStart(2, '0')).join('')}` : `#${hex}`
}
function redrawNetwork() {
  if (!map) return
  routeLayer.clearLayers()
  stopLayer.clearLayers()
  stopMarkers = new Map()
  const bounds = L.latLngBounds([])
  const paths = visibleLines.value.flatMap(line => (line.paths || []).map(points => ({ points, color: lineColor(line.color) })))
  for (const path of paths) {
    const points = (Array.isArray(path.points) ? path.points : []).map(coords).filter(Boolean)
    if (points.length < 2) continue
    L.polyline(points, { color: '#300d25', weight: 8, opacity: .62, lineJoin: 'round', interactive: false }).addTo(routeLayer)
    L.polyline(points, { color: path.color, weight: 4, opacity: .95, lineJoin: 'round' }).addTo(routeLayer)
    points.forEach(point => bounds.extend(point))
  }
  const stops = visibleLines.value.flatMap(line => (line.stops || []).map(stop => ({ stop, routeId: line.id, color: lineColor(line.color), lineName: line.name })))
  const seenStops = new Set()
  for (const entry of stops) {
    const item = stopData(entry.stop)
    if (!item.point || !item.id) continue
    if (seenStops.has(item.id)) continue
    seenStops.add(item.id)
    bounds.extend(item.point)
    const selected = item.id === String(props.selectedStopId)
    const marker = L.circleMarker(item.point, {
      radius: selected ? 8 : 5,
      color: selected ? '#ffffff' : '#fce7f3',
      weight: selected ? 3 : 2,
      fillColor: selected ? '#db2777' : entry.color,
      fillOpacity: 1,
    }).addTo(stopLayer)
    marker.bindPopup(popup(item.name, [entry.lineName, item.id]))
    marker.on('click', () => {
      const currentLine = visibleLines.value.find(line => String(line.id) === props.selectedRouteId && line.stops?.some(stop => String(stop.stop_id ?? stop.number) === item.id))
      emit('select-stop', item.id, currentLine?.id ?? entry.routeId)
    })
    stopMarkers.set(item.id, { marker, color: entry.color })
  }
  routeBounds = bounds.isValid() ? bounds : null
  if (!followSelectedStop || !panToSelectedStop()) fitRoute()
  redrawVehicles()
}
function fitRoute() {
  if (!map) return
  followSelectedStop = false
  if (routeBounds) map.fitBounds(routeBounds, { padding: [30, 30], maxZoom: 14, animate: false })
  else map.setView([3.139, 101.687], 12, { animate: false })
}
function panToSelectedStop() {
  const marker = stopMarkers.get(String(props.selectedStopId))?.marker
  if (!marker) return false
  map.setView(marker.getLatLng(), Math.max(map.getZoom(), 14), { animate: false })
  return true
}
async function focusStop() {
  if (!map || !props.selectedStopId) return
  const routeId = String(props.selectedRouteId)
  if (props.lines.some(line => String(line.id) === routeId) && !visibleLineIds.value.includes(routeId)) {
    visibleLineIds.value = [...visibleLineIds.value, routeId]
    await nextTick()
  }
  followSelectedStop = true
  for (const [id, { marker, color }] of stopMarkers) {
    const selected = id === String(props.selectedStopId)
    marker.setStyle({ radius: selected ? 8 : 5, color: selected ? '#fff' : '#fce7f3', weight: selected ? 3 : 2, fillColor: selected ? '#db2777' : color })
  }
  panToSelectedStop()
}
function redrawVehicles() {
  if (!vehicleLayer) return
  vehicleLayer.clearLayers()
  for (const vehicle of visibleVehicles.value) {
    const point = coords(vehicle.location || vehicle)
    if (!point) continue
    const marker = L.circleMarker(point, { radius: 10, color: '#fff', weight: 3, fillColor: '#22c55e', fillOpacity: .98, className: 'live-vehicle-marker' }).addTo(vehicleLayer)
    marker.bindPopup(popup(vehicle.label || 'Vehicle', [vehicle.detail, vehicle.status]))
  }
}
const updatedLabel = () => props.updatedAt ? new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(props.updatedAt) : ''
onMounted(async () => {
  await nextTick()
  map = L.map(mapElement.value, { zoomControl: false, scrollWheelZoom: false, attributionControl: true })
  L.control.zoom({ position: 'topright' }).addTo(map)
  L.tileLayer('https://api.dani-dev.co.za/v2/transport/rapidkl/no-auth/tile/{z}/{x}/{y}.png', {
    minZoom: 9, maxZoom: 18, tileSize: 256,
    attribution: 'Map tiles via <a href="https://github.com/danyooooo/malaysian-api" target="_blank" rel="noopener noreferrer">malaysian-api</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
  }).on('tileerror', () => { tileFailed.value = true }).addTo(map)
  routeLayer = L.layerGroup().addTo(map)
  stopLayer = L.layerGroup().addTo(map)
  vehicleLayer = L.layerGroup().addTo(map)
  redrawNetwork()
  requestAnimationFrame(() => map?.invalidateSize())
})
let previousLineIds = new Set()
watch(() => props.lines.map(line => String(line.id)).join('|'), () => {
  const selected = new Set(visibleLineIds.value)
  visibleLineIds.value = props.lines.map(line => String(line.id)).filter(id => !previousLineIds.has(id) || selected.has(id))
  previousLineIds = new Set(props.lines.map(line => String(line.id)))
}, { immediate: true })
watch(() => [props.lines, visibleLineIds.value], redrawNetwork, { deep: true })
watch(() => [props.selectedStopId, props.selectedRouteId], focusStop)
watch(() => props.vehicles, redrawVehicles, { deep: true })
onBeforeUnmount(() => { map?.remove(); map = null })
</script>

<template>
  <div class="liquid-card panel transit-map-panel">
    <div class="map-heading"><div class="panel-heading"><span class="section-kicker">Network map</span><h3>{{ providerName }} network</h3><p>All {{ provider === 'rapidkl' ? 'lines' : provider === 'sits' ? 'routes for this council' : 'routes' }} are shown by default. Use the checkboxes to hide or show each one. Selecting a stop above moves the map to it.</p></div><div class="map-actions"><button class="secondary-button" type="button" @click="fitRoute">Fit visible {{ provider === 'rapidkl' ? 'lines' : 'routes' }}</button><button v-if="provider !== 'rapidkl'" class="secondary-button" type="button" @click="emit('refresh')">Refresh vehicles</button></div></div>
    <fieldset class="rapid-line-filters"><legend>{{ provider === 'rapidkl' ? 'Lines' : 'Routes' }} on map <span>{{ visibleLines.length }} / {{ lines.length }} visible<template v-if="networkLoading"> · {{ loadedLineCount }} loaded</template></span></legend><div class="rapid-line-filter-list"><label v-for="line in lines" :key="line.id"><input v-model="visibleLineIds" type="checkbox" :value="String(line.id)"><i :style="{ backgroundColor: lineColor(line.color) }"></i><span>{{ line.name }}</span><small v-if="!line.loaded">{{ networkLoading ? 'Loading' : 'Unavailable' }}</small></label></div></fieldset>
    <div class="map-frame"><div ref="mapElement" class="transit-map" role="img" :aria-label="`${providerName} network map with ${visibleLines.length} visible routes and ${visibleStopCount} stops`"></div><div class="map-overlays"><span><i class="legend-stop"></i> Stops</span><span v-if="provider !== 'rapidkl'"><i class="legend-vehicle"></i> Reported buses</span></div></div>
    <div class="map-meta"><span v-if="provider === 'rapidkl'">Train locations are not provided by the public ETA endpoint.</span><span v-else-if="visibleVehicles.length">{{ visibleVehicles.length }} vehicle{{ visibleVehicles.length === 1 ? '' : 's' }} reported <template v-if="updatedAt">· checked {{ updatedLabel() }} MYT</template></span><span v-else>There is no vehicle position for the selected route yet. Refresh to check again.</span><span v-if="networkLoading">Loading route paths and stops ({{ loadedLineCount }} / {{ lines.length }})…</span><span v-else-if="loadedLineCount < lines.length">{{ lines.length - loadedLineCount }} route{{ lines.length - loadedLineCount === 1 ? '' : 's' }} could not load. <button class="text-button" type="button" @click="emit('retry-network')">Retry</button></span><span v-if="tileFailed">Some map tiles could not load.</span></div>
    <div v-if="visibleVehicles.length" class="map-vehicle-list"><div v-for="(vehicle,index) in visibleVehicles" :key="`${vehicle.label}-${index}`"><span class="vehicle-badge">BUS</span><strong>{{ vehicle.label }}</strong><small>{{ vehicle.detail || vehicle.status || 'Position reported by provider' }}</small></div></div>
  </div>
</template>
