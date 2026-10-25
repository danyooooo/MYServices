<template>
  <div class="space-y-10 pb-12 relative z-10">

    <!-- Top Navigation Breadcrumb & Back button -->
    <div class="flex items-center justify-between">
      <button 
        @click="$router.back()" 
        class="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full dani-panel text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>{{ t('back') }}</span>
      </button>

      <!-- Station Title Badge -->
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full dani-panel border border-[#fbbf2440]">
        <span class="badge-dot gold animate-pulse"></span>
        <span class="text-xs font-bold text-white uppercase tracking-wide">
          {{ stationName }}
        </span>
      </div>
    </div>

    <!-- AUDIO PLAYER LAYOUT (type === 'audio') -->
    <div v-if="isAudio" class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      
      <!-- Left Column: iFrame Player (Full Height) -->
      <div class="lg:col-span-2 flex flex-col w-full h-[200px] sm:h-[300px] lg:h-[540px] rounded-3xl dani-panel overflow-hidden shadow-2xl">
        <div class="relative w-full h-full bg-black/60 overflow-hidden">
          <iframe
            v-if="embedStatus === 'ready'"
            :src="iframeUrl"
            class="w-full h-full border-0" :title="mediaTitle"
            allowfullscreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          ></iframe>
          <div v-else class="h-full flex flex-col items-center justify-center p-8 text-center text-slate-300 text-sm gap-2" role="status">
            <strong>{{ embedStatus === 'loading' ? t('loadingPlayer') : embedStatus === 'unsupported' ? t('unsupportedEmbed') : t('noAudio') }}</strong>
            <span v-if="embedStatus === 'unsupported'">{{ t('unsupportedEmbedDetail') }}</span>
          </div>
        </div>
      </div>

      <!-- Right Column: Last Played Songs History List (Fixed matching height lg:h-[540px]) -->
      <div class="lg:col-span-1 flex flex-col w-full lg:h-[540px] rounded-3xl dani-panel p-5 sm:p-6 overflow-hidden">
        <!-- Header -->
        <div class="flex-shrink-0 flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-extrabold text-white">
              {{ t('recentSongs') }}
            </h3>
            <p class="text-sm text-slate-400">{{ t('recentSongsIntro') }}</p>
          </div>
          <button 
            @click="fetchMetadata" 
            class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10"
            :title="t('refreshMetadata')" :aria-label="t('refreshMetadata')"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <!-- History Loading State -->
        <div v-if="metadataLoading" class="flex-grow min-h-0 space-y-3">
          <div v-for="n in 5" :key="n" class="animate-pulse flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
            <div class="w-10 h-10 rounded-xl bg-white/10"></div>
            <div class="flex-grow space-y-2">
              <div class="h-3 bg-white/10 rounded w-3/4"></div>
              <div class="h-2 bg-white/10 rounded w-1/2"></div>
            </div>
          </div>
        </div>

        <!-- History List -->
        <div v-else-if="historyList.length > 0" class="flex-grow min-h-0 overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
          <div 
            v-for="(song, idx) in historyList" 
            :key="idx"
            class="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:border-[#fbbf2440] transition-colors"
          >
            <!-- Artwork -->
            <div class="w-10 h-10 rounded-xl bg-black/60 overflow-hidden flex-shrink-0 border border-white/10">
              <img 
                :src="song.artwork || currentArtwork" 
                :alt="song.title" 
                class="w-full h-full object-cover"
              />
            </div>

            <!-- Song details -->
            <div class="flex-grow min-w-0">
              <h4 class="text-xs font-bold text-slate-100 truncate">
                {{ song.title || t('unnamedSong') }}
              </h4>
              <p class="text-[11px] text-slate-400 truncate">
                {{ song.artist || stationName }}
              </p>
            </div>

            <!-- Time -->
            <span v-if="song.played_at" class="text-[10px] text-slate-400 font-mono flex-shrink-0">
              {{ formatTime(song.played_at) }}
            </span>
          </div>
        </div>

        <!-- Unsupported / Empty History Message -->
        <div v-else class="flex-grow flex items-center justify-center p-6 text-center text-xs text-slate-400 bg-white/5 rounded-2xl border border-white/5">
          {{ historyMessage || t('noHistory') }}
        </div>
      </div>

    </div>

    <!-- VIDEO / TV PLAYER LAYOUT (type !== 'audio') -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      
      <!-- Left Column: iFrame TV Player (Fixed matching height lg:h-[540px]) -->
      <div class="lg:col-span-2 flex flex-col w-full aspect-video lg:aspect-auto lg:h-[540px] rounded-3xl dani-panel overflow-hidden shadow-2xl">
        <div class="relative w-full h-full bg-black/80 flex items-center justify-center">
          <iframe
            v-if="embedStatus === 'ready'"
            :src="iframeUrl"
            class="w-full h-full border-0" :title="mediaTitle"
            allowfullscreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          ></iframe>

          <div v-else class="text-center p-8 space-y-4 max-w-md">
            <div class="w-16 h-16 mx-auto rounded-3xl bg-[#fbbf241f] border border-[#fbbf2440] flex items-center justify-center text-[#fbbf24]">
              <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">{{ embedStatus === 'loading' ? t('loadingPlayer') : embedStatus === 'unsupported' ? t('unsupportedEmbed') : t('noVideo') }}</h3>
              <p v-if="embedStatus === 'unsupported'" class="text-sm text-slate-400 mt-1">{{ t('unsupportedEmbedDetail') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: TV EPG Schedule Sidebar with Date Injection & Auto-Scroll -->
      <div class="lg:col-span-1 flex flex-col w-full lg:h-[540px] rounded-3xl dani-panel p-5 sm:p-6 overflow-hidden">
        <!-- Header -->
        <div class="flex-shrink-0 flex items-center justify-between mb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge-dot rose animate-pulse"></span>
              <h3 class="text-base font-extrabold text-white">
                {{ t('tvSchedule') }}
              </h3>
            </div>
            <p class="text-xs text-slate-400 font-mono mt-0.5">{{ getTodayDateString() }}</p>
          </div>
          <button 
            @click="fetchTvEpg" 
            class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10"
            :title="t('refreshSchedule')" :aria-label="t('refreshSchedule')"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <!-- TV EPG Loading state -->
        <div v-if="tvEpgLoading" class="flex-grow min-h-0 space-y-3">
          <div v-for="n in 5" :key="n" class="animate-pulse flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
            <div class="w-10 h-10 rounded-xl bg-white/10"></div>
            <div class="flex-grow space-y-2">
              <div class="h-3 bg-white/10 rounded w-3/4"></div>
              <div class="h-2 bg-white/10 rounded w-1/2"></div>
            </div>
          </div>
        </div>

        <!-- TV EPG Event List (Auto-scrolls to live / active event) -->
        <div 
          v-else-if="tvEpgEvents.length > 0" 
          ref="tvEpgContainerRef" 
          class="flex-grow min-h-0 overflow-y-auto space-y-3 pr-1.5 scrollbar-thin scroll-smooth"
        >
          <div 
            v-for="(ev, idx) in tvEpgEvents" 
            :key="ev.id || idx"
            class="p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5"
            :class="[
              isTvEventLive(ev) 
                ? 'is-live-event bg-[#f43f5e1f] border-[#f43f5e80] shadow-[0_0_15px_#f43f5e33]' 
                : 'bg-white/5 border-white/5 hover:border-white/20'
            ]"
          >
            <div class="flex items-center justify-between text-[11px] font-mono">
              <span class="font-bold text-[#fbbf24]">
                {{ ev.startTimeStr }} - {{ ev.endTimeStr }}
              </span>
              <span v-if="isTvEventLive(ev)" class="px-2 py-0.5 rounded-full bg-[#f43f5e] text-white font-extrabold text-[9px] uppercase tracking-wider animate-pulse shadow-[0_0_8px_#f43f5e]">
                {{ t('airing') }}
              </span>
            </div>

            <h4 class="text-xs font-bold text-white line-clamp-2">
              {{ ev.title }}
            </h4>

            <p v-if="ev.desc" class="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
              {{ ev.desc }}
            </p>
          </div>
        </div>

        <!-- Empty EPG message -->
        <div v-else class="flex-grow flex items-center justify-center p-6 text-center text-xs text-slate-400 bg-white/5 rounded-2xl border border-white/5">
          {{ t('noSchedule') }} {{ getTodayDateString() }}.
        </div>
      </div>

    </div>

    <!-- HORIZONTALLY SCROLLABLE STATIONS RECOMMENDATION ROW -->
    <section class="space-y-4 pt-6 border-t border-white/10">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-extrabold text-white">
          {{ isAudio ? t('otherRadio') : t('otherTV') }}
        </h3>
        <router-link 
          :to="isAudio ? '/radio' : '/tv'" 
          class="text-xs font-bold text-[#fbbf24] hover:underline flex items-center gap-1 transition-colors"
        >
          <span>{{ t('viewAll') }}</span>
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
      </div>

      <!-- Loading skeleton row -->
      <div v-if="recommendedLoading" class="flex gap-4 overflow-x-auto pb-4">
        <div v-for="n in 6" :key="n" class="animate-pulse flex-shrink-0 w-44 h-48 rounded-3xl bg-white/5 border border-white/5"></div>
      </div>

      <!-- Scrollable Stations Carousel -->
      <div v-else-if="recommendedStations.length > 0" class="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin">
        <router-link 
          v-for="st in recommendedStations" 
          :key="st.slug || st.title"
          :to="{ name: 'Player', query: { payload: encodePayload(st) } }"
          class="group flex-shrink-0 w-44 rounded-3xl dani-card overflow-hidden flex flex-col cursor-pointer"
        >
          <!-- Image Box -->
          <div class="relative w-full aspect-video bg-black/40 overflow-hidden flex items-center justify-center p-2">
            <img 
              :src="st.image" 
              :alt="st.title"
              class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
            />
          </div>

          <!-- Title Box (Image & Title ONLY by default) -->
          <div class="p-3 flex items-center justify-center text-center flex-grow bg-black/20">
            <h4 class="text-xs font-bold text-slate-100 group-hover:text-[#fbbf24] transition-colors line-clamp-2">
              {{ st.title }}
            </h4>
          </div>
        </router-link>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { encodePayload, decodePayload } from '../utils/payload';
import { embedUrl, fetchJson } from '../utils/api';
import { useI18n } from '../i18n';

const { t } = useI18n();

const route = useRoute();

const payloadData = computed(() => {
  if (route.query.payload) {
    return decodePayload(route.query.payload) || {};
  }
  return {
    slug: route.query.slug || '',
    provider: route.query.provider || '',
    type: route.query.type || 'video',
    title: route.query.title || route.query.station || 'RadioMY Live Stream',
    image: route.query.image || '',
    category: route.query.category || ''
  };
});

const mediaTitle = computed(() => payloadData.value.title || 'Saluran Live');
const mediaSlug = computed(() => payloadData.value.slug || '');
const mediaProvider = computed(() => payloadData.value.provider || 'tonton');
const mediaType = computed(() => payloadData.value.type || 'video');
const mediaImage = computed(() => payloadData.value.image || '');

const isAudio = computed(() => mediaType.value === 'audio');

const iframeUrl = computed(() => {
  if (mediaProvider.value && mediaSlug.value) {
    return embedUrl(mediaProvider.value, mediaSlug.value);
  }
  return '';
});

const embedStatus = ref('loading');
let embedController;
async function validateEmbed() {
  embedController?.abort();
  const controller = new AbortController();
  embedController = controller;
  embedStatus.value = 'loading';
  if (!iframeUrl.value) { embedStatus.value = 'unavailable'; return; }
  try {
    const response = await fetch(iframeUrl.value, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = response.headers.get('content-type') || '';
    if (!controller.signal.aborted) embedStatus.value = type.includes('text/html') ? 'ready' : type.includes('application/json') ? 'unsupported' : 'unavailable';
  } catch {
    if (!controller.signal.aborted) embedStatus.value = 'unavailable';
  }
}

const radioMetadata = ref(null);
const metadataLoading = ref(false);
let pollTimer = null;
let metadataRequestId = 0;

// TV EPG State & Ref
const tvEpgEvents = ref([]);
const tvEpgLoading = ref(false);
const tvEpgContainerRef = ref(null);
let tvEpgRequestId = 0;

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const fetchTvEpg = async () => {
  if (isAudio.value || !mediaSlug.value) return;
  const requestId = ++tvEpgRequestId;
  tvEpgLoading.value = true;
  tvEpgEvents.value = [];
  const prov = mediaProvider.value || 'tonton';
  const todayDateStr = getTodayDateString();
  try {
    const data = await fetchJson('epg', { provider: prov, channel: mediaSlug.value, date: todayDateStr });
    if (data && requestId === tvEpgRequestId) {
      tvEpgEvents.value = extractEpgEvents(data);

      // Auto scroll to current live / active schedule item
      await nextTick();
      scrollToLiveTvEpg();
    }
  } catch (e) {
    if (requestId === tvEpgRequestId) console.error('TV EPG fetch error:', e);
  } finally {
    if (requestId === tvEpgRequestId) tvEpgLoading.value = false;
  }
};

function scrollToLiveTvEpg() {
  const container = tvEpgContainerRef.value;
  if (!container || !tvEpgEvents.value.length) return;
  
  let liveEl = container.querySelector('.is-live-event');
  
  if (!liveEl) {
    const liveIdx = findLiveOrClosestEventIndex(tvEpgEvents.value);
    if (liveIdx !== -1) {
      const items = container.children;
      if (items && items[liveIdx]) {
        liveEl = items[liveIdx];
      }
    }
  }

  if (liveEl) {
    const targetTop = liveEl.offsetTop - container.offsetTop - 12;
    container.scrollTo({ top: Math.max(0, targetTop), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}

function findLiveOrClosestEventIndex(events) {
  if (!events || events.length === 0) return -1;
  const nowSec = Math.floor(Date.now() / 1000);
  
  const liveIdx = events.findIndex(ev => isTvEventLive(ev));
  if (liveIdx !== -1) return liveIdx;

  let closestIdx = 0;
  let minDiff = Infinity;
  events.forEach((ev, i) => {
    const diff = Math.min(Math.abs(nowSec - (ev.startSec || 0)), Math.abs(nowSec - (ev.endSec || 0)));
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  });
  return closestIdx;
}

// Universal EPG extractor supporting nested schemas (Tonton, RTM, Astro, etc.)
function extractEpgEvents(rawData) {
  if (!rawData) return [];

  if (Array.isArray(rawData) && rawData.some(item => item?.SourceChannel && item?.ChannelSchedule)) {
    const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const wanted = [mediaSlug.value, mediaTitle.value].map(normalize);
    const channel = rawData.find(item => wanted.includes(normalize(item.SourceChannel?.ChannelTag)) || wanted.includes(normalize(item.SourceChannel?.ChannelName)));
    return channel?.ChannelSchedule?.EventList ? normalizeEventsList(channel.ChannelSchedule.EventList) : [];
  }
  
  let rawList = [];

  if (Array.isArray(rawData)) {
    rawList = rawData;
  } else if (typeof rawData === 'object') {
    if (Array.isArray(rawData.data)) {
      rawList = rawData.data;
    } else if (Array.isArray(rawData.schedule)) {
      return normalizeEventsList(rawData.schedule);
    } else if (Array.isArray(rawData.EventList)) {
      return normalizeEventsList(rawData.EventList);
    } else if (rawData.ChannelSchedule?.EventList) {
      return normalizeEventsList(rawData.ChannelSchedule.EventList);
    }
  }

  const extracted = [];
  rawList.forEach(item => {
    if (!item) return;

    if (item.ChannelSchedule?.EventList && Array.isArray(item.ChannelSchedule.EventList)) {
      extracted.push(...item.ChannelSchedule.EventList);
    } else if (Array.isArray(item.EventList)) {
      extracted.push(...item.EventList);
    } else if (Array.isArray(item.schedule)) {
      extracted.push(...item.schedule);
    } else if (item.EventTitle || item.programTitle || item.scheduleProgramTitle || item.title) {
      extracted.push(item);
    }
  });

  return normalizeEventsList(extracted);
}

function normalizeEventsList(events) {
  if (!Array.isArray(events)) return [];

  return events.map((ev, index) => {
    const title = ev.EventTitle || ev.scheduleProgramTitle || ev.programTitle || ev.title || 'Rancangan TV';
    const desc = ev.ShortSynopsis || ev.scheduleProgramDescription || ev.description || ev.desc || '';
    
    let startSec = 0;
    if (ev.StartTimeUTC !== undefined && ev.StartTimeUTC !== null) {
      startSec = typeof ev.StartTimeUTC === 'number' ? ev.StartTimeUTC : Math.floor(new Date(ev.StartTimeUTC).getTime() / 1000);
    } else if (ev.RawStartTimeUTC !== undefined && ev.RawStartTimeUTC !== null) {
      startSec = typeof ev.RawStartTimeUTC === 'number' ? ev.RawStartTimeUTC : Math.floor(new Date(ev.RawStartTimeUTC).getTime() / 1000);
    } else if (ev.dateTimeStart) {
      startSec = Math.floor(new Date(ev.dateTimeStart).getTime() / 1000);
    } else if (ev.start) {
      startSec = typeof ev.start === 'number' ? ev.start : Math.floor(new Date(ev.start).getTime() / 1000);
    }

    let endSec = 0;
    if (ev.EndTimeUTC !== undefined && ev.EndTimeUTC !== null) {
      endSec = typeof ev.EndTimeUTC === 'number' ? ev.EndTimeUTC : Math.floor(new Date(ev.EndTimeUTC).getTime() / 1000);
    } else if (ev.RawEndTimeUTC !== undefined && ev.RawEndTimeUTC !== null) {
      endSec = typeof ev.RawEndTimeUTC === 'number' ? ev.RawEndTimeUTC : Math.floor(new Date(ev.RawEndTimeUTC).getTime() / 1000);
    } else if (ev.dateTimeEnd) {
      endSec = Math.floor(new Date(ev.dateTimeEnd).getTime() / 1000);
    } else if (ev.end) {
      endSec = typeof ev.end === 'number' ? ev.end : Math.floor(new Date(ev.end).getTime() / 1000);
    } else if (ev.duration) {
      endSec = startSec + Number(ev.duration);
    }

    return {
      id: ev.EventID || ev.idEPGProgramSchedule || ev.id || index,
      title,
      desc,
      startSec,
      endSec,
      startTimeStr: formatSecToHHMM(startSec),
      endTimeStr: formatSecToHHMM(endSec),
      raw: ev
    };
  });
}

function formatSecToHHMM(sec) {
  if (!sec || isNaN(sec)) return '';
  try {
    const d = new Date(sec * 1000);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return '';
  } catch (e) {
    return '';
  }
}

function isTvEventLive(ev) {
  if (!ev || !ev.startSec || !ev.endSec) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= ev.startSec && nowSec <= ev.endSec;
}

const fetchMetadata = async () => {
  if (!isAudio.value || !mediaSlug.value) return;
  const requestId = ++metadataRequestId;
  metadataLoading.value = !radioMetadata.value;
  try {
    const data = await fetchJson('radio-metadata', { station: mediaSlug.value, songhistory: true });
    if (requestId === metadataRequestId) radioMetadata.value = data;
  } catch (e) {
    if (requestId === metadataRequestId) console.error('Radio metadata fetch error:', e);
  } finally {
    if (requestId === metadataRequestId) metadataLoading.value = false;
  }
};

const recommendedStations = ref([]);
const recommendedLoading = ref(false);

const fetchRecommended = async () => {
  recommendedLoading.value = true;
  const endpoint = isAudio.value ? 'radio-stations' : 'tv-stations';

  try {
    const data = await fetchJson(endpoint);
    if (Array.isArray(data)) {
      const filtered = data.filter(s => s.slug !== mediaSlug.value && s.title !== mediaTitle.value);
      const shuffled = [...filtered].sort(() => 0.5 - Math.random());
      recommendedStations.value = shuffled.slice(0, 10);
    }
  } catch (e) {
    console.error('Recommended stations fetch error:', e);
  } finally {
    recommendedLoading.value = false;
  }
};

function updateMedia() {
  if (pollTimer) clearInterval(pollTimer);
  metadataRequestId++;
  tvEpgRequestId++;
  radioMetadata.value = null;
  tvEpgEvents.value = [];
  validateEmbed();
  fetchRecommended();
  if (isAudio.value) {
    fetchMetadata();
    pollTimer = setInterval(fetchMetadata, 15000);
  } else {
    fetchTvEpg();
  }
}

onMounted(updateMedia);

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  embedController?.abort();
});

watch([isAudio, mediaSlug, mediaProvider], updateMedia);

const stationName = computed(() => radioMetadata.value?.name || mediaTitle.value);

const currentSongTitle = computed(() => {
  return radioMetadata.value?.nowPlaying?.title || mediaTitle.value;
});

const currentArtist = computed(() => {
  return radioMetadata.value?.nowPlaying?.artist || '';
});

const currentArtwork = computed(() => {
  return radioMetadata.value?.nowPlaying?.artwork || radioMetadata.value?.logo || mediaImage.value;
});

const historyList = computed(() => {
  if (Array.isArray(radioMetadata.value?.history)) {
    return radioMetadata.value.history;
  }
  return [];
});

const historyMessage = computed(() => {
  if (typeof radioMetadata.value?.history === 'string') {
    return radioMetadata.value.history;
  }
  if (radioMetadata.value?.historyStatus) {
    return radioMetadata.value.historyStatus;
  }
  return null;
});

function formatTime(playedAt) {
  if (!playedAt) return '';
  try {
    if (playedAt.includes('T')) {
      const timePart = playedAt.split('T')[1];
      if (timePart) return timePart.substring(0, 5);
    }
    const d = new Date(playedAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return playedAt;
  } catch (e) {
    return playedAt;
  }
}
</script>
