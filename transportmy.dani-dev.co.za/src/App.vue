<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { clockMYT, dataOf, errorText, get, todayMYT } from './api'
import Timetable from './Timetable.vue'
import PlusPanel from './PlusPanel.vue'
import WcePanel from './WcePanel.vue'
import TbsPanel from './TbsPanel.vue'
import RapidExplorer from './RapidExplorer.vue'
import RapidNotices from './RapidNotices.vue'
import NearbyPanel from './NearbyPanel.vue'
import TransitMap from './TransitMap.vue'
import ServiceDirectory from './ServiceDirectory.vue'

const providers = [
  { id: 'rapidkl', name: 'Rapid KL', type: 'Rail · BRT', mark: 'R', summary: 'Stations, train arrivals, fares and service notices.' },
  { id: 'gokl', name: 'GoKL', type: 'City bus', mark: 'G', summary: 'City routes, stops, departure schedules and arrival estimates.' },
  { id: 'sits', name: 'SITS', type: 'Selangor bus', mark: 'S', summary: 'Council bus routes, stops, timetables and arrivals.' },
  { id: 'ktmb', name: 'KTMB', type: 'Rail timetable', mark: 'K', summary: 'Choose two stations and a date to find train services.' },
  { id: 'plus', name: 'PLUS', type: 'Expressways', mark: 'P', summary: 'Search toll plazas and check expressway traffic cameras.' },
  { id: 'wce', name: 'WCE', type: 'West Coast Expressway', mark: 'W', summary: 'Browse interchanges and calculate tolls by vehicle class.' },
  { id: 'tbs', name: 'TBS', type: 'Intercity bus', mark: 'B', summary: 'Find coach trips, seat availability and terminal information.' },
]
const active = ref('rapidkl')
const activeProvider = computed(() => providers.find(p => p.id === active.value))
const busy = ref({})
const errors = ref({})
const setBusy = (key, value) => { busy.value = { ...busy.value, [key]: value } }
const setError = (key, value) => { errors.value = { ...errors.value, [key]: value } }
async function run(key, task) {
  setBusy(key, true)
  setError(key, '')
  try { return await task() } catch (error) { setError(key, errorText(error)); return null } finally { setBusy(key, false) }
}

// Rapid KL
const rapidLines = ref([])
const rapidLine = ref('')
const rapidStation = ref('')
const rapidSearch = ref('')
const rapidEta = ref(null)
const rapidFareFrom = ref('')
const rapidFareTo = ref('')
const rapidFare = ref(null)
const mapPalette = ['#22c55e', '#a78bfa', '#fb7185', '#38bdf8', '#fb923c', '#facc15', '#2dd4bf', '#f472b6', '#818cf8', '#a3e635', '#f87171', '#67e8f9', '#c084fc', '#fdba74', '#94a3b8']
const goklNamedColors = { GREEN: '#22c55e', PURPLE: '#a78bfa', RED: '#fb7185', BLUE: '#38bdf8', ORANGE: '#fb923c', PINK: '#f472b6', YELLOW: '#facc15', TURQUOISE: '#2dd4bf', MAROON: '#be123c', CHOCOLATE: '#a16207', 'PARROT-GREEN': '#84cc16', GREY: '#94a3b8', CREAM: '#fde68a', MAGENTA: '#d946ef' }
function busMapPaths(detail) {
  const paths = [detail?.outboundRoutePoints || [], detail?.inboundRoutePoints || []]
  return paths.some(path => path.length > 1) ? paths : [(detail?.busStops || []).map(stop => stop.location).filter(Boolean)]
}
const rapidNetworkLines = computed(() => rapidLines.value.map(line => ({ id: line.route_id, name: line.route_long_name || line.route_short_name, color: line.route_color, paths: [line.stops], stops: line.stops, loaded: true })))
const selectedRapidLine = computed(() => rapidLines.value.find(line => line.route_id === rapidLine.value))
const rapidStops = computed(() => selectedRapidLine.value?.stops ?? [])
const filteredRapidStops = computed(() => rapidStops.value.filter(stop => stop.stop_name?.toLowerCase().includes(rapidSearch.value.toLowerCase())))
const allRapidStops = computed(() => {
  const seen = new Set()
  return rapidLines.value.flatMap(line => line.stops || []).filter(stop => {
    if (!stop.stop_id || seen.has(stop.stop_id)) return false
    seen.add(stop.stop_id)
    return true
  }).sort((a, b) => a.stop_name.localeCompare(b.stop_name))
})
const rapidStationName = computed(() => rapidStops.value.find(stop => stop.stop_id === rapidStation.value)?.stop_name || '')
async function loadRapid() {
  if (rapidLines.value.length) return
  await run('rapidBase', async () => {
    const response = await get('/rapidkl/no-auth/stations')
    rapidLines.value = dataOf(response).filter(line => Array.isArray(line.stops) && line.stops.length)
    rapidLine.value = rapidLines.value[0]?.route_id || ''
    rapidStation.value = rapidLines.value[0]?.stops?.[0]?.stop_id || ''
    rapidFareFrom.value = rapidStation.value
    rapidFareTo.value = rapidLines.value[0]?.stops?.at(-1)?.stop_id || ''
    if (rapidStation.value) loadRapidEta()
  })
}
let rapidEtaRequest = 0
async function loadRapidEta() {
  if (!rapidStation.value) return
  const request = ++rapidEtaRequest
  rapidEta.value = null
  await run('rapidEta', async () => {
    const response = await get('/rapidkl/no-auth/train-eta', { station_id: rapidStation.value })
    if (request === rapidEtaRequest) rapidEta.value = dataOf(response)
  })
}
function selectRapidStop(id) { rapidStation.value = id; loadRapidEta() }
function selectRapidMapStop(id, routeId) {
  if (rapidLine.value !== routeId) {
    rapidLine.value = routeId
    rapidStation.value = id
  } else selectRapidStop(id)
}
async function loadFare() {
  if (!rapidFareFrom.value || !rapidFareTo.value || rapidFareFrom.value === rapidFareTo.value) return
  rapidFare.value = null
  await run('rapidFare', async () => { rapidFare.value = dataOf(await get('/rapidkl/no-auth/fare', { from: rapidFareFrom.value, to: rapidFareTo.value })) })
}
watch(rapidLine, () => {
  if (!rapidStops.value.some(stop => stop.stop_id === rapidStation.value)) rapidStation.value = rapidStops.value[0]?.stop_id || ''
  rapidSearch.value = ''
  if (active.value === 'rapidkl') loadRapidEta()
})
watch([rapidFareFrom, rapidFareTo], () => { rapidFare.value = null })

