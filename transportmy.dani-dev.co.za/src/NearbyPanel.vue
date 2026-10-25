<script setup>
import { ref, watch } from 'vue'
import { dataOf, errorText, get } from './api'

const props = defineProps({ provider: { type: String, required: true }, location: { type: Object, default: null }, label: { type: String, default: '' } })
const emit = defineEmits(['select-route'])
const lat = ref('')
const lng = ref('')
const radius = ref('1')
const result = ref(null)
const loading = ref(false)
const error = ref('')
watch(() => [props.location?.lat, props.location?.lng], ([nextLat, nextLng]) => {
  lat.value = nextLat ?? ''
  lng.value = nextLng ?? ''
  result.value = null
}, { immediate: true })
async function search() {
  if (!Number.isFinite(Number(lat.value)) || !Number.isFinite(Number(lng.value)) || lat.value === '' || lng.value === '') return
  loading.value = true
  error.value = ''
  result.value = null
  try { result.value = dataOf(await get(`/${props.provider}/nearby`, { lat: lat.value, lng: lng.value, radius: radius.value })) }
  catch (issue) { error.value = errorText(issue) }
  finally { loading.value = false }
}
</script>

<template>
  <div class="liquid-card panel nearby-panel"><div class="panel-heading"><span class="section-kicker">Around you</span><h3>Stops and routes nearby</h3><p>Search around {{ label || 'a selected stop' }} or enter your own coordinates.</p></div><form class="nearby-form" @submit.prevent="search"><label>Latitude<input v-model="lat" type="number" step="any" min="-90" max="90" placeholder="3.158944"></label><label>Longitude<input v-model="lng" type="number" step="any" min="-180" max="180" placeholder="101.712277"></label><label>Radius<select v-model="radius"><option value="0.5">0.5 km</option><option value="1">1 km</option><option value="2">2 km</option><option value="5">5 km</option></select></label><button class="secondary-button" :disabled="loading || !lat || !lng">{{ loading ? 'Searching…' : 'Find nearby' }}</button></form><div v-if="error" class="state-card error">{{ error }} <button @click="search">Retry</button></div><div v-if="result" class="nearby-results"><div><h4>Routes <span>{{ result.routes?.length || 0 }}</span></h4><div v-if="result.routes?.length" class="nearby-route-list"><button v-for="route in result.routes" :key="route.code" @click="emit('select-route',route.code)"><strong>{{ route.name }}</strong><small>{{ route.desc }}</small><span aria-hidden="true">↗</span></button></div><div v-else class="empty-inline">No routes found nearby.</div></div><div><h4>Stops <span>{{ result.busStops?.length || 0 }}</span></h4><div v-if="result.busStops?.length" class="nearby-stop-list"><div v-for="stop in result.busStops.slice(0,30)" :key="stop.number"><span class="station-icon"></span><strong>{{ stop.name }}</strong><small>{{ stop.number }}</small></div></div><div v-else class="empty-inline">No stops found nearby.</div></div></div></div>
</template>
