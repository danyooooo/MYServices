<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { resolveWeatherScene } from '../lib/weatherScene'
import { createWeatherRenderer } from '../lib/weatherRenderer'

const props = defineProps({ forecast: Object, now: Number })
const canvas = ref(null)
const scene = computed(() => resolveWeatherScene(props.forecast, props.now))
let renderer
let resizeObserver
let motionPreference

function syncMotion() {
  if (!motionPreference) return
  renderer?.setMotion(scene.value.kind !== 'neutral' && !motionPreference.matches && !document.hidden)
}

watch(scene, value => {
  renderer?.setScene(value)
  syncMotion()
})

onMounted(() => {
  renderer = createWeatherRenderer(canvas.value)
  renderer.setScene(scene.value)
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionPreference.addEventListener('change', syncMotion)
  document.addEventListener('visibilitychange', syncMotion)
  resizeObserver = new ResizeObserver(() => renderer.resize())
  resizeObserver.observe(canvas.value)
  syncMotion()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  motionPreference?.removeEventListener('change', syncMotion)
  document.removeEventListener('visibilitychange', syncMotion)
  renderer?.destroy()
})
</script>

<template>
  <div class="weather-background" :class="[`weather-background--${scene.kind}`, { 'weather-background--night': scene.night }]" :data-condition="scene.kind" :data-night="scene.night" aria-hidden="true">
    <canvas ref="canvas"></canvas>
    <div class="weather-background-shade"></div>
  </div>
</template>

<style scoped>
.weather-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: #101c2a;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.weather-background-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #06101b30, #06101b55 48%, #06101b80);
}
</style>
