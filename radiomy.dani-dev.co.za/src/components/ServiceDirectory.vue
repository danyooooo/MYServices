<script setup>
import { onBeforeUnmount, ref } from 'vue'

defineProps({ current: { type: String, required: true } })

const services = [
  { id: 'radio', name: 'RadioMY', description: 'Radio & TV', url: 'https://radiomy.dani-dev.co.za/' },
  { id: 'weather', name: 'WeatherMY', description: 'Forecasts & alerts', url: 'https://weathermy.dani-dev.co.za/' },
  { id: 'music', name: 'MusicMY', description: 'Music metadata', url: 'https://musicmy.dani-dev.co.za/' },
  { id: 'transport', name: 'TransportMY', description: 'Transit & roads', url: 'https://transportmy.dani-dev.co.za/' },
]

const root = ref(null)
const open = ref(false)

function closeOutside(event) {
  if (!root.value?.contains(event.target)) open.value = false
}
function onKeydown(event) {
  if (event.key !== 'Escape' || !open.value) return
  open.value = false
  root.value?.querySelector('button')?.focus()
}

document.addEventListener('pointerdown', closeOutside)
document.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="service-directory">
    <button type="button" class="service-directory-trigger" :aria-expanded="open" aria-controls="service-directory-menu" aria-haspopup="true" @click="open = !open">
      Directory <span class="service-directory-chevron" aria-hidden="true">⌄</span>
    </button>
    <nav v-if="open" id="service-directory-menu" class="service-directory-menu" aria-label="Malaysian services">
      <span class="service-directory-heading">Malaysian services</span>
      <a v-for="service in services" :key="service.id" :href="service.url" :aria-current="current === service.id ? 'page' : undefined">
        <span class="service-directory-name">{{ service.name }}<small v-if="current === service.id">Current</small></span>
        <span class="service-directory-description">{{ service.description }}</span>
      </a>
    </nav>
  </div>
</template>

<style scoped>
.service-directory{position:relative;flex-shrink:0;pointer-events:auto}
.service-directory-trigger{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:8px 15px;border:1px solid #ffffff26;border-radius:999px;background:#ffffff14;color:#f5f7fa;font:inherit;font-size:.85rem;font-weight:650;white-space:nowrap;cursor:pointer}
.service-directory-trigger:hover,.service-directory-trigger[aria-expanded="true"]{background:#ffffff26}
.service-directory-trigger:focus-visible,.service-directory-menu a:focus-visible{outline:2px solid #e8c18e;outline-offset:2px}
.service-directory-chevron{font-size:1.05rem;line-height:1;transition:transform .2s ease}
.service-directory-trigger[aria-expanded="true"] .service-directory-chevron{transform:rotate(180deg)}
.service-directory-menu{position:absolute;z-index:200;top:calc(100% + 12px);right:0;display:grid;gap:4px;width:min(270px,calc(100vw - 32px));padding:10px;border:1px solid #ffffff2b;border-radius:18px;background:#151a26f5;box-shadow:0 20px 45px #000b,inset 0 1px 0 #ffffff25;backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%)}
.service-directory-heading{padding:6px 10px 8px;color:#aab4c2;font-size:.68rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
.service-directory-menu a{display:flex;flex-direction:column;gap:3px;padding:10px 11px;border:1px solid transparent;border-radius:11px;color:#f5f7fa;text-decoration:none}
.service-directory-menu a:hover,.service-directory-menu a[aria-current="page"]{border-color:#ffffff23;background:#ffffff12}
.service-directory-name{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:.87rem;font-weight:750}
.service-directory-name small{color:#e8c18e;font-size:.64rem;font-weight:700}
.service-directory-description{color:#aab4c2;font-size:.72rem}
@media(max-width:480px){.service-directory-trigger{min-height:38px;padding:7px 11px;font-size:.75rem}.service-directory-menu{top:calc(100% + 10px)}}
</style>
