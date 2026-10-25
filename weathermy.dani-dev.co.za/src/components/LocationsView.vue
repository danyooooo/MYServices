<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { api } from '../lib/api'
import { belongsTo, isLandLocation, placeContext, placeType } from '../lib/weather'
import Icon from './Icon.vue'

const props = defineProps({ catalog: Array, lookup: Map, catalogLoading: Boolean, catalogError: String })
const emit = defineEmits(['select', 'warnings', 'retry-catalog'])
const mode = ref('land')
const selectedState = ref('')
const selectedDistrict = ref('')
const query = ref('')
const kind = ref('districts')
const page = ref(0)
const lists = reactive({ states: [], districts: [], marine: [], coastal: [] })
const loading = ref(false)
const listErrors = ref([])
const tree = ref(null)
const treeLoading = ref(false)
const treeError = ref('')
const pageSize = 24
let listsController
let treeController

async function loadLists() {
  listsController?.abort()
  const controller = new AbortController()
  listsController = controller
  loading.value = true
  listErrors.value = []
  const keys = ['states', 'districts', 'marine', 'coastal']
  const results = await Promise.allSettled(keys.map(key => api[key](controller.signal)))
  if (controller.signal.aborted) return
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) lists[keys[index]] = result.value.filter(place => place.active !== false)
    else listErrors.value.push(keys[index])
  })
  loading.value = false
}

async function loadState(id) {
  treeController?.abort()
  tree.value = null
  treeError.value = ''
  treeLoading.value = false
  if (!id) return
  const controller = new AbortController()
  treeController = controller
  treeLoading.value = true
  try {
    const data = await api.stateDetails(id, controller.signal)
    if (controller.signal.aborted) return
    if (!Array.isArray(data?.features)) throw new Error('State details unavailable')
    tree.value = data
  } catch (error) {
    if (!controller.signal.aborted) treeError.value = 'State details are unavailable. You can still browse the location list.'
  } finally {
    if (treeController === controller) treeLoading.value = false
  }
}

const states = computed(() => [...lists.states].sort((a, b) => a.name.localeCompare(b.name)))
const districts = computed(() => {
  const items = tree.value?.features?.map(feature => feature.properties).filter(place => place?.type?.includes('districts')) || lists.districts
  return items.filter(place => !selectedState.value || belongsTo(place, selectedState.value, props.lookup)).sort((a, b) => a.name.localeCompare(b.name))
})
const filtered = computed(() => {
  let items = mode.value === 'coastal' ? lists.coastal : mode.value === 'marine' ? lists.marine : props.catalog.filter(isLandLocation)
  if (mode.value === 'land') {
    if (selectedState.value) items = items.filter(place => belongsTo(place, selectedState.value, props.lookup))
    if (selectedDistrict.value) items = items.filter(place => belongsTo(place, selectedDistrict.value, props.lookup))
    if (kind.value !== 'all') items = items.filter(place => place.type?.includes(kind.value))
  }
  const needle = query.value.trim().toLocaleLowerCase()
  return items.filter(place => place.name?.toLocaleLowerCase().includes(needle)).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
})
const paged = computed(() => filtered.value.slice(page.value * pageSize, (page.value + 1) * pageSize))
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
watch(selectedState, id => { selectedDistrict.value = ''; loadState(id) })
watch([mode, selectedState, selectedDistrict, query, kind], () => { page.value = 0 })
watch(filtered, () => { if (page.value >= pages.value) page.value = 0 })
onMounted(loadLists)
onUnmounted(() => { listsController?.abort(); treeController?.abort() })
</script>

<template>
  <section aria-labelledby="locations-title">
    <div class="view-heading"><div><span class="eyebrow">Across the country</span><h2 id="locations-title">Find your location</h2><p>Explore towns, districts, coastal waters and shipping areas.</p></div><Icon name="map" class="view-icon" /></div>
    <div class="filter-row"><div class="segmented-control" aria-label="Location category"><button v-for="item in [{ id: 'land', label: 'Inland' }, { id: 'coastal', label: 'Coastal' }, { id: 'marine', label: 'Shipping' }]" :key="item.id" :aria-pressed="mode === item.id" :class="{ active: mode === item.id }" @click="mode = item.id">{{ item.label }}</button></div><span class="subtle">{{ filtered.length.toLocaleString() }} locations</span></div>
    <div class="liquid-card location-filters"><div class="filter-search"><Icon name="search" /><label class="sr-only" for="browse-search">Filter locations by name</label><input id="browse-search" v-model="query" placeholder="Filter by name…" /></div><template v-if="mode === 'land'"><label><span>State</span><select v-model="selectedState" aria-label="State" :disabled="loading"><option value="">All states</option><option v-for="state in states" :key="state.id" :value="state.id">{{ state.name }}</option></select></label><label><span>District</span><select v-model="selectedDistrict" aria-label="District" :disabled="treeLoading || loading"><option value="">All districts</option><option v-for="district in districts" :key="district.id" :value="district.id">{{ district.name }}</option></select></label><label><span>Area type</span><select v-model="kind" aria-label="Area type"><option value="all">All areas</option><option value="districts">Districts</option><option value="towns">Towns</option><option value="mukim">Mukim</option><option value="tourist">Destinations</option></select></label></template></div>
    <p v-if="treeLoading" class="inline-status" role="status">Loading state details…</p><p v-else-if="treeError" class="inline-status">{{ treeError }}</p>
    <div v-if="listErrors.length" class="inline-error" role="alert"><p>Some location lists couldn’t be loaded: {{ listErrors.join(', ') }}.</p><button class="text-button" @click="loadLists">Try again</button></div>
    <div v-if="mode === 'land' && catalogError" class="liquid-card error-panel" role="alert"><p>{{ catalogError }}</p><button class="liquid-btn liquid-btn-glass" @click="emit('retry-catalog')">Try again</button></div>
    <p v-else-if="loading || (mode === 'land' && catalogLoading)" class="liquid-card loading-panel" role="status">Loading locations…</p>
    <div v-else-if="paged.length" class="locations-grid"><article v-for="place in paged" :key="place.id" class="liquid-card location-card"><span class="section-label"><Icon :name="mode === 'land' ? 'pin' : 'wave'" />{{ placeType(place) }}</span><h3>{{ place.name }}</h3><p>{{ mode === 'land' ? placeContext(place, lookup) : mode === 'coastal' ? 'Malaysian coastal waters' : 'Shipping waters' }}</p><button class="text-button" @click="mode === 'land' ? emit('select', place) : emit('warnings')">{{ mode === 'land' ? 'View forecast' : 'National warnings' }}<Icon name="chevron" /></button></article></div>
    <div v-else class="liquid-card empty-panel"><Icon name="search" /><h3>No matching locations</h3><p>Try a different name or choose another state.</p></div>
    <div v-if="filtered.length > pageSize" class="pagination"><button class="liquid-btn liquid-btn-glass" :disabled="page === 0" @click="page--">Previous</button><span>Page {{ page + 1 }} of {{ pages }}</span><button class="liquid-btn liquid-btn-glass" :disabled="page >= pages - 1" @click="page++">Next</button></div>
  </section>
</template>
