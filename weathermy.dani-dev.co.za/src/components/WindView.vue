<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { api } from '../lib/api'
import { formatDate, formatTime, number } from '../lib/weather'

const metadata = ref([])
const model = ref('')
const cycle = ref('')
const elevation = ref('all')
const validTime = ref('')
const run = ref([])
const loading = ref(false)
const runLoading = ref(false)
const error = ref('')
const runError = ref('')
const modelInfo = computed(() => metadata.value.find(item => item.model === model.value))
const cycles = computed(() => [...(modelInfo.value?.cycles || [])].sort((a, b) => Date.parse(b) - Date.parse(a)))
const elevations = computed(() => [...(modelInfo.value?.elevations || [])].sort((a, b) => a === '10m' ? -1 : b === '10m' ? 1 : a.localeCompare(b, undefined, { numeric: true })))
const validTimes = computed(() => [...new Set(run.value.map(item => item.timestamp).filter(Boolean))].sort((a, b) => Date.parse(a) - Date.parse(b)))
const rows = computed(() => run.value.filter(item => (elevation.value === 'all' || item.elevation === elevation.value) && item.timestamp === validTime.value))
let metadataController
let runController

async function loadMetadata() {
  metadataController?.abort()
  const controller = new AbortController()
  metadataController = controller
  loading.value = true
  error.value = ''
  try {
    const data = await api.windMetadata(controller.signal)
    if (controller.signal.aborted) return
    if (!Array.isArray(data)) throw new Error('Wind model metadata was not returned.')
    metadata.value = data
    if (!data.some(item => item.model === model.value)) model.value = data[0]?.model || ''
  } catch (cause) {
    if (!controller.signal.aborted) error.value = cause.message || 'Wind metadata could not be loaded.'
  } finally {
    if (metadataController === controller) loading.value = false
  }
}

async function loadRun() {
  runController?.abort()
  run.value = []
  runError.value = ''
  if (!model.value || !cycle.value) return
  const controller = new AbortController()
  runController = controller
  runLoading.value = true
  try {
    const data = await api.windRun(model.value, cycle.value, controller.signal)
    if (!controller.signal.aborted) {
      if (!Array.isArray(data)) throw new Error('The selected wind run has no metadata.')
      run.value = data.sort((a, b) => String(a.elevation).localeCompare(String(b.elevation), undefined, { numeric: true }))
    }
  } catch (cause) {
    if (!controller.signal.aborted) runError.value = cause.message || 'Wind run data could not be loaded.'
  } finally {
    if (runController === controller) runLoading.value = false
  }
}

watch(cycles, available => { if (!available.includes(cycle.value)) cycle.value = available[0] || '' })
watch(validTimes, available => { validTime.value = available[0] || '' })
watch([model, cycle], loadRun)
onMounted(loadMetadata)
onUnmounted(() => { metadataController?.abort(); runController?.abort() })
</script>

<template>
  <section aria-labelledby="wind-title">
    <div class="view-heading"><div><span class="eyebrow">Atmospheric models</span><h2 id="wind-title">Wind metadata</h2><p>Browse available model runs and their wind component ranges by elevation.</p></div><button class="liquid-btn liquid-btn-glass" :disabled="loading" @click="loadMetadata"><Icon name="refresh" :class="{ spinning: loading }" />Refresh</button></div>
    <div v-if="error" class="liquid-card error-panel" role="alert"><Icon name="wind" /><h3>Wind metadata unavailable</h3><p>{{ error }}</p><button class="liquid-btn liquid-btn-glass" @click="loadMetadata">Try again</button></div>
    <template v-else>
      <div class="liquid-card wind-controls"><label><span>Model</span><select v-model="model" :disabled="loading"><option v-for="item in metadata" :key="item.model" :value="item.model">{{ item.model }}</option></select></label><label><span>Cycle</span><select v-model="cycle" :disabled="loading || !cycles.length"><option v-for="item in cycles" :key="item" :value="item">{{ formatDate(item) }} · {{ formatTime(item) }} MYT</option></select></label><label><span>Valid time</span><select v-model="validTime" :disabled="runLoading || !validTimes.length"><option v-for="item in validTimes" :key="item" :value="item">{{ formatDate(item) }} · {{ formatTime(item) }} MYT</option></select></label><label><span>Elevation</span><select v-model="elevation" :disabled="loading"><option value="all">All elevations</option><option v-for="item in elevations" :key="item" :value="item">{{ item }}</option></select></label></div>
      <p v-if="loading" class="liquid-card loading-panel" role="status">Loading wind models…</p>
      <p v-else-if="runLoading" class="liquid-card loading-panel" role="status">Loading {{ model }} run…</p>
      <div v-else-if="runError" class="liquid-card error-panel" role="alert"><Icon name="wind" /><h3>Run unavailable</h3><p>{{ runError }}</p><button class="liquid-btn liquid-btn-glass" @click="loadRun">Try again</button></div>
      <div v-else-if="rows.length" class="liquid-card wind-table-card"><div class="section-heading"><h2>{{ model }} · {{ formatDate(validTime) }} {{ formatTime(validTime) }}</h2><span class="subtle">{{ rows.length }} elevation{{ rows.length === 1 ? '' : 's' }}</span></div><p class="subtle wind-explainer">U is the east–west component; V is the north–south component. Values are the minimum and maximum in the model grid, in m/s.</p><div class="wind-table-wrap"><table class="wind-table"><thead><tr><th scope="col">Elevation</th><th scope="col">U min</th><th scope="col">U max</th><th scope="col">V min</th><th scope="col">V max</th></tr></thead><tbody><tr v-for="item in rows" :key="item.id"><th scope="row">{{ item.elevation }}</th><td>{{ number(item.uMin, 1) }}</td><td>{{ number(item.uMax, 1) }}</td><td>{{ number(item.vMin, 1) }}</td><td>{{ number(item.vMax, 1) }}</td></tr></tbody></table></div></div>
      <div v-else-if="!loading" class="liquid-card empty-panel"><Icon name="wind" /><h3>No wind run available</h3><p>Choose another model or cycle.</p></div>
    </template>
  </section>
</template>
