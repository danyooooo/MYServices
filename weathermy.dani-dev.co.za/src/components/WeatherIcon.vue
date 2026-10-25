<script setup>
import { computed } from 'vue'
const props = defineProps({ condition: String })
const night = computed(() => props.condition?.includes('night'))
const cloudy = computed(() => /cloud|rain|storm|fog|haze/.test(props.condition || ''))
const rain = computed(() => /rain|storm/.test(props.condition || ''))
const storm = computed(() => /storm/.test(props.condition || ''))
</script>

<template>
  <svg viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="night">
      <path d="M41 9a17 17 0 0 0 15 24A19 19 0 1 1 41 9Z" fill="#c4c8fa" stroke="#e0e4ff" stroke-width="1.5" />
    </template>
    <template v-else>
      <circle cx="28" cy="25" r="12" fill="#fbbf24" stroke="#fde68a" stroke-width="1.5" />
      <path d="M28 5v3m0 34v3M8 25h3m34 0h3M14 11l2 2m24 24 2 2M14 39l2-2m24-24 2-2" stroke="#fbbf24" stroke-width="2" />
    </template>
    <path v-if="cloudy" d="M17 45a9 9 0 0 1-1-18 14 14 0 0 1 27-2 10 10 0 0 1 4 20H17Z" fill="#c7d8eb" stroke="#edf5ff" stroke-width="1.5" />
    <path v-if="rain && !storm" d="m21 51-3 6m15-6-3 6m15-6-3 6" stroke="#38bdf8" stroke-width="3" />
    <path v-if="storm" d="m33 43-7 11h8l-5 8 15-14h-9l4-5" fill="#fbbf24" stroke="#fde68a" stroke-width="1" />
  </svg>
</template>
