<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { dataOf, errorText, get, todayMYT } from './api'

const mode = ref('trips')
const origins = ref([])
const destinations = ref([])
const origin = ref('TBS')
const destination = ref('')
const travelDate = ref(todayMYT())
const sort = ref('time')
const trips = ref(null)
const selectedTrip = ref(null)
const seats = ref(null)
const terminal = ref(null)
const boardKind = ref('departures')
const board = ref(null)
const boardSearch = ref('')
const busy = ref({})
const errors = ref({})
const boardItems = computed(() => {
  const source = board.value
  const items = Array.isArray(source) ? source : source?.items || source?.data || source?.arrivals || source?.departures || []
  return (Array.isArray(items) ? items : []).filter(item => JSON.stringify(item).toLowerCase().includes(boardSearch.value.toLowerCase()))
})
const money = value => value === undefined || value === null ? '—' : `RM ${Number(value).toFixed(2)}`
const valueOf = (item, keys) => keys.map(key => item[key]).find(value => value !== undefined && value !== null && value !== '') || '—'

async function load(key, task) {
  busy.value[key] = true
  errors.value[key] = ''
  try { await task() } catch (issue) { errors.value[key] = errorText(issue) } finally { busy.value[key] = false }
}
async function loadOrigins() {
  await load('origins', async () => {
    origins.value = dataOf(await get('/tbs/origins'))
    if (!origins.value.some(item => item.code === origin.value)) origin.value = origins.value[0]?.code || ''
    if (origin.value) loadDestinations()
  })
}
let destinationRequest = 0
async function loadDestinations() {
  if (!origin.value) return
  const request = ++destinationRequest
  destinations.value = []
  destination.value = ''
  trips.value = null
  selectedTrip.value = null
  seats.value = null
  await load('destinations', async () => {
    const response = dataOf(await get('/tbs/destinations', { origin: origin.value }))
    if (request === destinationRequest) {
      destinations.value = response
      destination.value = destinations.value.find(item => item.code === 'MEL')?.code || destinations.value[0]?.code || ''
    }
  })
}
async function searchTrips() {
  if (!origin.value || !destination.value || !travelDate.value) return
  trips.value = null
  selectedTrip.value = null
  seats.value = null
  await load('trips', async () => { trips.value = dataOf(await get('/tbs/trips', { from: origin.value, to: destination.value, date: travelDate.value, sort: sort.value })) })
}
async function loadSeats(trip) {
  selectedTrip.value = trip
  seats.value = null
  if (!trip.trip_key || !trip.trip_info_data) { errors.value.seats = 'This trip has no seat-layout reference.'; return }
  await load('seats', async () => { seats.value = await get('/tbs/seats', { trip_key: trip.trip_key, trip_info_data: trip.trip_info_data }) })
}
async function loadBoard() {
  board.value = null
  await load('board', async () => { board.value = dataOf(await get(`/tbs/${boardKind.value}`)) })
}
async function loadTerminal() {
  if (terminal.value) return
  await load('terminal', async () => { terminal.value = dataOf(await get('/tbs/terminal-info')) })
}
function changeMode(next) {
  mode.value = next
  if (next === 'boards' && !board.value && !busy.value.board) loadBoard()
  if (next === 'terminal') loadTerminal()
}
watch([destination, travelDate, sort], () => { trips.value = null; selectedTrip.value = null; seats.value = null })
onMounted(loadOrigins)
</script>

