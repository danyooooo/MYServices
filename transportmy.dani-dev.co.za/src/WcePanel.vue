<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { errorText, get } from './api'

const interchanges = ref([])
const classes = ref([])
const loading = ref(false)
const error = ref('')
const entry = ref('')
const exit = ref('')
const vehicleClass = ref('1')
const result = ref(null)
const calculating = ref(false)
const calculateError = ref('')
const stateFilter = ref('')
const browse = ref([])
const browseLoading = ref(false)
const browseError = ref('')
const currentEntry = computed(() => interchanges.value.find(item => item.name === entry.value))
const validExits = computed(() => (currentEntry.value?.connected_exits || []).filter(name => interchanges.value.some(item => item.name === name)))
const shownInterchanges = computed(() => interchanges.value.filter(item => !stateFilter.value || item.state === stateFilter.value))
const selectedClass = computed(() => classes.value.find(item => String(item.class) === vehicleClass.value))
const money = value => value === undefined || value === null ? '—' : `RM ${Number(value).toFixed(2)}`

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [stops, vehicles] = await Promise.all([get('/wce/interchanges'), get('/wce/vehicle-classes')])
    interchanges.value = stops.interchanges || []
    classes.value = vehicles.classes || []
    entry.value = interchanges.value.find(item => item.name === 'Banting')?.name || interchanges.value[0]?.name || ''
    exit.value = validExits.value[0] || ''
  } catch (issue) { error.value = errorText(issue) } finally { loading.value = false }
}
watch(entry, () => { exit.value = validExits.value[0] || ''; result.value = null })
watch([exit, vehicleClass], () => { result.value = null })
async function calculate() {
  if (!entry.value || !exit.value || entry.value === exit.value) return
  calculating.value = true
  calculateError.value = ''
  result.value = null
  try { result.value = await get('/wce/toll-rates', { entry: entry.value, exit: exit.value, class: vehicleClass.value }) }
  catch (issue) { calculateError.value = errorText(issue) }
  finally { calculating.value = false }
}
async function browseRates() {
  browseLoading.value = true
  browseError.value = ''
  try { browse.value = (await get('/wce/toll-rates', { state: stateFilter.value || undefined })).routes || [] }
  catch (issue) { browseError.value = errorText(issue) }
  finally { browseLoading.value = false }
}
onMounted(load)
</script>

<template>
  <div v-if="loading" class="state-card">Loading WCE interchanges…</div><div v-else-if="error" class="state-card error">{{ error }} <button @click="load">Retry</button></div>
  <template v-else>
    <div class="workspace-grid road-grid"><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">WCE · E32</span><h3>Toll calculator</h3><p>Choose a connected pair of interchanges and your vehicle class.</p></div><form class="road-form" @submit.prevent="calculate"><label>Entry<select v-model="entry"><option v-for="item in interchanges" :key="item.name" :value="item.name">{{ item.name }} · {{ item.state }}</option></select></label><label>Exit<select v-model="exit" :disabled="!validExits.length"><option v-for="name in validExits" :key="name" :value="name">{{ name }}</option></select></label><label>Vehicle class<select v-model="vehicleClass"><option v-for="item in classes" :key="item.class" :value="String(item.class)">{{ item.label }} · {{ item.type }}</option></select></label><button class="primary-button" :disabled="calculating || !exit">{{ calculating ? 'Calculating…' : 'Calculate toll' }}</button></form><p v-if="selectedClass" class="panel-footnote">{{ selectedClass.description }}</p><div v-if="calculateError" class="state-card error">{{ calculateError }}</div></div>
      <div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">Fare result</span><h3>{{ result ? `${result.entry} → ${result.exit}` : 'Your toll' }}</h3><p>Rates in Malaysian ringgit.</p></div><template v-if="result"><div class="rate-hero"><span>{{ selectedClass?.label }} · {{ selectedClass?.type }}</span><strong>{{ money(result.rate_myr) }}</strong></div><div class="fact-list"><div v-for="item in classes" :key="item.class"><span>{{ item.label }} · {{ item.type }}</span><strong>{{ money(result.rates?.[item.class]) }}</strong></div></div></template><div v-else class="state-card">Select your route and calculate the toll.</div></div></div>
    <div class="liquid-card panel road-directory"><div class="panel-heading"><span class="section-kicker">Interchange directory</span><h3>Explore the WCE</h3><p>Browse interchanges and their connected exits.</p></div><div class="directory-controls"><label>State<select v-model="stateFilter"><option value="">All states</option><option value="Selangor">Selangor</option><option value="Perak">Perak</option></select></label><button class="secondary-button" :disabled="browseLoading" @click="browseRates">{{ browseLoading ? 'Loading…' : 'Browse published rates' }}</button></div><div class="road-card-grid"><div v-for="item in shownInterchanges" :key="item.route_code" class="road-mini-card"><span>{{ item.state }} · {{ item.section }}</span><strong>{{ item.name }}</strong><small>{{ item.connected_exits?.length || 0 }} connected exits</small></div></div><div v-if="browseError" class="state-card error">{{ browseError }}</div><div v-if="browse.length" class="rate-table"><div v-for="(route,index) in browse" :key="index"><span>{{ route.entry }} → {{ route.exit }}</span><strong>{{ money(route.rates?.[vehicleClass]) }}</strong></div></div></div>
  </template>
</template>
