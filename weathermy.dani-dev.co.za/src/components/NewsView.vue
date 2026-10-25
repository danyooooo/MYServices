<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { api } from '../lib/api'
import { newsUrl } from '../lib/weather'
import Icon from './Icon.vue'

const news = ref([])
const loading = ref(false)
const error = ref('')
let controller

async function load() {
  controller?.abort()
  const current = new AbortController()
  controller = current
  loading.value = true
  error.value = ''
  try {
    const data = await api.news(current.signal)
    if (current.signal.aborted) return
    if (!Array.isArray(data?.media)) throw new Error('News unavailable')
    news.value = data.media
  } catch (err) {
    if (!current.signal.aborted) error.value = 'We couldn’t load the press releases. Please try again.'
  } finally {
    if (controller === current) loading.value = false
  }
}

onMounted(load)
onUnmounted(() => controller?.abort())
</script>

<template>
  <section aria-labelledby="news-title">
    <div class="view-heading"><div><span class="eyebrow">From MET Malaysia</span><h2 id="news-title">Press releases</h2><p>The latest statements and updates, published in Bahasa Malaysia.</p></div><button class="liquid-btn liquid-btn-glass" :disabled="loading" @click="load"><Icon name="refresh" :class="{ spinning: loading }" />Refresh</button></div>
    <p v-if="loading" class="liquid-card loading-panel" role="status">Loading press releases…</p>
    <div v-else-if="error" class="liquid-card error-panel" role="alert"><Icon name="news" /><h3>Press releases unavailable</h3><p>{{ error }}</p><button class="liquid-btn liquid-btn-glass" @click="load">Try again</button></div>
    <div v-else-if="news.length" class="news-list"><article v-for="(item, index) in news" :key="item.path" class="liquid-card news-card"><span class="news-number">{{ (index + 1).toString().padStart(2, '0') }}</span><div><span class="section-label" lang="ms">{{ item.date.trim() }}</span><h3 lang="ms">{{ item.title.trim() }}</h3><a v-if="newsUrl(item.path)" class="text-button" :href="newsUrl(item.path)" target="_blank" rel="noopener noreferrer">Read press release <span class="document-label">PDF</span><span class="sr-only"> — opens in a new tab</span></a><p v-else class="subtle">Document link unavailable.</p></div><Icon name="news" class="news-icon" /></article></div>
    <div v-else class="liquid-card empty-panel"><Icon name="news" /><h3>No press releases available</h3><p>Check back for the latest official statements.</p></div>
  </section>
</template>
