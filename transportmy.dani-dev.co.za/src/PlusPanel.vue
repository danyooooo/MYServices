<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { dataOf, errorText, get } from './api'

const mode = ref('tolls')
const tolls = ref([])
const cameras = ref([])
const busy = ref({})
const errors = ref({})
const tollSearch = ref('')
const concession = ref('')
const region = ref('')
const selectedToll = ref(null)
const cameraSearch = ref('')
const highway = ref('')
const bound = ref('')
const selectedCamera = ref(null)
const cameraError = ref(false)
const highways = computed(() => [...new Set(cameras.value.map(camera => camera.highway).filter(Boolean))].sort())
const concessions = computed(() => [...new Set(tolls.value.map(toll => toll.Concession).filter(Boolean))].sort())
const regions = computed(() => [...new Set(tolls.value.map(toll => toll.Region).filter(Boolean))].sort())
const shownTolls = computed(() => tolls.value.filter(toll =>
  (!concession.value || toll.Concession === concession.value) &&
  (!region.value || toll.Region === region.value) &&
  `${toll.PlazaName} ${toll.PlazaNameAbbr} ${toll.Code}`.toLowerCase().includes(tollSearch.value.toLowerCase())
))
const shownCameras = computed(() => cameras.value.filter(camera =>
  (!highway.value || camera.highway === highway.value) &&
  (!bound.value || camera.bound === bound.value) &&
  `${camera.name} ${camera.section} ${camera.km}`.toLowerCase().includes(cameraSearch.value.toLowerCase())
))
const bounds = { NB: 'Northbound', SB: 'Southbound', WB: 'Westbound', EB: 'Eastbound', MD: 'Median' }
const mapUrl = item => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.Latitude},${item.Longitude}`)}`
const cameraUrl = camera => {
  const fallback = `/v2/transport/plus/cctv/live/${encodeURIComponent(camera.id)}/gif?raw=true`
  const url = new URL(camera.media?.stream_raw || fallback, 'https://api.dani-dev.co.za')
  return url.origin === 'https://api.dani-dev.co.za' ? url.href : new URL(fallback, 'https://api.dani-dev.co.za').href
}
watch(selectedCamera, () => { cameraError.value = false })

async function load(kind) {
  busy.value[kind] = true
  errors.value[kind] = ''
  try {
    if (kind === 'tolls') {
      tolls.value = dataOf(await get('/plus/tolls'))
      selectedToll.value = tolls.value[0] || null
    } else {
      cameras.value = dataOf(await get('/plus/cctv'))
      selectedCamera.value = cameras.value[0] || null
    }
  } catch (error) { errors.value[kind] = errorText(error) } finally { busy.value[kind] = false }
}
function switchMode(next) {
  mode.value = next
  if (next === 'cameras' && !cameras.value.length) load('cameras')
}
onMounted(() => load('tolls'))
</script>