// GoKL
const goklRoutes = ref([])
const goklRoute = ref('')
const goklDetail = ref(null)
const goklTimetable = ref(null)
const goklDay = ref('WD')
const goklStop = ref('')
const goklSearch = ref('')
const goklEta = ref(null)
const goklUpdatedAt = ref(null)
const goklNotices = ref([])
const goklNetworkDetails = ref({})
const goklNetworkLoading = ref(false)
const goklDetailRequests = new Map()
const selectedGoklRoute = computed(() => goklRoutes.value.find(route => route.code === goklRoute.value))
const goklStops = computed(() => goklDetail.value?.busStops || [])
const goklNetworkLines = computed(() => goklRoutes.value.map((route, index) => {
  const detail = goklNetworkDetails.value[route.code]
  const colorName = route.name?.match(/\(([^)]+)\)/)?.[1]?.toUpperCase()
  return { id: route.code, name: route.name || route.code, color: goklNamedColors[colorName] || mapPalette[index % mapPalette.length], paths: busMapPaths(detail), stops: detail?.busStops || [], loaded: !!detail }
}))
const selectedGoklStop = computed(() => goklStops.value.find(stop => String(stop.number) === String(goklStop.value)))
const filteredGoklStops = computed(() => goklStops.value.filter(stop => `${stop.name} ${stop.number}`.toLowerCase().includes(goklSearch.value.toLowerCase())))
async function loadGokl() {
  if (goklRoutes.value.length) return
  await run('goklBase', async () => {
    goklRoutes.value = dataOf(await get('/gokl/routes'))?.items || []
    goklRoute.value = goklRoutes.value[0]?.code || ''
    if (goklRoute.value) { loadGoklRoute(); loadGoklNetwork() }
  })
  run('goklNotices', async () => {
    const response = dataOf(await get('/gokl/announcements'))
    goklNotices.value = Array.isArray(response) ? response : response?.items || []
  })
}
let goklRouteRequest = 0
function fetchGoklDetail(route) {
  if (goklNetworkDetails.value[route]) return Promise.resolve(goklNetworkDetails.value[route])
  if (!goklDetailRequests.has(route)) {
    const request = get('/gokl/route-detail', { route }).then(dataOf).then(detail => {
      goklNetworkDetails.value = { ...goklNetworkDetails.value, [route]: detail }
      return detail
    }).finally(() => goklDetailRequests.delete(route))
    goklDetailRequests.set(route, request)
  }
  return goklDetailRequests.get(route)
}
async function loadGoklNetwork() {
  if (!goklRoutes.value.length || goklNetworkLoading.value) return
  goklNetworkLoading.value = true
  const routes = goklRoutes.value.filter(route => !goklNetworkDetails.value[route.code])
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(4, routes.length) }, async () => {
    while (cursor < routes.length) {
      const route = routes[cursor++]
      try { await fetchGoklDetail(route.code) } catch { /* Other routes can still render. */ }
    }
  }))
  goklNetworkLoading.value = false
}
async function loadGoklRoute(requestedStopId = '') {
  if (!goklRoute.value) return
  const request = ++goklRouteRequest
  goklDetail.value = null
  goklTimetable.value = null
  goklEta.value = null
  goklStop.value = ''
  goklSearch.value = ''
  await run('goklRoute', async () => {
    const detail = await fetchGoklDetail(goklRoute.value)
    if (request === goklRouteRequest) {
      goklDetail.value = detail
      goklStop.value = detail?.busStops?.find(stop => String(stop.number) === String(requestedStopId))?.number ?? detail?.busStops?.[0]?.number ?? ''
      loadGoklTimetable()
      loadGoklEta()
    }
  })
}
async function loadGoklTimetable() {
  if (!goklRoute.value) return
  goklTimetable.value = null
  const route = goklRoute.value, day = goklDay.value
  await run('goklTable', async () => {
    const result = dataOf(await get('/gokl/timetable', { route, day_type: day }))
    if (route === goklRoute.value && day === goklDay.value) goklTimetable.value = result
  })
}
async function loadGoklEta() {
  const stop = goklStops.value.find(item => String(item.number) === String(goklStop.value))
  if (!stop?.location) return
  goklEta.value = null
  const route = goklRoute.value
  await run('goklEta', async () => {
    const result = dataOf(await get('/gokl/route-eta', { route, lat: stop.location.lat, lng: stop.location.lng }))
    if (route === goklRoute.value && String(stop.number) === String(goklStop.value)) { goklEta.value = result; goklUpdatedAt.value = new Date() }
  })
}
function selectGoklStop(id) { goklStop.value = id; goklEta.value = null; loadGoklEta() }
function selectGoklMapStop(id, routeId) {
  if (goklRoute.value !== routeId) { goklRoute.value = routeId; loadGoklRoute(id) }
  else selectGoklStop(id)
}
const selectedGoklArrival = computed(() => goklEta.value?.busStopInformation?.find(stop => String(stop.number) === String(goklStop.value)))
const goklVehicles = computed(() => (goklEta.value?.busInformation || []).filter(bus => bus.location?.lat && bus.location?.lng).map(bus => ({ location: bus.location, label: bus.plateNumber || 'GoKL bus', detail: bus.currentTrafficCondition ? `${bus.currentTrafficCondition.toLowerCase()} traffic` : '', status: 'GPS position' })))

