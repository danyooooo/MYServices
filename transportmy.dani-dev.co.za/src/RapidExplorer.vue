<script setup>
import { computed, ref } from 'vue'
import { dataOf, errorText, get } from './api'
import JourneyMap from './JourneyMap.vue'

const originQuery = ref('')
const destinationQuery = ref('')
const originResults = ref([])
const destinationResults = ref([])
const origin = ref(null)
const destination = ref(null)
const routes = ref(null)
const selectedRouteIndex = ref(0)
const busRoutes = ref(null)
const busSearch = ref('')
const busy = ref({})
const errors = ref({})
const shownBusRoutes = computed(() => (busRoutes.value || []).filter(route => `${route.name} ${route.category}`.toLowerCase().includes(busSearch.value.toLowerCase())).slice(0, 80))
const mins = seconds => Number.isFinite(Number(seconds)) ? `${Math.round(Number(seconds) / 60)} min` : '—'
const km = metres => Number.isFinite(Number(metres)) ? `${(Number(metres) / 1000).toFixed(1)} km` : '—'
const time = value => value ? String(value).slice(11, 16) : '—'
const fare = value => value === undefined || value === null ? '—' : `RM ${Number(value).toFixed(2)}`
const point = item => ({ name: item.poiname, lat: item.geometry.coordinates[1], lng: item.geometry.coordinates[0] })

async function lookup(kind) {
  const query = kind === 'from' ? originQuery.value : destinationQuery.value
  if (query.trim().length < 2) return
  busy.value[kind] = true
  errors.value[kind] = ''
  if (kind === 'from') { origin.value = null; originResults.value = [] } else { destination.value = null; destinationResults.value = [] }
  routes.value = null
  try {
    const data = dataOf(await get('/rapidkl/no-auth/geocode', { input: query.trim() }))
    const results = (data.results || []).filter(item => item.geometry?.coordinates?.length === 2).slice(0, 8)
    if (kind === 'from') originResults.value = results
    else destinationResults.value = results
  } catch (error) { errors.value[kind] = errorText(error) } finally { busy.value[kind] = false }
}
function choose(kind, item) {
  if (kind === 'from') { origin.value = point(item); originQuery.value = item.poiname; originResults.value = [] }
  else { destination.value = point(item); destinationQuery.value = item.poiname; destinationResults.value = [] }
  routes.value = null
}
async function plan() {
  if (!origin.value || !destination.value) return
  busy.value.plan = true
  errors.value.plan = ''
  routes.value = null
  selectedRouteIndex.value = 0
  try {
    const data = dataOf(await get('/rapidkl/no-auth/journey', { flat: origin.value.lat, flng: origin.value.lng, tlat: destination.value.lat, tlng: destination.value.lng }))
    routes.value = data.routes || []
  } catch (error) { errors.value.plan = errorText(error) } finally { busy.value.plan = false }
}
async function loadBuses() {
  busy.value.buses = true
  errors.value.buses = ''
  try { busRoutes.value = dataOf(await get('/rapidkl/no-auth/bus-routes')) }
  catch (error) { errors.value.buses = errorText(error) }
  finally { busy.value.buses = false }
}
</script>

