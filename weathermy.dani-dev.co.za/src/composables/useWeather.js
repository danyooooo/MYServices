import { computed, onMounted, onUnmounted, ref } from 'vue'
import { api } from '../lib/api'
import { warningStatus } from '../lib/weather'

export function useWeather() {
  const forecast = ref(null)
  const forecastLoading = ref(false)
  const forecastError = ref('')
  const selected = ref({ id: 'Ds058', name: 'Kuala Lumpur', type: 'west-districts', parentId: 'St009' })
  const catalog = ref([])
  const catalogLoading = ref(false)
  const catalogError = ref('')
  const alerts = ref(null)
  const alertsLoading = ref(false)
  const alertsError = ref('')
  const forecastUpdated = ref(null)
  const alertsUpdated = ref(null)
  const now = ref(Date.now())
  const lookup = computed(() => new Map(catalog.value.map(place => [place.id, place])))
  const activeWarnings = computed(() => (alerts.value?.warnings || []).filter(w => warningStatus(w, now.value) === 'active'))
  let forecastController
  let catalogController
  let alertsController
  let clockTimer

  async function loadForecast(place = selected.value) {
    forecastController?.abort()
    const controller = new AbortController()
    forecastController = controller
    selected.value = place
    forecast.value = null
    forecastUpdated.value = null
    forecastLoading.value = true
    forecastError.value = ''
    try {
      const data = await api.forecast(place.id, controller.signal)
      if (controller.signal.aborted) return
      if (!data?.weather_summary || data?.details?.location_id !== place.id) throw new Error('Forecast unavailable')
      forecast.value = data
      forecastUpdated.value = new Date().toISOString()
    } catch (error) {
      if (!controller.signal.aborted) forecastError.value = 'We couldn’t load this forecast. Please try again.'
    } finally {
      if (forecastController === controller) forecastLoading.value = false
    }
  }

  async function loadAlerts() {
    alertsController?.abort()
    const controller = new AbortController()
    alertsController = controller
    alertsLoading.value = true
    alertsError.value = ''
    try {
      const data = await api.alerts(controller.signal)
      if (controller.signal.aborted) return
      if (!Array.isArray(data?.warnings)) throw new Error('Warnings unavailable')
      alerts.value = data
      alertsUpdated.value = new Date().toISOString()
      now.value = Date.now()
    } catch (error) {
      if (!controller.signal.aborted) alertsError.value = 'We couldn’t check the latest warnings. Please try again.'
    } finally {
      if (alertsController === controller) alertsLoading.value = false
    }
  }

  async function loadCatalog() {
    catalogController?.abort()
    const controller = new AbortController()
    catalogController = controller
    catalogLoading.value = true
    catalogError.value = ''
    try {
      const data = await api.catalog(controller.signal)
      if (controller.signal.aborted) return
      if (!Array.isArray(data)) throw new Error('Locations unavailable')
      catalog.value = data.filter(place => place.active !== false)
    } catch (error) {
      if (!controller.signal.aborted) catalogError.value = 'We couldn’t load the location list. Please try again.'
    } finally {
      if (catalogController === controller) catalogLoading.value = false
    }
  }

  function refresh() {
    return Promise.allSettled([loadForecast(), loadAlerts()])
  }

  onMounted(() => {
    refresh()
    loadCatalog()
    clockTimer = window.setInterval(() => { now.value = Date.now() }, 60000)
  })

  onUnmounted(() => {
    forecastController?.abort()
    catalogController?.abort()
    alertsController?.abort()
    window.clearInterval(clockTimer)
  })

  return { forecast, forecastLoading, forecastError, selected, catalog, catalogLoading, catalogError,
    alerts, alertsLoading, alertsError, forecastUpdated, alertsUpdated, now, lookup, activeWarnings,
    loadForecast, loadAlerts, loadCatalog, refresh }
}