// SITS
const councils = ref([])
const council = ref('')
const sitsRoutes = ref([])
const sitsRoute = ref('')
const sitsDetail = ref(null)
const sitsTimetable = ref(null)
const sitsStop = ref('')
const sitsSearch = ref('')
const sitsEta = ref(null)
const sitsStopEta = ref(null)
const sitsUpdatedAt = ref(null)
const sitsNotices = ref([])
const sitsNetworkDetails = ref({})
const sitsNetworkLoading = ref(false)
const sitsDetailRequests = new Map()
let sitsNetworkGeneration = 0
const sitsStops = computed(() => sitsDetail.value?.busStops || [])
const sitsNetworkLines = computed(() => sitsRoutes.value.map((route, index) => {
  const detail = sitsNetworkDetails.value[route.routeCode]
  return { id: route.routeCode, name: route.routeDesc ? `${route.routeCode} · ${route.routeDesc}` : route.routeName || route.routeCode, color: mapPalette[index % mapPalette.length], paths: busMapPaths(detail), stops: detail?.busStops || [], loaded: !!detail }
}))
const selectedSitsStop = computed(() => sitsStops.value.find(stop => String(stop.number) === String(sitsStop.value)))
const filteredSitsStops = computed(() => sitsStops.value.filter(stop => `${stop.name} ${stop.number}`.toLowerCase().includes(sitsSearch.value.toLowerCase())))
const selectedSitsRoute = computed(() => sitsRoutes.value.find(route => route.routeCode === sitsRoute.value))
async function loadSits() {
  if (councils.value.length) return
  await run('sitsBase', async () => {
    councils.value = dataOf(await get('/sits/councils')) || []
    council.value = councils.value[0]?.code || ''
    if (council.value) loadSitsRoutes()
  })
  run('sitsNotices', async () => {
    const response = dataOf(await get('/sits/announcements', { date: todayMYT() }))
    sitsNotices.value = Array.isArray(response) ? response : response?.items || []
  })
}
let sitsRoutesRequest = 0
async function loadSitsRoutes() {
  if (!council.value) return
  const request = ++sitsRoutesRequest
  ++sitsRouteRequest
  ++sitsNetworkGeneration
  sitsNetworkLoading.value = false
  sitsRoutes.value = []
  sitsDetail.value = null
  sitsTimetable.value = null
  sitsEta.value = null
  sitsStopEta.value = null
  await run('sitsRoutes', async () => {
    const response = dataOf(await get('/sits/routes', { councils: council.value }))
    if (request === sitsRoutesRequest) {
      sitsRoutes.value = response?.items?.flatMap(group => group.routes || []) || []
      sitsRoute.value = sitsRoutes.value[0]?.routeCode || ''
      if (sitsRoute.value) { loadSitsRoute(); loadSitsNetwork() }
    }
  })
}
let sitsRouteRequest = 0
function fetchSitsDetail(route) {
  if (sitsNetworkDetails.value[route]) return Promise.resolve(sitsNetworkDetails.value[route])
  if (!sitsDetailRequests.has(route)) {
    const request = get('/sits/route-detail', { route }).then(dataOf).then(detail => {
      sitsNetworkDetails.value = { ...sitsNetworkDetails.value, [route]: detail }
      return detail
    }).finally(() => sitsDetailRequests.delete(route))
    sitsDetailRequests.set(route, request)
  }
  return sitsDetailRequests.get(route)
}
async function loadSitsNetwork() {
  if (!sitsRoutes.value.length || sitsNetworkLoading.value) return
  const generation = sitsNetworkGeneration
  sitsNetworkLoading.value = true
  const routes = sitsRoutes.value.filter(route => !sitsNetworkDetails.value[route.routeCode])
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(4, routes.length) }, async () => {
    while (cursor < routes.length && generation === sitsNetworkGeneration) {
      const route = routes[cursor++]
      try { await fetchSitsDetail(route.routeCode) } catch { /* Other routes can still render. */ }
    }
  }))
  if (generation === sitsNetworkGeneration) sitsNetworkLoading.value = false
}
async function loadSitsRoute(requestedStopId = '') {
  if (!sitsRoute.value) return
  const request = ++sitsRouteRequest
  sitsDetail.value = null
  sitsTimetable.value = null
  sitsEta.value = null
  sitsStopEta.value = null
  sitsStop.value = ''
  sitsSearch.value = ''
  await run('sitsRoute', async () => {
    const detail = await fetchSitsDetail(sitsRoute.value)
    if (request === sitsRouteRequest) {
      sitsDetail.value = detail
      sitsStop.value = detail?.busStops?.find(stop => String(stop.number) === String(requestedStopId))?.number ?? detail?.busStops?.[0]?.number ?? ''
      loadSitsTimetable()
      loadSitsEta()
    }
  })
}
async function loadSitsTimetable() {
  if (!sitsRoute.value) return
  sitsTimetable.value = null
  const route = sitsRoute.value
  await run('sitsTable', async () => {
    const result = dataOf(await get('/sits/timetable', { route }))
    if (route === sitsRoute.value) sitsTimetable.value = result
  })
}
async function loadSitsEta() {
  const stop = sitsStops.value.find(item => String(item.number) === String(sitsStop.value))
  if (!stop?.location) return
  sitsEta.value = null
  sitsStopEta.value = null
  const route = sitsRoute.value
  await run('sitsEta', async () => {
    const [routeResult, stopResult] = await Promise.allSettled([
      get('/sits/route-eta', { route, lat: stop.location.lat, lng: stop.location.lng }),
      get('/sits/stop-eta', { route, stop: stop.number }),
    ])
    if (routeResult.status === 'rejected' && stopResult.status === 'rejected') throw routeResult.reason
    if (route === sitsRoute.value && String(stop.number) === String(sitsStop.value)) {
      if (routeResult.status === 'fulfilled') sitsEta.value = dataOf(routeResult.value)
      if (stopResult.status === 'fulfilled') sitsStopEta.value = dataOf(stopResult.value)
      sitsUpdatedAt.value = new Date()
    }
  })
}
function selectSitsStop(id) { sitsStop.value = id; sitsEta.value = null; sitsStopEta.value = null; loadSitsEta() }
function selectSitsMapStop(id, routeId) {
  if (sitsRoute.value !== routeId) { sitsRoute.value = routeId; loadSitsRoute(id) }
  else selectSitsStop(id)
}
const selectedSitsArrival = computed(() => {
  const live = sitsStopEta.value?.eta
  if (Number(live?.upcomingVehicleEtaInSeconds) > 0) return { etaInSeconds: live.upcomingVehicleEtaInSeconds, etaInText: `${Math.ceil(Number(live.upcomingVehicleEtaInSeconds) / 60)} min`, status: live.upcomingVehicleStatus }
  return sitsEta.value?.busStops?.find(stop => String(stop.number) === String(sitsStop.value))
})
const sitsVehicles = computed(() => {
  const eta = sitsStopEta.value?.eta
  if (!eta) return []
  return [
    { location: eta.upcomingVehicleLocation, label: eta.upcomingVehicleNumber || 'SITS bus', detail: eta.upcomingVehicleType?.replaceAll('_', ' ') || '', status: eta.upcomingVehicleStatus },
    { location: eta.followingVehicleLocation, label: eta.followingVehicleNumber || 'Following bus', detail: eta.followingVehicleType?.replaceAll('_', ' ') || '', status: eta.followingVehicleStatus },
  ].filter(vehicle => vehicle.location?.lat && vehicle.location?.lng)
})

