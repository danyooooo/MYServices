<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'
import WeatherIcon from './WeatherIcon.vue'
import { conditionLabel, formatDate, formatTime, number, stateName, warningTitle } from '../lib/weather'

const props = defineProps({ forecast: Object, loading: Boolean, error: String, selected: Object, lookup: Map,
  warnings: Array, alertsLoading: Boolean, alertsError: String, updated: String })
const emit = defineEmits(['retry', 'warnings', 'retry-alerts'])
const summary = computed(() => props.forecast?.weather_summary || {})
const metrics = computed(() => {
  const widgets = props.forecast?.widgets || {}
  return [
    { key: 'humidity', label: 'Humidity', icon: 'drop', fallback: '%' },
    { key: 'wind-speed', label: 'Wind', icon: 'wind', fallback: 'km/h' },
    { key: 'precipitation', label: 'Precipitation', icon: 'drop', fallback: 'mm' },
    { key: 'uv-index', label: 'UV index', icon: 'sun', fallback: '' },
    { key: 'air-quality', label: 'Air quality', icon: 'air', fallback: '' },
  ].map(item => ({ ...item, ...widgets[item.key], unit: widgets[item.key]?.unit || item.fallback }))
})
const moon = computed(() => props.forecast?.astronomy?.moon)
</script>

