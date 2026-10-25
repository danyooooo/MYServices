<script setup>
import { computed, ref } from 'vue'
import WeatherBackground from './components/WeatherBackground.vue'
import Icon from './components/Icon.vue'
import LocationSearch from './components/LocationSearch.vue'
import ForecastView from './components/ForecastView.vue'
import WarningsView from './components/WarningsView.vue'
import LocationsView from './components/LocationsView.vue'
import NewsView from './components/NewsView.vue'
import WeatherMapsView from './components/WeatherMapsView.vue'
import WindView from './components/WindView.vue'
import CyclonesView from './components/CyclonesView.vue'
import ServiceDirectory from './ServiceDirectory.vue'
import { useWeather } from './composables/useWeather'
import { formatDate, formatTime, searchCatalog } from './lib/weather'

const { forecast, forecastLoading, forecastError, selected, catalog, catalogLoading, catalogError,
  alerts, alertsLoading, alertsError, forecastUpdated, alertsUpdated, now, lookup, activeWarnings,
  loadForecast, loadAlerts, loadCatalog, refresh } = useWeather()
const tab = ref('forecast')
const tabs = [
  { id: 'forecast', label: 'Forecast', icon: 'sun' },
  { id: 'warnings', label: 'Warnings', icon: 'alert' },
  { id: 'locations', label: 'Locations', icon: 'map' },
  { id: 'maps', label: 'Maps', icon: 'drop' },
  { id: 'wind', label: 'Wind', icon: 'wind' },
  { id: 'cyclones', label: 'Cyclones', icon: 'cyclone' },
  { id: 'news', label: 'News', icon: 'news' },
]
const busy = computed(() => forecastLoading.value || alertsLoading.value)
const quickPlaces = computed(() => ['Kuala Lumpur', 'George Town', 'Johor Bahru', 'Kuching', 'Kota Kinabalu']
  .map(name => searchCatalog(catalog.value, name, 1)[0]).filter(Boolean))

function selectPlace(place) {
  tab.value = 'forecast'
  loadForecast(place)
}

function moveTab(event, index) {
  let next
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
  else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = tabs.length - 1
  else return
  event.preventDefault()
  tab.value = tabs[next].id
  event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus()
}
</script>

<template>
  <div class="app-root weather-app">
    <WeatherBackground :forecast="forecast" :now="now" />
    <a class="skip-link" href="#main">Skip to content</a>

    <header class="header-wrapper">
      <div class="pill-dock">
        <a class="dock-brand" href="/" aria-label="WeatherMY home">
          <div class="brand-bubble" aria-hidden="true"><div class="bubble-inner"></div></div>
          <span>Weather<span class="brand-accent">MY</span></span>
        </a>
        <ServiceDirectory current="weather" />
      </div>
    </header>

    <main id="main" class="main-content weather-main">
      <div class="dashboard-heading"><div><span class="eyebrow">Cuaca Malaysia</span><h1 id="weather-title">Your local <span class="text-gradient">weather.</span></h1><p>{{ formatDate(now, { weekday: 'long', year: 'numeric' }) }} <span>·</span> {{ formatTime(now) }} MYT</p></div><button class="liquid-btn liquid-btn-glass refresh-button" :disabled="busy" @click="refresh"><Icon name="refresh" :class="{ spinning: busy }" />Refresh<span class="sr-only"> forecast and warnings</span></button></div>
      <div class="toolbar"><div class="weather-tabs" role="tablist" aria-label="Weather sections"><button v-for="(item, index) in tabs" :id="`tab-${item.id}`" :key="item.id" role="tab" :aria-selected="tab === item.id" :aria-controls="`panel-${item.id}`" :tabindex="tab === item.id ? 0 : -1" :class="{ active: tab === item.id }" @click="tab = item.id" @keydown="moveTab($event, index)"><Icon :name="item.icon" /><span>{{ item.label }}</span><span v-if="item.id === 'warnings' && activeWarnings.length" class="warning-badge">{{ activeWarnings.length }}</span></button></div><LocationSearch :catalog="catalog" :lookup="lookup" :loading="catalogLoading" :error="catalogError" @select="selectPlace" @retry="loadCatalog" /></div>
      <div v-if="tab === 'forecast' && quickPlaces.length" class="quick-places"><span>Quick look</span><button v-for="place in quickPlaces" :key="place.id" :class="{ selected: selected.id === place.id }" :aria-pressed="selected.id === place.id" @click="selectPlace(place)">{{ place.name }}</button></div>
      <div :id="`panel-${tab}`" role="tabpanel" :aria-labelledby="`tab-${tab}`" tabindex="0" class="weather-panel">
        <ForecastView v-if="tab === 'forecast'" :forecast="forecast" :loading="forecastLoading" :error="forecastError" :selected="selected" :lookup="lookup" :warnings="activeWarnings" :alerts-loading="alertsLoading" :alerts-error="alertsError" :updated="forecastUpdated" @retry="loadForecast()" @warnings="tab = 'warnings'" @retry-alerts="loadAlerts" />
        <WarningsView v-else-if="tab === 'warnings'" :alerts="alerts" :loading="alertsLoading" :error="alertsError" :updated="alertsUpdated" :now="now" @retry="loadAlerts" />
        <LocationsView v-else-if="tab === 'locations'" :catalog="catalog" :lookup="lookup" :catalog-loading="catalogLoading" :catalog-error="catalogError" @select="selectPlace" @warnings="tab = 'warnings'" @retry-catalog="loadCatalog" />
        <WeatherMapsView v-else-if="tab === 'maps'" />
        <WindView v-else-if="tab === 'wind'" />
        <CyclonesView v-else-if="tab === 'cyclones'" />
        <NewsView v-else-if="tab === 'news'" />
      </div>
    </main>

    <footer class="footer-simplified weather-footer">
      <div class="footer-bar">
        <div class="footer-left">
          <a class="footer-logo" href="/"><span class="logo-dot" aria-hidden="true"></span><span>Weather<span class="logo-accent">MY</span></span></a>
          <span class="footer-sep" aria-hidden="true">•</span>
          <a class="copyright" href="https://dani-dev.co.za/">&copy; {{ new Date().getFullYear() }} dani dev</a>
        </div>
        <div class="footer-right">
          <a class="powered-link" href="https://github.com/danyooooo/malaysian-api" target="_blank" rel="noopener noreferrer" title="malaysian-api on GitHub">Powered by malaysian-api <span class="arrow" aria-hidden="true">↗</span></a>
        </div>
      </div>
    </footer>
  </div>
</template>
