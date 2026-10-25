<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { displayGenres, getMusic, recordArtist, recordTitle, safeWebUrl } from './api/music'
import ServiceDirectory from './ServiceDirectory.vue'

const searchTypes = [
  { id: 'track', label: 'Tracks' },
  { id: 'artist', label: 'Artists' },
  { id: 'album', label: 'Albums' },
]
const suggestions = [
  { label: 'Yuna', type: 'artist' },
  { label: 'Siti Nurhaliza', type: 'artist' },
  { label: '24K Magic', type: 'track' },
]
const pageSize = 12
const query = ref('')
const activeType = ref('track')
const submittedQuery = ref('')
const submittedType = ref('track')
const showingCharts = ref(true)
const searched = ref(false)
const searching = ref(false)
const searchError = ref('')
const results = ref([])
const totalResults = ref(0)
const chartTracks = ref([])
const chartsLoading = ref(false)
const chartsError = ref('')
const selected = ref(null)
const detailRecord = ref(null)
const detailSource = ref('')
const detailLoading = ref(false)
const detailError = ref('')
const copyLabel = ref('Copy metadata')
let searchController
let chartController
let detailController

const visibleItems = computed(() => showingCharts.value ? chartTracks.value : results.value)
const visibleType = computed(() => showingCharts.value ? 'track' : submittedType.value)
const canLoadMore = computed(() => !showingCharts.value && results.value.length > 0 && results.value.length < totalResults.value)

function itemKey(item, index) {
  return item?.lfid || item?.id || item?.slug || `${recordTitle(item, visibleType.value)}-${index}`
}

function itemSubtitle(item, type) {
  if (type === 'artist') return displayGenres(item.genres) || 'Artist record'
  if (type === 'album') return recordArtist(item) || 'Album record'
  return recordArtist(item) || 'Track record'
}

function itemInitial(item, type) {
  return (recordTitle(item, type) || '?').trim().charAt(0).toUpperCase()
}

function setSearchType(type) {
  if (activeType.value === type) return
  activeType.value = type
  if (searched.value && query.value.trim()) runSearch()
}

function searchSuggestion(suggestion) {
  query.value = suggestion.label
  activeType.value = suggestion.type
  runSearch()
}

async function runSearch(append = false) {
  const term = append ? submittedQuery.value : query.value.trim()
  if (!term) {
    searchError.value = 'Enter a song, artist, or album to search.'
    return
  }
  searchController?.abort()
  const controller = new AbortController()
  searchController = controller
  const type = append ? submittedType.value : activeType.value
  const offset = append ? results.value.length : 0
  showingCharts.value = false
  searched.value = true
  searching.value = true
  searchError.value = ''
  if (!append) {
    submittedQuery.value = term
    submittedType.value = type
    results.value = []
    totalResults.value = 0
    selected.value = null
    detailRecord.value = null
    detailController?.abort()
  }
  try {
    const data = await getMusic('search', {
      query: term,
      searchtype: type,
      country: 'MY',
      limit: pageSize,
      offset,
    }, controller.signal)
    if (searchController !== controller) return
    const key = { track: 'tracks', artist: 'artists', album: 'albums' }[type]
    const page = Array.isArray(data[key]) ? data[key] : []
    results.value = append ? [...results.value, ...page] : page
    totalResults.value = Number(data.totalresults) || results.value.length
  } catch (error) {
    if (error.name !== 'AbortError') searchError.value = error.message
  } finally {
    if (searchController === controller) searching.value = false
  }
}

async function loadCharts() {
  chartController?.abort()
  const controller = new AbortController()
  chartController = controller
  chartsLoading.value = true
  chartsError.value = ''
  try {
    const data = await getMusic('charts', { reqtype: 'trackcharts', country: 'MY', limit: 8 }, controller.signal)
    if (chartController !== controller) return
    chartTracks.value = Array.isArray(data.tracks) ? data.tracks : []
  } catch (error) {
    if (error.name !== 'AbortError') chartsError.value = error.message
  } finally {
    if (chartController === controller) chartsLoading.value = false
  }
}