<template>
  <section aria-label="Local weather forecast">
    <div v-if="loading" class="liquid-card loading-panel" role="status"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-temperature"></div><p>Loading the forecast for {{ selected.name }}…</p></div>
    <div v-else-if="error" class="liquid-card error-panel" role="alert"><Icon name="alert" /><h2>Forecast unavailable</h2><p>{{ error }}</p><button class="liquid-btn liquid-btn-glass" @click="emit('retry')">Try again</button></div>
    <template v-else-if="forecast">
      <div class="overview-grid">
        <article class="liquid-card current-card">
          <div class="card-topline"><span class="section-label"><Icon name="pin" /> Current conditions</span><span class="subtle">{{ stateName(selected, lookup) }}</span></div>
          <h2>{{ forecast.details?.name || selected.name }}</h2>
          <div class="current-weather"><div><div class="temperature">{{ number(summary.temperature) }}<span>°</span></div><p class="condition-name">{{ conditionLabel(summary.condition) }}</p></div><WeatherIcon :condition="summary.condition" class="current-weather-icon" /></div>
          <div class="current-details"><span>Feels like <strong>{{ number(summary.temperature_feels_like) }}°</strong></span><span>High <strong>{{ number(summary.max) }}°</strong></span><span>Low <strong>{{ number(summary.min) }}°</strong></span></div>
          <div class="current-bottom"><p v-if="forecast.raining && typeof forecast.raining === 'object'"><Icon name="drop" /> {{ forecast.raining.level || 'Rain' }} rain expected around {{ formatTime(forecast.raining.timestamp) }}</p><p v-else-if="forecast.raining === true"><Icon name="drop" /> Rain reported in the area</p><p class="retrieval-time"><Icon name="clock" /> Retrieved {{ formatTime(updated) }} MYT</p></div>
        </article>

        <aside class="liquid-card warning-spotlight">
          <span class="section-label"><Icon name="alert" /> National warnings</span>
          <template v-if="alertsError"><h2>Warnings unavailable</h2><p>{{ alertsError }}</p><button class="liquid-btn liquid-btn-glass" @click="emit('retry-alerts')">Try again</button></template>
          <template v-else-if="alertsLoading"><p role="status">Checking the latest notices…</p></template>
          <template v-else><div class="warning-count">{{ warnings.length.toString().padStart(2, '0') }}<span>active {{ warnings.length === 1 ? 'notice' : 'notices' }}</span></div><p v-if="warnings.length">{{ warningTitle(warnings[0]) }}</p><p v-else>No active warnings in the latest response.</p><p class="subtle">Warnings cover land, coastal waters and shipping areas.</p><button class="liquid-btn liquid-btn-glass" @click="emit('warnings')">View all warnings</button></template>
        </aside>
      </div>

      <div class="metrics-grid">
        <article v-for="metric in metrics" :key="metric.key" class="liquid-card metric-card"><span class="section-label"><Icon :name="metric.icon" />{{ metric.label }}</span><p class="metric-value">{{ number(metric.value, 1) }}<small>{{ metric.unit === 'μg/m^3' ? 'μg/m³' : metric.unit }}</small></p><p class="metric-note">{{ metric.additionalInfo || metric.severity || 'No additional information' }}</p></article>
      </div>

      <article class="liquid-card hourly-card">
        <div class="section-heading"><h2><Icon name="clock" /> Hourly forecast</h2><span class="subtle">Next {{ forecast.hourly_forecast?.length || 0 }} hours · MYT</span></div>
        <div v-if="forecast.hourly_forecast?.length" class="hourly-scroll" tabindex="0" aria-label="Hourly forecast, scroll for more hours">
          <div v-for="(hour, index) in forecast.hourly_forecast" :key="hour.time" class="hour-item" :class="{ 'first-hour': index === 0 }"><span class="hour-time">{{ formatTime(hour.time) }}</span><span class="hour-date">{{ formatDate(hour.time) }}</span><WeatherIcon :condition="hour.icon" /><span class="sr-only">{{ conditionLabel(hour.icon) }}</span><strong>{{ number(hour.temp) }}°</strong><span class="hour-rain"><Icon name="drop" />{{ number(hour.precip, 1) }} mm</span></div>
        </div>
        <p v-else class="empty-message">Hourly forecasts are unavailable for this location.</p>
      </article>

      <div class="forecast-bottom-grid">
        <article class="liquid-card daily-card"><div class="section-heading"><h2><Icon name="sun" /> {{ forecast.daily_forecast?.length || 7 }}-day outlook</h2><span class="subtle">Morning · Afternoon · Evening</span></div>
          <div v-if="forecast.daily_forecast?.length" class="daily-list"><details v-for="day in forecast.daily_forecast" :key="day.date" class="daily-item"><summary><span class="day-name">{{ formatDate(day.date, { weekday: 'short' }) }}</span><WeatherIcon :condition="day.icon" /><span class="day-condition">{{ day.weather?.summary || conditionLabel(day.icon) }}</span><span class="day-range"><span>{{ number(day.minTemp) }}°</span><strong>{{ number(day.maxTemp) }}°</strong></span><Icon name="chevron" class="daily-chevron" /></summary><div class="day-periods"><span><small>Morning</small>{{ day.weather?.morn || '—' }}</span><span><small>Afternoon</small>{{ day.weather?.noon || '—' }}</span><span><small>Evening</small>{{ day.weather?.even || '—' }}</span></div></details></div><p v-else class="empty-message">Daily forecasts are unavailable for this location.</p>
        </article>
        <article class="liquid-card astronomy-card"><div class="section-heading"><h2><Icon name="sunrise" /> Sun & moon</h2></div><div class="sun-times"><div><Icon name="sunrise" /><span>Sunrise</span><strong>{{ formatTime(forecast.astronomy?.sun?.sunrise) }}</strong></div><div><Icon name="sunset" /><span>Sunset</span><strong>{{ formatTime(forecast.astronomy?.sun?.sunset) }}</strong></div></div><div class="sun-additional"><span>Dawn <strong>{{ formatTime(forecast.astronomy?.sun?.dawn) }}</strong></span><span>Dusk <strong>{{ formatTime(forecast.astronomy?.sun?.dusk) }}</strong></span></div><div class="moon-detail"><Icon name="moon" /><div><span>Moon phase</span><h3>{{ moon?.phaseName || 'Unavailable' }}</h3><p v-if="moon?.fraction != null">{{ number(moon.fraction * 100) }}% illuminated</p></div></div><p class="subtle">All times in Malaysia Time (UTC+8).</p></article>
      </div>
    </template>
  </section>
</template>
