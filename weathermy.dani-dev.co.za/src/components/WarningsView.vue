<script setup>
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { formatDate, formatTime, number, warningBody, warningExpiry, warningIssued, warningStatus, warningTitle } from '../lib/weather'

const props = defineProps({ alerts: Object, loading: Boolean, error: String, updated: String, now: Number })
const emit = defineEmits(['retry'])
const filter = ref('current')
const warnings = computed(() => (props.alerts?.warnings || []).filter(w => filter.value === 'all' || warningStatus(w, props.now) !== 'ended'))
const statusLabels = { active: 'Active', scheduled: 'Upcoming', ended: 'Ended', notice: 'Notice' }
</script>

<template>
  <section aria-labelledby="warnings-title">
    <div class="view-heading"><div><span class="eyebrow">Stay informed</span><h2 id="warnings-title">Warnings & notices</h2><p>Official notices for land and Malaysian waters.</p></div><button class="liquid-btn liquid-btn-glass" :disabled="loading" @click="emit('retry')"><Icon name="refresh" :class="{ spinning: loading }" />Refresh</button></div>
    <div class="filter-row"><div class="segmented-control" aria-label="Warning period"><button :aria-pressed="filter === 'current'" :class="{ active: filter === 'current' }" @click="filter = 'current'">Current notices</button><button :aria-pressed="filter === 'all'" :class="{ active: filter === 'all' }" @click="filter = 'all'">All returned notices</button></div><span v-if="updated" class="subtle">Last checked {{ formatTime(updated) }} MYT</span></div>
    <div v-if="error" class="liquid-card error-panel" role="alert"><Icon name="alert" /><h3>Warnings unavailable</h3><p>{{ error }}</p><button class="liquid-btn liquid-btn-glass" @click="emit('retry')">Try again</button></div>
    <p v-else-if="loading" class="liquid-card loading-panel" role="status">Checking the latest warnings…</p>
    <template v-else-if="alerts">
      <div v-if="warnings.length" class="warnings-list"><article v-for="warning in warnings" :key="warning.id" class="liquid-card warning-card"><div class="card-topline"><span class="warning-status" :class="warningStatus(warning, now)"><Icon name="alert" />{{ statusLabels[warningStatus(warning, now)] }}</span><span class="subtle">{{ warning.warningLocation?.includes('LAND') ? 'Land' : warning.warningLocation === 'COASTAL' ? 'Coastal & shipping' : warning.warningLocation || 'National' }}</span></div><h3>{{ warningTitle(warning) }}</h3><p class="warning-issued">Issued {{ formatDate(warningIssued(warning)) }} · {{ formatTime(warningIssued(warning)) }} MYT<span v-if="warningExpiry(warning)"> · Until {{ formatDate(warningExpiry(warning)) }} {{ formatTime(warningExpiry(warning)) }}</span></p><div class="warning-body"><p v-for="(paragraph, index) in warningBody(warning)" :key="index">{{ paragraph }}</p></div><p v-if="warning.reference" class="warning-reference">Reference: {{ warning.reference }}</p></article></div>
      <div v-else class="liquid-card empty-panel"><Icon name="alert" /><h3>No current notices</h3><p>No active or upcoming warnings were returned at the last check.</p></div>
      <article v-if="alerts.earthquakes?.length" class="liquid-card earthquake-card"><div class="section-heading"><h2>Recent earthquakes</h2><span class="subtle">Regional events</span></div><div class="earthquake-list"><div v-for="quake in alerts.earthquakes" :key="quake.eventId" class="earthquake-row"><div class="magnitude"><small>Magnitude</small><strong>{{ number(quake.magnitude, 1) }}</strong></div><div><h3>{{ quake.locationName }}</h3><p>{{ formatDate(quake.utcDatetime) }} · {{ formatTime(quake.utcDatetime) }} MYT</p><span class="subtle">Depth {{ number(quake.depthKm) }} km · {{ quake.status }}</span></div></div></div></article>
    </template>
  </section>
</template>