function showCharts() {
  showingCharts.value = true
  searchError.value = ''
  if (!chartTracks.value.length && !chartsLoading.value) loadCharts()
  document.getElementById('lookup')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function selectItem(item, type) {
  detailController?.abort()
  const controller = new AbortController()
  detailController = controller
  selected.value = { item, type }
  detailRecord.value = null
  detailSource.value = ''
  detailError.value = ''
  detailLoading.value = true
  copyLabel.value = 'Copy metadata'

  if (window.matchMedia('(max-width: 900px)').matches) {
    await nextTick()
    document.getElementById('details')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  try {
    let data
    if (type === 'track') {
      data = await getMusic('lyrics', {
        ...(item.slug ? { slug: item.slug } : item.lfid ? { trackid: item.lfid } : { q: `${item.title} ${recordArtist(item)}` }),
        country: 'MY',
      }, controller.signal)
      if (!data.track) throw new Error('Detailed track metadata is unavailable.')
      detailRecord.value = data.track
    } else if (type === 'artist') {
      data = await getMusic('metadata', { reqtype: 'artistdata', artist: item.name, country: 'MY' }, controller.signal)
      if (!data.artist) throw new Error('Detailed artist metadata is unavailable.')
      detailRecord.value = data.artist
    } else {
      data = await getMusic('metadata', {
        reqtype: 'albumdata',
        album: item.title,
        artist: recordArtist(item),
        country: 'MY',
      }, controller.signal)
      if (!data.album) throw new Error('Detailed album metadata is unavailable.')
      detailRecord.value = data.album
    }
    if (detailController === controller) detailSource.value = data.metadataSource || ''
  } catch (error) {
    if (error.name !== 'AbortError' && detailController === controller) detailError.value = error.message
  } finally {
    if (detailController === controller) detailLoading.value = false
  }
}

function addField(fields, label, value, url = '') {
  if (value === undefined || value === null || value === '') return
  if (Array.isArray(value) && !value.length) return
  fields.push({ label, value: Array.isArray(value) ? value.join(', ') : String(value), url: safeWebUrl(url) })
}

function addLinkField(fields, label, value, url) {
  const safeUrl = safeWebUrl(url)
  if (safeUrl) addField(fields, label, value, safeUrl)
}

const detailView = computed(() => {
  if (!selected.value) return null
  const { type, item } = selected.value
  const record = detailRecord.value || item
  const fields = []
  const title = recordTitle(record, type) || recordTitle(item, type) || 'Untitled'
  const subtitle = type === 'artist' ? 'Artist metadata' : recordArtist(record) || recordArtist(item) || `${type} metadata`
  let description = ''

  if (type === 'track') {
    const album = record.album || item.album || {}
    const artist = record.artist || {}
    addField(fields, 'Artist', recordArtist(record) || recordArtist(item))
    addField(fields, 'Album', album.title)
    addField(fields, 'Duration', record.duration || item.duration)
    addField(fields, 'Language', record.language || item.language)
    addField(fields, 'Release year', album.releaseYear || album.year)
    addField(fields, 'Track ID', record.lfid || item.lfid)
    addField(fields, 'ISRC', Array.isArray(record.isrcs) ? record.isrcs.filter((value) => typeof value === 'string') : '')
    addField(fields, 'Slug', record.slug || item.slug)
    addField(fields, 'Album ID', album.id)
    addField(fields, 'Lyrics status', record.lyrics_status)
    addField(fields, 'Synced timing', record.synced_lyrics ? 'Available' : '')
    addField(fields, 'Cover source', record.coverArtSource || album.coverArtSource)
    addLinkField(fields, 'Cover URL', 'Open artwork ↗', record.coverArt || album.coverArt)
    addField(fields, 'Artist country', artist.country)
    addField(fields, 'Artist genres', displayGenres(artist.genres) || artist.genre)
    addLinkField(fields, 'Artist website', 'Visit website ↗', artist.website)
    addLinkField(fields, 'LyricFind page', 'Open source ↗', record.lyricfind_url)
  } else if (type === 'artist') {
    addField(fields, 'Artist ID', record.lfid || record.id || item.lfid)
    addField(fields, 'Slug', record.slug || item.slug)
    addField(fields, 'Genres', displayGenres(record.genres) || record.genre || displayGenres(item.genres))
    addField(fields, 'Country', record.country)
    addLinkField(fields, 'Website', 'Visit website ↗', record.website)
    addField(fields, 'Image source', record.imageSource)
    addField(fields, 'Image attribution', record.imageAttribution)
    addField(fields, 'Image license', record.imageLicense)
    addLinkField(fields, 'Image page', 'View source ↗', record.imagePageUrl)
    description = typeof record.biography === 'string' ? record.biography : ''
  } else {
    addField(fields, 'Artist', recordArtist(record) || recordArtist(item))
    addField(fields, 'Release year', record.releaseYear || record.year || item.releaseYear)
    addField(fields, 'Release date', record.releaseDate)
    addField(fields, 'Genres', displayGenres(record.genres) || record.genre || displayGenres(item.genres))
    addField(fields, 'Album type', record.albumType)
    addField(fields, 'Total tracks', record.totalTracks)
    addField(fields, 'Label', record.label)
    addField(fields, 'UPC', record.upc)
    addField(fields, 'Album ID', record.id || item.id)
    addField(fields, 'Slug', record.slug || item.slug)
    addField(fields, 'Cover source', record.coverArtSource)
    addLinkField(fields, 'Cover URL', 'Open artwork ↗', record.coverArt || item.coverArt)
  }

  return { type, title, subtitle, fields, description }
})

async function copyMetadata() {
  if (!detailView.value) return
  const { type, title, subtitle, fields, description } = detailView.value
  const metadata = {
    type,
    title,
    subtitle,
    ...(description ? { description } : {}),
    ...Object.fromEntries(fields.map((field) => [field.label, field.url || field.value])),
  }
  try {
    await navigator.clipboard.writeText(JSON.stringify(metadata, null, 2))
    copyLabel.value = 'Copied!'
  } catch {
    copyLabel.value = 'Copy unavailable'
  }
  window.setTimeout(() => { copyLabel.value = 'Copy metadata' }, 2200)
}

onMounted(loadCharts)
onUnmounted(() => {
  searchController?.abort()
  chartController?.abort()
  detailController?.abort()
})
</script>

<template>
  <div class="app-root">
    <div class="ambient" aria-hidden="true"><span class="orb orb-one"></span><span class="orb orb-two"></span><span class="orb orb-three"></span></div>
    <a class="skip-link" href="#main">Skip to content</a>

    <header class="header-wrapper">
      <div class="pill-dock">
        <a class="dock-brand" href="/" aria-label="MusicMY home">
          <span class="brand-bubble" aria-hidden="true">♪</span>
          <span>Music<span class="brand-accent">MY</span></span>
        </a>
        <nav class="dock-nav" aria-label="MusicMY navigation">
          <a href="#lookup">Search</a>
          <button type="button" @click="showCharts">Charts</button>
        </nav>
        <ServiceDirectory current="music" />
      </div>
    </header>

    <main id="main" class="main-content">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow"><span class="eyebrow-line"></span> Music metadata, made easy</span>
          <h1>Find the details <span>behind the music.</span></h1>
          <p>Look up track, artist, and album records in one place. Search by name, inspect the fields, and copy the metadata you need.</p>
          <div class="hero-pills"><span>MY region</span><span>Tracks · Artists · Albums</span><span>Powered by Malaysian API</span></div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="record record-back"><div class="record-label"></div></div>
          <div class="record record-front"><div class="record-label"><span>Music<br>MY</span></div></div>
          <div class="art-note">♫</div>
        </div>
      </section>

      <section id="lookup" class="lookup-section">
        <div class="section-intro"><span class="section-kicker">Explore the catalogue</span><h2>Search music metadata</h2><p>Choose a record type, then enter a title or name.</p></div>
        <div class="search-shell liquid-card">
          <div class="type-switch" role="group" aria-label="Search record type">
            <button v-for="type in searchTypes" :key="type.id" type="button" :class="{ active: activeType === type.id }" :aria-pressed="activeType === type.id" @click="setSearchType(type.id)">{{ type.label }}</button>
          </div>
          <form class="search-form" @submit.prevent="runSearch()">
            <label class="sr-only" for="music-query">Search music metadata</label>
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input id="music-query" v-model="query" type="search" autocomplete="off" :placeholder="`Search ${activeType === 'artist' ? 'artists' : activeType === 'album' ? 'albums' : 'tracks'}…`" />
            <button class="search-button" type="submit" :disabled="searching">{{ searching ? 'Searching…' : 'Search' }} <span aria-hidden="true">→</span></button>
          </form>
          <div class="search-hints"><span>Try</span><button v-for="hint in suggestions" :key="hint.label" type="button" @click="searchSuggestion(hint)">{{ hint.label }}</button></div>
        </div>
      </section>

      <div class="content-grid">
        <section id="charts" class="results-panel liquid-card" aria-labelledby="results-title">
          <div class="panel-heading">
            <div><span class="section-kicker">{{ showingCharts ? 'Discover' : 'Catalogue search' }}</span><h2 id="results-title">{{ showingCharts ? 'MY chart feed' : `${searchTypes.find((type) => type.id === submittedType)?.label} results` }}</h2></div>
            <span class="result-count">{{ showingCharts ? chartTracks.length ? `${chartTracks.length} records` : 'MY region' : searched ? `${totalResults.toLocaleString()} found` : '' }}</span>
          </div>
          <p class="panel-description">{{ showingCharts ? 'Browse current chart records or search for something specific.' : `Results for “${submittedQuery}”` }}</p>

          <div v-if="showingCharts && chartsLoading" class="state-card" role="status">Loading chart records…</div>
          <div v-else-if="showingCharts && chartsError" class="state-card error" role="alert">{{ chartsError }} <button type="button" @click="loadCharts">Retry</button></div>
          <div v-else-if="!showingCharts && searching && !results.length" class="state-card" role="status">Searching the catalogue…</div>
          <div v-else-if="!showingCharts && searchError && !results.length" class="state-card error" role="alert">{{ searchError }} <button v-if="searched" type="button" @click="runSearch()">Retry</button></div>
          <div v-else-if="!visibleItems.length" class="state-card">{{ showingCharts ? 'No chart records are available right now.' : 'No records found. Try another spelling or record type.' }}</div>
          <ol v-else class="result-list">
            <li v-for="(item, index) in visibleItems" :key="itemKey(item, index)">
              <button type="button" class="result-row" :class="{ selected: selected?.item === item }" @click="selectItem(item, visibleType)">
                <span class="result-number">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="result-art" aria-hidden="true">{{ itemInitial(item, visibleType) }}</span>
                <span class="result-copy"><strong>{{ recordTitle(item, visibleType) || 'Untitled' }}</strong><small>{{ itemSubtitle(item, visibleType) }}</small></span>
                <span class="result-trailing">{{ visibleType === 'track' ? item.duration || 'Track' : visibleType === 'album' ? item.releaseYear || 'Album' : 'Artist' }}</span>
                <span class="result-arrow" aria-hidden="true">↗</span>
              </button>
            </li>
          </ol>
          <p v-if="!showingCharts && searchError && results.length" class="inline-error" role="alert">{{ searchError }} <button type="button" @click="runSearch(true)">Retry</button></p>
          <button v-if="canLoadMore" type="button" class="load-more" :disabled="searching" @click="runSearch(true)">{{ searching ? 'Loading…' : 'Load more results' }}</button>
        </section>

        <aside id="details" class="details-panel liquid-card" aria-label="Selected metadata">
          <template v-if="detailView">
            <div class="detail-topline"><span class="section-kicker">{{ detailView.type }} record</span><button type="button" class="copy-button" @click="copyMetadata">{{ copyLabel }}</button></div>
            <div class="detail-identity"><span class="detail-art" aria-hidden="true">{{ detailView.title.charAt(0).toUpperCase() }}</span><div><h2>{{ detailView.title }}</h2><p>{{ detailView.subtitle }}</p></div></div>
            <p v-if="detailLoading" class="detail-status" role="status">Retrieving detailed metadata…</p>
            <p v-if="detailError" class="detail-status error" role="alert">{{ detailError }} Showing the fields from the search result.</p>
            <p v-if="detailSource" class="source-label">Metadata source: {{ detailSource }}</p>
            <p v-if="detailView.description" class="detail-description">{{ detailView.description }}</p>
            <dl class="field-list">
              <div v-for="field in detailView.fields" :key="field.label" class="field-row">
                <dt>{{ field.label }}</dt>
                <dd><a v-if="field.url" :href="field.url" target="_blank" rel="noopener noreferrer">{{ field.value }}</a><span v-else>{{ field.value }}</span></dd>
              </div>
            </dl>
            <p class="detail-footnote">Metadata varies by source and availability. Lyrics are not displayed here.</p>
          </template>
          <div v-else class="detail-empty">
            <span class="empty-symbol" aria-hidden="true">♫</span>
            <span class="section-kicker">Record details</span>
            <h2>Pick a record to inspect.</h2>
            <p>Choose a result to retrieve its track, artist, or album metadata.</p>
          </div>
        </aside>
      </div>
    </main>

    <footer class="footer-simplified">
      <div class="footer-bar">
        <div class="footer-left"><a class="footer-logo" href="/"><span class="footer-dot" aria-hidden="true"></span><span>Music<span class="brand-accent">MY</span></span></a><span class="footer-sep">•</span><a class="copyright" href="https://dani-dev.co.za/">&copy; {{ new Date().getFullYear() }} dani dev</a></div>
        <a class="powered-link" href="https://github.com/danyooooo/malaysian-api" target="_blank" rel="noopener noreferrer">Powered by malaysian-api <span aria-hidden="true">↗</span></a>
      </div>
    </footer>
  </div>
</template>