// KTMB: stations and timetable are public endpoints; no session or user token.
const ktmbStates = ref([])
const ktmbFrom = ref('')
const ktmbTo = ref('')
const ktmbDate = ref(todayMYT())
const ktmbTrips = ref(null)
watch([ktmbFrom, ktmbTo, ktmbDate], () => { ktmbTrips.value = null })
const allKtmbStations = computed(() => ktmbStates.value.flatMap(group => (group.Stations || []).map(station => ({ ...station, state: group.State }))))
const stationLabel = id => allKtmbStations.value.find(station => String(station.Id) === String(id))?.Description || id
async function loadKtmb() {
  if (ktmbStates.value.length) return
  await run('ktmbBase', async () => {
    ktmbStates.value = dataOf(await get('/ktmb/stations'))
    const stations = allKtmbStations.value
    ktmbFrom.value = stations.find(station => /batu caves/i.test(station.Description))?.Id || stations[0]?.Id || ''
    ktmbTo.value = stations.find(station => /kl sentral/i.test(station.Description))?.Id || stations[1]?.Id || ''
  })
}
async function loadKtmbTrips() {
  if (!ktmbFrom.value || !ktmbTo.value || !ktmbDate.value || ktmbFrom.value === ktmbTo.value) return
  ktmbTrips.value = null
  await run('ktmbTrips', async () => { ktmbTrips.value = dataOf(await get('/ktmb/timetable', { fromId: ktmbFrom.value, toId: ktmbTo.value, onwardDate: ktmbDate.value })) })
}

