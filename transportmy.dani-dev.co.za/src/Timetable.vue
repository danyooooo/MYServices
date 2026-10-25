<script setup>
import { computed } from 'vue'
const props = defineProps({ table: { type: Object, default: null }, day: { type: String, default: '' } })
const groups = computed(() => {
  const entries = props.table?.timeTables || []
  if (!props.day) return entries
  const marker = { WD: 'MON', SA: 'SAT', SU: 'SUN' }[props.day]
  return entries.filter(entry => entry.operationDays?.includes(marker))
})
</script>

<template>
  <div v-if="groups.length" class="timetable-list">
    <div v-for="(entry, index) in groups" :key="index" class="timetable-group">
      <strong>{{ entry.operationDays || 'Operating days' }}</strong>
      <div v-if="entry.outboundDepartureTimes?.length">
        <small>From {{ table.outboundFirstBusStop || 'first stop' }}</small>
        <div class="time-grid"><span v-for="(time, i) in entry.outboundDepartureTimes" :key="i">{{ time }}</span></div>
      </div>
      <div v-if="entry.inboundDepartureTimes?.length">
        <small>Inbound departures</small>
        <div class="time-grid"><span v-for="(time, i) in entry.inboundDepartureTimes" :key="i">{{ time }}</span></div>
      </div>
    </div>
  </div>
  <div v-else class="state-card">No departure times were returned.</div>
</template>