<template>
  <div class="subnav" role="tablist" aria-label="TBS features"><button :class="{active:mode==='trips'}" role="tab" :aria-selected="mode==='trips'" @click="changeMode('trips')">Find trips</button><button :class="{active:mode==='boards'}" role="tab" :aria-selected="mode==='boards'" @click="changeMode('boards')">Live boards</button><button :class="{active:mode==='terminal'}" role="tab" :aria-selected="mode==='terminal'" @click="changeMode('terminal')">Terminal guide</button></div>
  <template v-if="mode==='trips'">
    <div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">Intercity bus</span><h3>Find a trip</h3><p>Browse departures, fares and available seats. Booking opens on the official ticketing site.</p></div><div v-if="busy.origins" class="state-card">Loading terminals…</div><div v-else-if="errors.origins" class="state-card error">{{ errors.origins }} <button @click="loadOrigins">Retry</button></div><form v-else class="trip-form tbs-form" @submit.prevent="searchTrips"><label>From<select v-model="origin" @change="loadDestinations"><option v-for="item in origins" :key="item.code" :value="item.code">{{ item.name }} · {{ item.state }}</option></select></label><label>To<select v-model="destination" :disabled="busy.destinations || !destinations.length"><option v-for="item in destinations" :key="item.code" :value="item.code">{{ item.name }} · {{ item.state }}</option></select></label><label>Travel date<input v-model="travelDate" type="date" :min="todayMYT()"></label><label>Sort by<select v-model="sort"><option value="time">Departure time</option><option value="price">Fare</option><option value="seats">Available seats</option></select></label><button class="primary-button" :disabled="busy.trips || busy.destinations || !destination">{{ busy.trips ? 'Searching…' : 'Find buses' }}</button></form><p v-if="errors.destinations" class="inline-error">{{ errors.destinations }} <button class="text-button" @click="loadDestinations">Retry</button></p></div>
    <div class="workspace-grid road-grid tbs-results"><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">{{ trips?.length ?? 0 }} services</span><h3>Bus departures</h3><p>{{ travelDate }}</p></div><div v-if="busy.trips" class="state-card">Searching trips…</div><div v-else-if="errors.trips" class="state-card error">{{ errors.trips }} <button @click="searchTrips">Retry</button></div><div v-else-if="trips?.length" class="station-list trip-scroll"><button v-for="trip in trips" :key="trip.trip_id" class="bus-trip-row" :class="{selected:selectedTrip?.trip_id===trip.trip_id}" @click="loadSeats(trip)"><span class="bus-trip-time">{{ trip.departure_time }}</span><span class="bus-trip-main"><strong>{{ trip.operator }}</strong><small>{{ trip.coach_type }} · {{ trip.available_seats }} seats listed</small></span><strong class="bus-trip-fare">{{ money(trip.fare_myr) }}</strong></button></div><div v-else-if="trips" class="state-card">No trips were returned for this date and route.</div><div v-else class="state-card">Choose a destination and search for buses.</div></div>
      <div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">Seat availability</span><h3>{{ selectedTrip?.operator || 'Choose a departure' }}</h3><p>{{ selectedTrip ? `${selectedTrip.departure_time} · ${money(selectedTrip.fare_myr)}` : 'Select a trip to see its current seat layout.' }}</p></div><div v-if="busy.seats" class="state-card">Loading seat layout…</div><div v-else-if="errors.seats" class="state-card error">{{ errors.seats }} <button v-if="selectedTrip" @click="loadSeats(selectedTrip)">Retry</button></div><template v-else-if="seats"><div class="seat-summary"><span><strong>{{ seats.available_seats }}</strong> available</span><span>{{ seats.occupied_seats }} occupied</span></div><div class="seat-layout"><div v-for="row in seats.layout || []" :key="row.row" class="seat-row"><span class="seat-row-number">{{ row.type==='driver_row'?'':row.row-1 }}</span><span v-for="(slot,index) in row.slots" :key="index" class="seat-slot" :class="[slot.type,slot.status]">{{ slot.type==='seat' ? slot.seat_name || '×' : slot.type==='driver' ? 'Driver' : '' }}</span></div></div><p class="panel-footnote">Availability can change. Seats are shown for information only.</p></template><div v-else class="state-card">No trip selected yet.</div></div></div>
  </template>
  <template v-else-if="mode==='boards'"><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">Terminal activity</span><h3>Live bus boards</h3><p>Schedule and gate information is provided by TBS when its upstream service is available.</p></div><div class="board-toolbar"><div class="segmented"><button :class="{active:boardKind==='departures'}" @click="boardKind='departures';loadBoard()">Departures</button><button :class="{active:boardKind==='arrivals'}" @click="boardKind='arrivals';loadBoard()">Arrivals</button></div><label>Filter board<input v-model="boardSearch" type="search" placeholder="Destination, operator, plate"></label><button class="secondary-button" :disabled="busy.board" @click="loadBoard">Refresh</button></div><div v-if="busy.board" class="state-card">Loading live board…</div><div v-else-if="errors.board" class="state-card error">The TBS live board is currently unavailable: {{ errors.board }} <button @click="loadBoard">Retry</button></div><div v-else-if="boardItems.length" class="board-list"><div v-for="(item,index) in boardItems" :key="index" class="board-row"><strong>{{ valueOf(item,['destination','origin','destination_name','origin_name','route','operator']) }}</strong><span>{{ valueOf(item,['operator','operator_name','company','plate_number','plate']) }}</span><span>{{ valueOf(item,['departure_time','arrival_time','time','scheduled_time']) }}</span><small>{{ valueOf(item,['gate','status','remark','remarks']) }}</small></div></div><div v-else class="state-card">No board entries were returned.</div></div></template>
  <template v-else><div v-if="busy.terminal" class="state-card">Loading terminal guide…</div><div v-else-if="errors.terminal" class="state-card error">{{ errors.terminal }} <button @click="loadTerminal">Retry</button></div><div v-else-if="terminal" class="workspace-grid road-grid"><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">Bandar Tasik Selatan</span><h3>{{ terminal.name }}</h3><p>{{ terminal.address }}</p></div><div class="fact-list"><div><span>Hours</span><strong>{{ terminal.operating_hours }}</strong></div><div><span>Careline</span><strong>{{ terminal.contacts?.customer_careline }}</strong></div><div><span>Operator</span><strong>{{ terminal.operator }}</strong></div></div><div class="action-row"><a v-if="terminal.coordinates?.google_maps" class="secondary-button action-link" :href="terminal.coordinates.google_maps" target="_blank" rel="noopener noreferrer">Directions ↗</a><a v-if="terminal.contacts?.eticketing_portal" class="primary-button action-link" :href="terminal.contacts.eticketing_portal" target="_blank" rel="noopener noreferrer">Official ticketing ↗</a></div><h4>Terminal facilities</h4><ul class="facility-list"><li v-for="facility in terminal.terminal_facilities" :key="facility">{{ facility }}</li></ul></div><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">Connections</span><h3>Change to rail and bus</h3><p>Services connected to the terminal.</p></div><div class="connection-list"><div v-for="(connection,index) in terminal.interchange_transit" :key="index"><span>{{ connection.mode }}</span><strong>{{ connection.station_name || connection.line }}</strong><small>{{ connection.line }} · {{ connection.connection_type }}</small></div></div></div></div></template>
</template>