function activate(id) {
  active.value = id
  if (id === 'rapidkl') loadRapid()
  if (id === 'gokl') loadGokl()
  if (id === 'sits') loadSits()
  if (id === 'ktmb') loadKtmb()
}
function showNearbyGokl(route) {
  goklRoute.value = route.code
  loadGoklRoute()
}
function showNearbySits(route) {
  if (!sitsRoutes.value.some(item => item.routeCode === route.code)) sitsRoutes.value = [...sitsRoutes.value, { routeCode: route.code, routeName: route.name, routeDesc: route.desc }]
  sitsRoute.value = route.code
  loadSitsRoute()
}
function noticeTitle(item) { return item?.title || item?.name || item?.message || item?.heading || 'Service update' }
function noticeDate(item) { return item?.date_published || item?.date || item?.published_at || item?.publishedAt || item?.pubDate || '' }
function etaText(seconds) {
  if (seconds === null || seconds === undefined || seconds === '') return 'No estimate available'
  const numeric = Number(seconds)
  if (Number.isNaN(numeric)) return 'No estimate available'
  if (numeric < 0) return 'Passed'
  const minutes = Math.ceil(numeric / 60)
  return minutes === 0 ? 'Due now' : `${minutes} min`
}
function sitsEtaText(stop) {
  if (!stop || stop.etaInText === '--' || (!stop.etaInText && !stop.etaInSeconds)) return 'No estimate available'
  return stop.etaInText || etaText(stop.etaInSeconds)
}
function sitsStatusText(stop) { return stop?.status || (sitsEtaText(stop) === 'No estimate available' ? 'No tracked bus at this stop' : 'Estimate from SITS') }
function goklStatusText(stop) { return stop?.nextVehicleStatus || (stop?.nextVehicleEtaInSeconds === undefined ? 'No tracked bus at this stop' : 'Estimate from GoKL') }
function fareValue(value) { return value === undefined || value === null || value === '' ? '—' : `RM ${Number(value).toFixed(2)}` }
let refreshTimer
onMounted(() => {
  loadRapid()
  refreshTimer = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    if (active.value === 'gokl' && goklStop.value) loadGoklEta()
    if (active.value === 'sits' && sitsStop.value) loadSitsEta()
  }, 60_000)
})
onBeforeUnmount(() => window.clearInterval(refreshTimer))
</script>