<template>
  <div class="subnav" role="tablist" aria-label="PLUS features"><button :class="{active:mode==='tolls'}" role="tab" :aria-selected="mode==='tolls'" @click="switchMode('tolls')">Toll plazas</button><button :class="{active:mode==='cameras'}" role="tab" :aria-selected="mode==='cameras'" @click="switchMode('cameras')">Traffic cameras</button></div>
  <template v-if="mode==='tolls'">
    <div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">Expressway directory</span><h3>Find a toll plaza</h3><p>Search the PLUS, Penang Bridge and BKE plaza directory.</p></div><div class="filter-grid"><label>Search<input v-model="tollSearch" type="search" placeholder="Plaza name or code"></label><label>Concession<select v-model="concession"><option value="">All concessions</option><option v-for="item in concessions" :key="item" :value="item">{{ item }}</option></select></label><label>Region<select v-model="region"><option value="">All regions</option><option v-for="item in regions" :key="item" :value="item">{{ item }}</option></select></label></div></div>
    <div v-if="busy.tolls" class="state-card">Loading toll plazas…</div><div v-else-if="errors.tolls" class="state-card error">{{ errors.tolls }} <button @click="load('tolls')">Retry</button></div><div v-else class="workspace-grid road-grid"><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">{{ shownTolls.length }} plazas</span><h3>Plaza list</h3></div><div class="station-list road-list"><button v-for="toll in shownTolls" :key="toll.Code" class="station-row" :class="{selected:selectedToll?.Code===toll.Code}" @click="selectedToll=toll"><span class="station-icon"></span><span>{{ toll.PlazaName }}</span><small>{{ toll.Code }}</small></button><div v-if="!shownTolls.length" class="empty-inline">No plazas match these filters.</div></div></div><div class="liquid-card panel"><template v-if="selectedToll"><div class="panel-heading"><span class="section-kicker">{{ selectedToll.Concession }} · {{ selectedToll.Section }}</span><h3>{{ selectedToll.PlazaName }}</h3><p>{{ selectedToll.Region }}</p></div><div class="fact-list"><div><span>Plaza code</span><strong>{{ selectedToll.Code }}</strong></div><div><span>Type</span><strong>{{ selectedToll.PlazaType==='B'?'Barrier':'Interchange' }}</strong></div><div><span>Toll system</span><strong>{{ selectedToll.TollSystem==='O'?'Open':'Closed' }}</strong></div><div><span>Plaza size</span><strong>{{ selectedToll.PlazaSize || '—' }}</strong></div></div><a v-if="selectedToll.Latitude && selectedToll.Longitude" class="secondary-button action-link" :href="mapUrl(selectedToll)" target="_blank" rel="noopener noreferrer">Open in Maps ↗</a></template><div v-else class="state-card">Select a toll plaza for details.</div></div></div>
  </template>
  <template v-else>
    <div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">Traffic view</span><h3>PLUS cameras</h3><p>Choose a camera to watch its continuously refreshed live footage here.</p></div><div class="filter-grid"><label>Search<input v-model="cameraSearch" type="search" placeholder="Location or kilometre"></label><label>Highway<select v-model="highway"><option value="">All highways</option><option v-for="item in highways" :key="item" :value="item">{{ item }}</option></select></label><label>Direction<select v-model="bound"><option value="">All directions</option><option v-for="(label,code) in bounds" :key="code" :value="code">{{ label }}</option></select></label></div></div>
    <div v-if="busy.cameras" class="state-card">Loading cameras…</div><div v-else-if="errors.cameras" class="state-card error">{{ errors.cameras }} <button @click="load('cameras')">Retry</button></div><div v-else class="workspace-grid road-grid"><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">{{ shownCameras.length }} cameras</span><h3>Camera list</h3></div><div class="station-list road-list"><button v-for="camera in shownCameras" :key="camera.id" class="station-row" :class="{selected:selectedCamera?.id===camera.id}" @click="selectedCamera=camera"><span class="camera-icon">◉</span><span>{{ camera.name }}</span><small>{{ camera.highway }}</small></button><div v-if="!shownCameras.length" class="empty-inline">No cameras match these filters.</div></div></div><div class="liquid-card panel"><template v-if="selectedCamera"><div class="panel-heading"><span class="section-kicker">{{ selectedCamera.highway }} · {{ bounds[selectedCamera.bound] || selectedCamera.bound }}</span><h3>{{ selectedCamera.name }}</h3><p>Section {{ selectedCamera.section }} · KM {{ selectedCamera.km }}</p></div><div class="fact-list"><div><span>Camera status</span><strong>{{ selectedCamera.is_active ? 'Active' : 'Unavailable' }}</strong></div><div><span>Direction</span><strong>{{ bounds[selectedCamera.bound] || selectedCamera.bound }}</strong></div><div><span>Highway</span><strong>{{ selectedCamera.highway }}</strong></div></div><div v-if="selectedCamera.is_active && !cameraError" class="camera-feed-frame"><img :key="selectedCamera.id" class="camera-feed" :src="cameraUrl(selectedCamera)" :alt="`Live footage from ${selectedCamera.name}`" @error="cameraError=true"></div><div v-else class="state-card">{{ cameraError ? 'This camera feed is unavailable right now. Select another camera to keep watching.' : 'This camera is currently inactive.' }}</div><p class="panel-footnote">The image updates continuously from the API.</p></template><div v-else class="state-card">Select a camera for details.</div></div></div>
  </template>
</template>