<template>
  <div class="liquid-card panel explorer-panel">
    <div class="panel-heading"><span class="section-kicker">Journey planning</span><h3>Find a way across KL</h3><p>Search two places, choose a result for each, then compare routes.</p></div>
    <div class="journey-pickers">
      <div>
        <form @submit.prevent="lookup('from')"><label>Start<input v-model="originQuery" type="search" placeholder="Station or place, e.g. KLCC"></label><button class="secondary-button" :disabled="busy.from || originQuery.trim().length<2">{{ busy.from ? 'Searching…' : 'Find start' }}</button></form>
        <div v-if="errors.from" class="inline-error">{{ errors.from }}</div>
        <div v-if="originResults.length" class="lookup-results"><button v-for="item in originResults" :key="item.poi_id" @click="choose('from',item)">{{ item.poiname }} <small>{{ item.category }}</small></button></div>
        <div v-if="origin" class="picked-point">Selected: {{ origin.name }}</div>
      </div>
      <div>
        <form @submit.prevent="lookup('to')"><label>Destination<input v-model="destinationQuery" type="search" placeholder="Station or place, e.g. KL Sentral"></label><button class="secondary-button" :disabled="busy.to || destinationQuery.trim().length<2">{{ busy.to ? 'Searching…' : 'Find destination' }}</button></form>
        <div v-if="errors.to" class="inline-error">{{ errors.to }}</div>
        <div v-if="destinationResults.length" class="lookup-results"><button v-for="item in destinationResults" :key="item.poi_id" @click="choose('to',item)">{{ item.poiname }} <small>{{ item.category }}</small></button></div>
        <div v-if="destination" class="picked-point">Selected: {{ destination.name }}</div>
      </div>
    </div>
    <button class="primary-button plan-button" :disabled="!origin || !destination || busy.plan" @click="plan">{{ busy.plan ? 'Planning…' : 'Show journeys' }}</button>
    <div v-if="errors.plan" class="state-card error">{{ errors.plan }}</div>
    <template v-if="routes?.length">
      <JourneyMap :routes="routes" :selected-index="selectedRouteIndex" :origin="origin" :destination="destination" @select-route="selectedRouteIndex = $event" />
      <div class="journey-results">
        <article v-for="(route,index) in routes" :key="index" class="journey-card" :class="{selected: selectedRouteIndex === index}">
          <button class="journey-option" type="button" :aria-pressed="selectedRouteIndex === index" @click="selectedRouteIndex = index"><span>Option {{ index + 1 }}</span><small>{{ mins(route.total_duration) }} · {{ km(route.total_distance) }} · Adult {{ fare(route.alt_fare_price?.adult) }}</small></button>
          <div class="journey-times">{{ time(route.estimated_departure_time) }} → {{ time(route.estimated_arrival_time) }} MYT</div>
          <ol><li v-for="(leg,step) in route.legs" :key="step"><span class="journey-step-mark">{{ leg.type === 'pedestrain' || leg.type === 'pedestrian' ? 'W' : 'T' }}</span><div><strong>{{ leg.type === 'pedestrain' || leg.type === 'pedestrian' ? 'Walk / transfer' : leg.route_details?.route_long_name || leg.route_details?.route_short_name || 'Transit' }}</strong><small>{{ leg.route_details?.route_short_name ? `${leg.route_details.route_short_name} · ` : '' }}{{ km(leg.distance) }}<template v-if="leg.steps?.length"> · {{ leg.steps[0].stop_name }} → {{ leg.steps.at(-1).stop_name }}</template></small></div></li></ol>
        </article>
      </div>
    </template>
    <div v-else-if="routes" class="state-card">No journey options were returned for those places.</div>
    <div v-else-if="busy.plan" class="state-card">Finding routes…</div>
  </div>
  <div class="liquid-card panel explorer-panel">
    <div class="panel-heading"><span class="section-kicker">Bus network</span><h3>Rapid KL route directory</h3><p>Search the public bus-route catalogue by number or category.</p></div>
    <p class="bus-service-note" role="note">Route details and live vehicle positions are currently unavailable while the provider’s server is offline. The route catalogue below may still load.</p>
    <button v-if="!busRoutes && !busy.buses" class="secondary-button" @click="loadBuses">Load bus routes</button>
    <div v-if="busy.buses" class="state-card">Loading bus routes…</div>
    <div v-if="errors.buses" class="state-card error">{{ errors.buses }} <button @click="loadBuses">Retry</button></div>
    <template v-if="busRoutes"><label>Search routes<input v-model="busSearch" type="search" placeholder="Bus number or category"></label><div class="bus-route-grid"><div v-for="route in shownBusRoutes" :key="route.id" class="road-mini-card"><span>{{ route.category }}</span><strong>Route {{ route.name }}</strong><small>ID {{ route.id }}</small></div></div><div v-if="!shownBusRoutes.length" class="empty-inline">No routes match this search.</div><p v-if="shownBusRoutes.length===80" class="panel-footnote">Showing the first 80 matching routes. Refine your search to see more.</p></template>
  </div>
</template>
