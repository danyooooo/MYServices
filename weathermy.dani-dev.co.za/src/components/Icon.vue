<script setup>
defineProps({ name: String })
const paths = {
  search: ['m21 21-4.4-4.4', 'M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
  pin: ['M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0', 'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  refresh: ['M20 7v5h-5', 'M4 17v-5h5', 'M6.5 6.5A8 8 0 0 1 20 12', 'M4 12a8 8 0 0 0 13.5 5.5'],
  wind: ['M3 8h12a3 3 0 1 0-3-3', 'M2 12h17a3 3 0 1 1-3 3', 'M4 16h5a3 3 0 1 1-3 3'],
  cyclone: ['M12 12c-3-5-10-2-9 3 1 6 9 6 10 1 1-4-4-5-5-2-1 3 3 4 6 2 3-2 3-7 0-10', 'M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0'],
  drop: ['M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12'],
  sun: ['M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'],
  sunrise: ['M3 19h18M2 15h3m14 0h3M7 15a5 5 0 0 1 10 0M12 2v7m-3-3 3-3 3 3M4 7l2 2m12 0 2-2'],
  sunset: ['M3 19h18M2 15h3m14 0h3M7 15a5 5 0 0 1 10 0M12 2v7m-3-3 3 3 3-3M4 7l2 2m12 0 2-2'],
  moon: ['M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14'],
  alert: ['m12 3 10 18H2L12 3', 'M12 9v4m0 4h.01'],
  map: ['m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z', 'M9 3v15m6-12v15'],
  news: ['M4 4h16v17H4z', 'M8 8h8m-8 4h8m-8 4h5'],
  chevron: ['m9 5 7 7-7 7'],
  close: ['m6 6 12 12M6 18 18 6'],
  air: ['M4 7h16M7 12h10M4 17h16'],
  clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M12 7v5l3 2'],
  wave: ['M2 7c3-3 5 3 8 0s5 3 8 0 3 0 4 0M2 12c3-3 5 3 8 0s5 3 8 0 3 0 4 0M2 17c3-3 5 3 8 0s5 3 8 0 3 0 4 0'],
}
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(path, index) in paths[name] || paths.sun" :key="index" :d="path" />
  </svg>
</template>