<template>
  <div class="app-root">
    <div class="ambient"><span class="orb orb-one"></span><span class="orb orb-two"></span><span class="orb orb-three"></span></div>
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="header-wrapper">
      <div class="pill-dock">
        <a class="dock-brand" href="/" aria-label="TransportMY home"><span class="brand-bubble">T</span><span>Transport<span class="brand-accent">MY</span></span></a>
        <nav class="dock-nav" aria-label="Transport providers">
          <button v-for="provider in providers" :key="provider.id" type="button" :class="{ active: active === provider.id }" :aria-current="active === provider.id ? 'page' : undefined" @click="activate(provider.id)">{{ provider.name }}</button>
        </nav>
        <ServiceDirectory current="transport" />
      </div>
    </header>

    <main id="main" class="main-content">
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow"><span class="eyebrow-line"></span> Malaysia in motion</div>
          <h1>Know the way <span>before you go.</span></h1>
          <p>Find transit routes, coach trips, tolls and traffic information from one calm place.</p>
          <div class="hero-pills"><span>Rapid KL</span><span>GoKL</span><span>SITS</span><span>KTMB</span><span>PLUS</span><span>WCE</span><span>TBS</span></div>
        </div>
        <div class="hero-art" aria-hidden="true"><span class="track track-one"></span><span class="track track-two"></span><span class="track track-three"></span><span class="track-stop stop-one"></span><span class="track-stop stop-two"></span><span class="track-stop stop-three"></span><span class="track-stop stop-four"></span><span class="track-card"><span>MY</span><strong>Next stop<br>somewhere new.</strong><small>TransportMY</small></span></div>
      </section>

      <section class="provider-section" aria-label="Choose a transport provider">
        <div class="section-intro"><span class="section-kicker">Explore services</span><h2>Your journey, your choice.</h2><p>Pick a provider to see the information available for your trip.</p></div>
        <div class="provider-grid">
          <button v-for="provider in providers" :key="provider.id" type="button" class="provider-card liquid-card" :class="{ selected: active === provider.id }" @click="activate(provider.id)">
            <span class="provider-top"><span class="provider-mark">{{ provider.mark }}</span><span class="provider-arrow" aria-hidden="true">↗</span></span>
            <span class="provider-type">{{ provider.type }}</span><strong>{{ provider.name }}</strong><span class="provider-summary">{{ provider.summary }}</span>
          </button>
        </div>
      </section>

      <section class="workspace" aria-live="polite">
        <div class="workspace-title"><div><span class="section-kicker">{{ activeProvider.type }}</span><h2>{{ activeProvider.name }}</h2></div><span class="timezone">Times shown in Malaysia time (MYT)</span></div>

        <template v-if="active === 'rapidkl'">
          <div v-if="busy.rapidBase" class="state-card">Loading Rapid KL stations…</div>
          <div v-else-if="errors.rapidBase" class="state-card error">{{ errors.rapidBase }} <button @click="loadRapid">Retry</button></div>
          <template v-else>
            <div class="workspace-grid">
              <div class="liquid-card panel">
                <div class="panel-heading"><span class="section-kicker">01 / Explore</span><h3>Stations & arrivals</h3><p>Choose a line, then a station for the next train estimate.</p></div>
                <div class="field-grid"><label>Line<select v-model="rapidLine"><option v-for="line in rapidLines" :key="line.route_id" :value="line.route_id">{{ line.route_long_name || line.route_short_name }}</option></select></label><label>Search this line<input v-model="rapidSearch" type="search" placeholder="Find a station"></label></div>
                <div class="station-list"><button v-for="stop in filteredRapidStops" :key="stop.stop_id" type="button" class="station-row" :class="{ selected: rapidStation === stop.stop_id }" @click="selectRapidStop(stop.stop_id)"><span class="station-icon"></span><span>{{ stop.stop_name }}</span><small>{{ stop.stop_id }}</small></button><div v-if="!filteredRapidStops.length" class="empty-inline">No matching stations.</div></div>
              </div>
              <div class="stack">
                <div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">Live lookup</span><h3>{{ rapidStationName || 'Train arrivals' }}</h3><p>Refresh to request the latest estimate.</p></div><div class="panel-toolbar"><button class="secondary-button" :disabled="busy.rapidEta || !rapidStation" @click="loadRapidEta">{{ busy.rapidEta ? 'Checking…' : 'Refresh arrivals' }}</button></div>
                  <div v-if="errors.rapidEta" class="state-card error">{{ errors.rapidEta }}</div><div v-else-if="busy.rapidEta" class="state-card">Checking train arrivals…</div><template v-else-if="rapidEta"><div class="status-line"><span class="status-tag">{{ rapidEta.schedule_label || rapidEta.operating_status || rapidEta.status || 'Service status' }}</span><small>{{ rapidEta.current_time_myt || '' }}</small></div><div v-if="rapidEta.destinations?.length" class="arrival-list"><div v-for="(destination, index) in rapidEta.destinations" :key="index" class="arrival-row"><strong>{{ destination.destination || destination.name || destination.station || 'Train' }}</strong><span>{{ destination.eta_text || destination.eta || destination.minutes || 'See service data' }}</span></div></div><div v-else class="state-card">No arrival estimates are available right now. {{ rapidEta.schedule_label || 'The service may be outside operating hours.' }}</div></template><div v-else class="state-card">Select a station to check arrivals.</div>
                </div>
                <div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">02 / Plan</span><h3>Fare estimate</h3><p>Compare the fares returned for two stations.</p></div><form class="fare-form" @submit.prevent="loadFare"><label>From<select v-model="rapidFareFrom"><option v-for="stop in allRapidStops" :key="stop.stop_id" :value="stop.stop_id">{{ stop.stop_name }}</option></select></label><label>To<select v-model="rapidFareTo"><option v-for="stop in allRapidStops" :key="stop.stop_id" :value="stop.stop_id">{{ stop.stop_name }}</option></select></label><button class="primary-button" :disabled="busy.rapidFare || !rapidFareFrom || !rapidFareTo || rapidFareFrom === rapidFareTo">{{ busy.rapidFare ? 'Checking…' : 'Check fare' }}</button></form><div v-if="errors.rapidFare" class="inline-error">{{ errors.rapidFare }}</div><div v-if="rapidFare?.fares" class="fare-results"><div v-for="key in ['adult','cash','cashless','consession']" :key="key" v-show="rapidFare.fares[key] !== undefined"><span>{{ key === 'consession' ? 'Concession' : key }}</span><strong>{{ fareValue(rapidFare.fares[key]) }}</strong></div></div></div>
              </div>
            </div>
            <TransitMap v-if="rapidLines.length" provider="rapidkl" :lines="rapidNetworkLines" :selected-route-id="rapidLine" :selected-stop-id="rapidStation" @select-stop="selectRapidMapStop" />
            <RapidNotices />
            <RapidExplorer />
          </template>
        </template>

        <template v-else-if="active === 'gokl'">
          <div v-if="busy.goklBase" class="state-card">Loading GoKL routes…</div><div v-else-if="errors.goklBase" class="state-card error">{{ errors.goklBase }} <button @click="loadGokl">Retry</button></div>
          <template v-else><div class="liquid-card selector-panel"><label>City route<select v-model="goklRoute" @change="loadGoklRoute()"><option v-for="route in goklRoutes" :key="route.code" :value="route.code">{{ route.name }} · {{ route.desc }}</option></select></label><span>{{ selectedGoklRoute?.desc }}</span></div>
            <div v-if="busy.goklRoute" class="state-card">Loading route and timetable…</div><div v-else-if="errors.goklRoute" class="state-card error">{{ errors.goklRoute }} <button @click="loadGoklRoute()">Retry</button></div>
            <div v-else class="workspace-grid"><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">01 / Explore</span><h3>Stops on this route</h3><p>Select a stop to request a nearby arrival estimate.</p></div><label>Find a stop<input v-model="goklSearch" type="search" placeholder="Stop name or number"></label><div class="station-list"><button v-for="stop in filteredGoklStops" :key="stop.number" class="station-row" :class="{ selected: goklStop === stop.number }" @click="selectGoklStop(stop.number)"><span class="station-icon"></span><span>{{ stop.name }}</span><small>{{ stop.number }}</small></button><div v-if="!filteredGoklStops.length" class="empty-inline">No matching stops.</div></div></div>
              <div class="stack"><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">Live lookup</span><h3>Bus arrival</h3><p>Estimates depend on currently tracked buses.</p></div><button class="primary-button" :disabled="busy.goklEta || !goklStop" @click="loadGoklEta">{{ busy.goklEta ? 'Checking…' : 'Check this stop' }}</button><div v-if="errors.goklEta" class="state-card error">{{ errors.goklEta }}</div><div v-else-if="busy.goklEta" class="state-card">Checking bus arrivals…</div><div v-else-if="goklEta" class="arrival-result"><span>Next bus</span><strong>{{ etaText(selectedGoklArrival?.nextVehicleEtaInSeconds) }}</strong><small>{{ goklStatusText(selectedGoklArrival) }}</small></div><div v-else class="state-card">Choose a stop and check for an estimate.</div></div>
                <div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">02 / Schedule</span><h3>Departures</h3><p>Times are published schedules, not live arrivals.</p></div><div class="segmented"><button v-for="day in [{id:'WD',label:'Weekdays'},{id:'SA',label:'Saturday'},{id:'SU',label:'Sunday'}]" :key="day.id" :class="{ active: goklDay === day.id }" @click="goklDay = day.id; loadGoklTimetable()">{{ day.label }}</button></div><div v-if="busy.goklTable" class="state-card">Loading timetable…</div><div v-else-if="errors.goklTable" class="state-card error">{{ errors.goklTable }}</div><Timetable v-else :table="goklTimetable" :day="goklDay" /></div></div></div>
            <TransitMap v-if="goklRoutes.length" provider="gokl" :lines="goklNetworkLines" :selected-route-id="goklRoute" :selected-stop-id="goklStop" :vehicles="goklVehicles" :updated-at="goklUpdatedAt" :network-loading="goklNetworkLoading" @select-stop="selectGoklMapStop" @refresh="loadGoklEta" @retry-network="loadGoklNetwork" />
            <div v-if="goklNotices.length" class="liquid-card notice-panel"><div class="panel-heading"><span class="section-kicker">Service information</span><h3>GoKL notices</h3></div><div class="notice-list"><div v-for="(notice,index) in goklNotices.slice(0,4)" :key="index"><strong>{{ noticeTitle(notice) }}</strong><small>{{ noticeDate(notice) }}</small></div></div></div>
            <NearbyPanel v-if="goklDetail" provider="gokl" :location="selectedGoklStop?.location" :label="selectedGoklStop?.name" @select-route="showNearbyGokl" />
          </template>
        </template>

        <template v-else-if="active === 'sits'">
          <div v-if="busy.sitsBase" class="state-card">Loading SITS councils…</div><div v-else-if="errors.sitsBase" class="state-card error">{{ errors.sitsBase }} <button @click="loadSits">Retry</button></div>
          <template v-else><div class="liquid-card selector-panel two-fields"><label>Council<select v-model="council" @change="loadSitsRoutes"><option v-for="item in councils" :key="item.code" :value="item.code">{{ item.name }} ({{ item.code }})</option></select></label><label>Route<select v-model="sitsRoute" :disabled="busy.sitsRoutes || !sitsRoutes.length" @change="loadSitsRoute()"><option v-for="route in sitsRoutes" :key="route.routeCode" :value="route.routeCode">{{ route.routeName }} · {{ route.routeDesc }}</option></select></label></div>
            <div v-if="busy.sitsRoutes || busy.sitsRoute" class="state-card">Loading Selangor route…</div><div v-else-if="errors.sitsRoutes || errors.sitsRoute" class="state-card error">{{ errors.sitsRoutes || errors.sitsRoute }} <button @click="errors.sitsRoutes ? loadSitsRoutes() : loadSitsRoute()">Retry</button></div>
            <div v-else class="workspace-grid"><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">01 / Explore</span><h3>{{ selectedSitsRoute?.routeName || 'Route stops' }}</h3><p>{{ selectedSitsRoute?.routeDesc || 'Select a stop for a nearby bus estimate.' }}</p></div><label>Find a stop<input v-model="sitsSearch" type="search" placeholder="Stop name or number"></label><div class="station-list"><button v-for="stop in filteredSitsStops" :key="stop.number" class="station-row" :class="{ selected: sitsStop === stop.number }" @click="selectSitsStop(stop.number)"><span class="station-icon"></span><span>{{ stop.name }}</span><small>{{ stop.number }}</small></button><div v-if="!filteredSitsStops.length" class="empty-inline">No matching stops.</div></div></div><div class="stack"><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">Live lookup</span><h3>Bus arrival</h3><p>Availability depends on tracked buses.</p></div><button class="primary-button" :disabled="busy.sitsEta || !sitsStop" @click="loadSitsEta">{{ busy.sitsEta ? 'Checking…' : 'Check this stop' }}</button><div v-if="errors.sitsEta" class="state-card error">{{ errors.sitsEta }}</div><div v-else-if="busy.sitsEta" class="state-card">Checking bus arrivals…</div><div v-else-if="sitsEta || sitsStopEta" class="arrival-result"><span>Next bus</span><strong>{{ sitsEtaText(selectedSitsArrival) }}</strong><small>{{ sitsStatusText(selectedSitsArrival) }}</small></div><div v-else class="state-card">Choose a stop and check for an estimate.</div></div><div class="liquid-card panel"><div class="panel-heading"><span class="section-kicker">02 / Schedule</span><h3>Departures</h3><p>Published times for this route.</p></div><div v-if="busy.sitsTable" class="state-card">Loading timetable…</div><div v-else-if="errors.sitsTable" class="state-card error">{{ errors.sitsTable }} <button @click="loadSitsTimetable">Retry</button></div><Timetable v-else :table="sitsTimetable" /></div></div></div>
            <TransitMap v-if="sitsRoutes.length" provider="sits" :lines="sitsNetworkLines" :selected-route-id="sitsRoute" :selected-stop-id="sitsStop" :vehicles="sitsVehicles" :updated-at="sitsUpdatedAt" :network-loading="sitsNetworkLoading" @select-stop="selectSitsMapStop" @refresh="loadSitsEta" @retry-network="loadSitsNetwork" />
            <div v-if="sitsNotices.length" class="liquid-card notice-panel"><div class="panel-heading"><span class="section-kicker">Service information</span><h3>SITS notices</h3></div><div class="notice-list"><div v-for="(notice,index) in sitsNotices.slice(0,4)" :key="index"><strong>{{ noticeTitle(notice) }}</strong><small>{{ noticeDate(notice) }}</small></div></div></div>
            <NearbyPanel v-if="sitsDetail" provider="sits" :location="selectedSitsStop?.location" :label="selectedSitsStop?.name" @select-route="showNearbySits" />
          </template>
        </template>

        <template v-else-if="active === 'ktmb'">
          <div v-if="busy.ktmbBase" class="state-card">Loading KTMB stations…</div><div v-else-if="errors.ktmbBase" class="state-card error">{{ errors.ktmbBase }} <button @click="loadKtmb">Retry</button></div>
          <template v-else><div class="liquid-card panel ktmb-planner"><div class="panel-heading"><span class="section-kicker">Rail journey</span><h3>Find a train</h3><p>Choose stations and a travel date. No account or token needed.</p></div><form class="trip-form" @submit.prevent="loadKtmbTrips"><label>From<select v-model="ktmbFrom"><optgroup v-for="group in ktmbStates" :key="group.State" :label="group.State"><option v-for="station in group.Stations" :key="station.Id" :value="station.Id">{{ station.Description }}</option></optgroup></select></label><label>To<select v-model="ktmbTo"><optgroup v-for="group in ktmbStates" :key="group.State" :label="group.State"><option v-for="station in group.Stations" :key="station.Id" :value="station.Id">{{ station.Description }}</option></optgroup></select></label><label>Travel date<input v-model="ktmbDate" type="date" :min="todayMYT()"></label><button class="primary-button" :disabled="busy.ktmbTrips || !ktmbFrom || !ktmbTo || ktmbFrom === ktmbTo || !ktmbDate">{{ busy.ktmbTrips ? 'Searching…' : 'Find trains' }}</button></form><p v-if="ktmbFrom === ktmbTo" class="inline-error">Choose two different stations.</p></div><div class="liquid-card panel trip-results"><div class="panel-heading"><span class="section-kicker">Timetable</span><h3>{{ ktmbTrips ? `${stationLabel(ktmbFrom)} → ${stationLabel(ktmbTo)}` : 'Train services' }}</h3><p>{{ ktmbTrips ? ktmbDate : 'Results will appear after you search.' }}</p></div><div v-if="busy.ktmbTrips" class="state-card">Looking up trains…</div><div v-else-if="errors.ktmbTrips" class="state-card error">{{ errors.ktmbTrips }} <button @click="loadKtmbTrips">Retry</button></div><div v-else-if="ktmbTrips?.length" class="trip-list"><div v-for="(trip,index) in ktmbTrips" :key="`${trip.trainNo}-${index}`" class="trip-row"><div class="trip-time"><strong>{{ trip.depart24TimeString || clockMYT(trip.departDateTime) }}</strong><span class="trip-line"></span><strong>{{ trip.arrival24TimeString || clockMYT(trip.arrivalDateTime) }}</strong></div><div class="trip-details"><strong>{{ trip.leftLabel || trip.trainService || 'KTMB service' }}</strong><span>{{ trip.totalJourneyTimeString || 'Duration unavailable' }}<template v-if="trip.trainNo"> · Train {{ trip.trainNo }}</template><template v-if="trip.platformNo"> · Platform {{ trip.platformNo }}</template></span></div><span class="trip-status">{{ trip.tripStatusLabel || trip.tripRightUpLabel || 'Scheduled' }}</span></div></div><div v-else-if="ktmbTrips" class="state-card">No trains were returned for this route and date.</div><div v-else class="state-card">Select a route and date, then find trains.</div></div></template>
        </template>
        <PlusPanel v-else-if="active === 'plus'" />
        <WcePanel v-else-if="active === 'wce'" />
        <TbsPanel v-else-if="active === 'tbs'" />
      </section>
    </main>

    <footer class="footer-simplified"><div class="footer-bar"><div class="footer-left"><a class="footer-logo" href="/"><span class="footer-dot"></span><span>Transport<span class="brand-accent">MY</span></span></a><span class="footer-sep">•</span><a class="copyright" href="https://dani-dev.co.za/">&copy; {{ new Date().getFullYear() }} dani dev</a></div><a class="powered-link" href="https://github.com/danyooooo/malaysian-api" target="_blank" rel="noopener noreferrer">Powered by malaysian-api <span aria-hidden="true">↗</span></a></div></footer>
  </div>
</template>

