<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { api } from '../lib/api'
import { nearestForecastArea, placeContext, placeType, searchCatalog } from '../lib/weather'
import Icon from './Icon.vue'

const props = defineProps({ catalog: Array, lookup: Map, loading: Boolean, error: String })
const emit = defineEmits(['select', 'retry'])
const query = ref('')
const open = ref(false)
const searching = ref(false)
const searchError = ref('')
const remoteResults = ref([])
const activeIndex = ref(-1)
const localResults = computed(() => searchCatalog(props.catalog, query.value))
const results = computed(() => localResults.value.length ? localResults.value.map(place => ({ place })) : remoteResults.value)
let controller

function changed() {
  controller?.abort()
  searching.value = false
  searchError.value = ''
  remoteResults.value = []
  activeIndex.value = -1
  open.value = true
}

function choose(result) {
  controller?.abort()
  searching.value = false
  emit('select', result.place)
  query.value = ''
  remoteResults.value = []
  open.value = false
}

async function submit() {
  if (searching.value) return
  if (activeIndex.value >= 0 && results.value[activeIndex.value]) return choose(results.value[activeIndex.value])
  if (localResults.value.length) return choose({ place: localResults.value[0] })
  if (query.value.trim().length < 2 || props.loading || props.error) return
  controller?.abort()
  const current = new AbortController()
  controller = current
  searching.value = true
  searchError.value = ''
  open.value = true
  try {
    const data = await api.search(query.value.trim(), current.signal)
    if (current.signal.aborted) return
    const unique = new Set()
    remoteResults.value = (Array.isArray(data) ? data : []).map(item => ({ place: nearestForecastArea(props.catalog, item.lat, item.lon), near: item.name }))
      .filter(item => item.place && !unique.has(item.place.id) && unique.add(item.place.id)).slice(0, 6)
    if (!remoteResults.value.length) searchError.value = 'No forecast areas found. Try a nearby town or district.'
  } catch (error) {
    if (!current.signal.aborted) searchError.value = 'Place search is unavailable. Please try a town or district name.'
  } finally {
    if (controller === current) searching.value = false
  }
}

function move(direction) {
  open.value = true
  if (!results.value.length) return
  activeIndex.value = (activeIndex.value + direction + results.value.length) % results.value.length
}

function leave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) open.value = false
}

onUnmounted(() => controller?.abort())
</script>

<template>
  <div class="location-search" @focusout="leave">
    <form class="search-form" role="search" @submit.prevent="submit">
      <Icon name="search" />
      <label class="sr-only" for="location-search">Search Malaysian locations</label>
      <input id="location-search" v-model="query" role="combobox" autocomplete="off" placeholder="Search a town or district…"
        :aria-expanded="open && query.trim().length > 0" aria-controls="location-results" aria-autocomplete="list"
        :aria-activedescendant="activeIndex >= 0 ? `location-result-${activeIndex}` : undefined"
        @input="changed" @focus="open = true" @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.esc.prevent="open = false" />
      <button class="search-submit" type="submit" :disabled="loading || query.trim().length < 2" :aria-disabled="searching" :aria-busy="searching" aria-label="Search locations"><Icon :name="searching ? 'refresh' : 'chevron'" :class="{ spinning: searching }" /></button>
    </form>
    <div v-if="open && query.trim().length" class="search-popover">
      <p v-if="loading" class="search-message" role="status">Loading locations…</p>
      <div v-else-if="error" class="search-message"><p>{{ error }}</p><button class="text-button" @click="emit('retry')">Try again</button></div>
      <p v-else-if="searching" class="search-message" role="status">Finding a forecast area…</p>
      <ul v-else-if="results.length" id="location-results" role="listbox" aria-label="Location results">
        <li v-for="(result, index) in results" :id="`location-result-${index}`" :key="result.place.id" role="option" :aria-selected="index === activeIndex">
          <button type="button" :class="{ highlighted: activeIndex === index }" @click="choose(result)">
            <Icon name="pin" /><span><strong>{{ result.place.name }}</strong><small>{{ result.near ? `Nearest forecast area to ${result.near}` : `${placeType(result.place)} · ${placeContext(result.place, lookup)}` }}</small></span>
          </button>
        </li>
      </ul>
      <p v-else class="search-message" role="status">{{ searchError || 'Press Enter to search nearby forecast areas.' }}</p>
    </div>
  </div>
</template>
