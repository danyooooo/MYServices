<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  routes: { type: Array, required: true },
  selectedIndex: { type: Number, default: 0 },
  origin: { type: Object, required: true },
  destination: { type: Object, required: true },
})
const emit = defineEmits(['select-route'])
const mapElement = ref(null)
const tileFailed = ref(false)
let map
let routeLayer
let markerLayer
let currentBounds

function point(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null
  const lng = Number(coordinates[0]), lat = Number(coordinates[1])
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null
}
function legPaths(leg) {
  const geometry = leg?.geometry
  const paths = geometry?.type === 'MultiLineString' ? geometry.coordinates : [geometry?.coordinates]
  return paths.filter(Array.isArray).map(path => path.map(point).filter(Boolean)).filter(path => path.length > 1)
}
function popup(title, subtitle) {
  const root = document.createElement('div')
  root.className = 'map-popup'
  const heading = document.createElement('strong')
  heading.textContent = title
  root.appendChild(heading)
  if (subtitle) {
    const detail = document.createElement('span')
    detail.textContent = subtitle
    root.appendChild(detail)
  }
  return root
}
function legColor(leg) {
  if (leg.type === 'pedestrain' || leg.type === 'pedestrian') return '#f9a8d4'
  const hex = leg.route_details?.route_color
  if (!/^[a-f\d]{6}$/i.test(hex || '')) return '#f472b6'
  const channels = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16))
  const brightness = (channels[0] * 299 + channels[1] * 587 + channels[2] * 114) / 1000
  return brightness < 135 ? `#${channels.map(value => Math.round(value * .5 + 127).toString(16).padStart(2, '0')).join('')}` : `#${hex}`
}
function addPoint(position, label, detail, color, radius = 6) {
  if (!position) return
  currentBounds.extend(position)
  L.circleMarker(position, { radius, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 })
    .bindPopup(popup(label, detail)).addTo(markerLayer)
}
function draw() {
  if (!map || !routeLayer || !markerLayer) return
  routeLayer.clearLayers()
  markerLayer.clearLayers()
  currentBounds = L.latLngBounds([])
  const selected = props.routes[props.selectedIndex]
  props.routes.forEach((route, index) => {
    if (index === props.selectedIndex) return
    for (const leg of route.legs || []) for (const path of legPaths(leg)) {
      L.polyline(path, { color: '#f9a8d4', weight: 3, opacity: .28, interactive: false }).addTo(routeLayer)
    }
  })
  for (const leg of selected?.legs || []) {
    const walking = leg.type === 'pedestrain' || leg.type === 'pedestrian'
    const label = walking ? 'Walk / transfer' : leg.route_details?.route_long_name || leg.route_details?.route_short_name || 'Transit'
    for (const path of legPaths(leg)) {
      L.polyline(path, { color: '#300d25', weight: 9, opacity: .7, interactive: false }).addTo(routeLayer)
      L.polyline(path, { color: legColor(leg), weight: walking ? 4 : 5, opacity: 1, dashArray: walking ? '6 8' : null })
        .bindPopup(popup(label, walking ? 'Walking connection' : 'Transit route')).addTo(routeLayer)
      path.forEach(position => currentBounds.extend(position))
    }
    for (const step of leg.steps || []) addPoint(point(step.geometry?.coordinates), step.stop_name || 'Stop', step.stop_id || '', '#3c4048')
  }
  addPoint([Number(props.origin.lat), Number(props.origin.lng)], props.origin.name || 'Start', 'Journey start', '#22c55e', 9)
  addPoint([Number(props.destination.lat), Number(props.destination.lng)], props.destination.name || 'Destination', 'Journey end', '#ef4444', 9)
  fitRoute()
}
function fitRoute() {
  if (map && currentBounds?.isValid()) map.fitBounds(currentBounds, { padding: [28, 28], maxZoom: 14, animate: false })
}
onMounted(async () => {
  await nextTick()
  map = L.map(mapElement.value, { zoomControl: false, scrollWheelZoom: false })
  L.control.zoom({ position: 'topright' }).addTo(map)
  L.tileLayer('https://api.dani-dev.co.za/v2/transport/rapidkl/no-auth/tile/{z}/{x}/{y}.png', {
    minZoom: 9, maxZoom: 18,
    attribution: 'Map tiles via <a href="https://github.com/danyooooo/malaysian-api" target="_blank" rel="noopener noreferrer">malaysian-api</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
  }).on('tileerror', () => { tileFailed.value = true }).addTo(map)
  routeLayer = L.layerGroup().addTo(map)
  markerLayer = L.layerGroup().addTo(map)
  draw()
  requestAnimationFrame(() => map?.invalidateSize())
})
watch(() => [props.routes, props.selectedIndex, props.origin, props.destination], draw, { deep: true })
onBeforeUnmount(() => { map?.remove(); map = null })
</script>

<template>
  <div class="journey-map-panel">
    <div class="map-heading"><div class="panel-heading"><span class="section-kicker">Journey map</span><h4>See every route option</h4><p>Choose an option to highlight its path and stops.</p></div><div class="map-actions"><label class="journey-map-picker">Route option<select :value="selectedIndex" @change="emit('select-route', Number($event.target.value))"><option v-for="(_, index) in routes" :key="index" :value="index">Option {{ index + 1 }}</option></select></label><button class="secondary-button" type="button" @click="fitRoute">Fit route</button></div></div>
    <div class="map-frame"><div ref="mapElement" class="transit-map" role="img" :aria-label="`Map of journey option ${selectedIndex + 1} of ${routes.length}`"></div><div class="map-overlays"><span><i class="legend-other"></i> Other options</span><span><i class="legend-route"></i> Selected route</span><span><i class="legend-stop"></i> Stops</span><span><i class="legend-start"></i> Start</span><span><i class="legend-end"></i> End</span></div></div>
    <p class="map-meta">Walking sections are dashed. Markers show start, destination and stops reported by the journey API. Vehicle positions are not included.<span v-if="tileFailed">Some map tiles could not load.</span></p>
  </div>
</template>
