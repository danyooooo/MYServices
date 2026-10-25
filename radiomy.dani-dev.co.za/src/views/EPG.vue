<template>
  <div class="space-y-8 pb-12">

    <!-- Top Spotlight Header (dani-panel) -->
    <div class="p-6 sm:p-10 rounded-3xl dani-panel space-y-4 relative overflow-hidden min-h-[260px] flex flex-col justify-between">
      <div v-if="focusedProgramme" class="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <!-- Programme Info -->
        <div class="lg:col-span-2 space-y-3">
          <div class="flex items-center gap-2.5 flex-wrap">
            <div class="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
              <img 
                v-if="focusedChannel?.icon" 
                :src="focusedChannel.icon" 
                :alt="focusedChannel.name" 
                class="w-5 h-5 object-contain"
              />
              <span class="text-xs font-bold text-[#fbbf24]">{{ focusedChannel?.name || focusedProgramme.channelId }}</span>
            </div>

            <span v-if="focusedProgramme.category" class="px-2.5 py-1 rounded-xl bg-[#fbbf241f] text-[#fcd34d] border border-[#fbbf2440] text-[10px] font-bold uppercase">
              {{ focusedProgramme.category }}
            </span>

            <span v-if="isCurrentlyAiring(focusedProgramme)" class="px-2.5 py-1 rounded-xl bg-[#f43f5e] text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse flex items-center gap-1.5 shadow-[0_0_10px_#f43f5e80]">
              <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
              <span>{{ t('airing') }}</span>
            </span>
          </div>

          <h2 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {{ focusedProgramme.title }}
          </h2>

          <div class="space-y-1.5 max-w-lg">
            <div class="flex items-center justify-between text-xs font-mono text-slate-300">
              <span>{{ formatTimeStr(focusedProgramme.start) }} - {{ formatTimeStr(focusedProgramme.stop) }}</span>
              <span v-if="isCurrentlyAiring(focusedProgramme)" class="text-[#fbbf24] font-bold">{{ getRemainingTime(focusedProgramme) }}</span>
            </div>
            <div v-if="isCurrentlyAiring(focusedProgramme)" class="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" :style="{ width: getAiringProgress(focusedProgramme) + '%' }"></div>
            </div>
          </div>

          <p class="text-sm text-slate-300 line-clamp-2 max-w-2xl leading-relaxed">
            {{ focusedProgramme.desc || t('noDescription') }}
          </p>
        </div>

        <!-- Watch Action -->
        <div class="lg:col-span-1 flex items-center justify-start lg:justify-end">
          <router-link v-if="getWatchRoute(focusedChannel)"
            :to="getWatchRoute(focusedChannel)"
            class="px-6 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#171208] font-bold text-sm shadow-[inset_0_1px_1px_#ffffff59,0_8px_24px_-4px_#fbbf2466] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <svg class="w-4 h-4 translate-x-0.5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span>{{ t('watchChannel') }}</span>
          </router-link>
        </div>
      </div>

      <div v-else class="text-center py-8 text-slate-400 text-xs">
        {{ t('selectProgramme') }}
      </div>
    </div>

    <!-- Search & Filters -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-3xl dani-panel">
      <div class="relative flex-grow max-w-md">
        <svg class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          :placeholder="t('searchEPG')" :aria-label="t('searchEPG')"
          class="w-full pl-11 pr-4 py-2.5 rounded-2xl dani-input text-sm"
        />
      </div>

      <div class="flex items-center gap-3">
        <select 
          v-model="selectedChannelFilter"
          class="py-2.5 px-3.5 rounded-2xl dani-input text-sm" :aria-label="t('allChannels')"
        >
          <option value="All" class="bg-[#08090e] text-white">{{ t('allChannels') }} ({{ channels.length }})</option>
          <option v-for="ch in channels" :key="ch.id" :value="ch.id" class="bg-[#08090e] text-white">
            {{ ch.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="p-16 rounded-3xl dani-panel text-center space-y-4">
      <div class="w-9 h-9 border-3 border-[#fbbf24] border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-sm text-slate-300 font-bold">{{ t('loadingEPG') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-8 rounded-3xl dani-panel text-center space-y-3">
      <p class="text-sm text-rose-400 font-semibold">{{ t('epgError') }}</p>
      <button @click="fetchEPG" class="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all">
        {{ t('retry') }}
      </button>
    </div>

    <!-- Channel guide: a readable list with a programme grid in each row. -->
    <section v-else-if="filteredChannels.length > 0" class="epg-list" :aria-label="t('epg')">
      <div class="epg-list-heading">
        <div>
          <span class="eyebrow"><span class="badge-dot gold"></span>{{ t('epg') }}</span>
          <h2>{{ t('currentNext') }}</h2>
        </div>
        <span class="epg-list-count" :aria-label="`${filteredChannels.length} ${t('allChannels')}`">{{ filteredChannels.length }}</span>
      </div>

      <article v-for="ch in filteredChannels" :key="ch.id" class="epg-channel-card">
        <div class="epg-channel-identity">
          <div class="epg-channel-logo">
            <img v-if="ch.icon" :src="ch.icon" :alt="ch.name" />
            <span v-else aria-hidden="true">TV</span>
          </div>
          <div class="epg-channel-name">
            <h3>{{ ch.name }}</h3>
            <p>{{ getCurrentProgramme(ch.id)?.title || t('noProgrammes') }}</p>
          </div>
          <router-link v-if="getWatchRoute(ch)" :to="getWatchRoute(ch)" class="epg-watch-link" :aria-label="`${t('watchChannel')}: ${ch.name}`" :title="t('watchChannel')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </router-link>
        </div>

        <div class="epg-channel-schedule">
          <div v-if="getVisibleProgrammes(ch.id).length" class="epg-programmes">
            <button v-for="prog in getVisibleProgrammes(ch.id)" :key="prog.id" type="button"
              class="epg-programme-card" :class="{ 'is-selected': focusedProgramme?.id === prog.id, 'is-live': isCurrentlyAiring(prog) }"
              :aria-pressed="focusedProgramme?.id === prog.id" @click="focusedProgramme = prog">
              <span class="epg-programme-time">{{ formatTimeStr(prog.start) }} <span>—</span> {{ formatTimeStr(prog.stop) }}</span>
              <span v-if="isCurrentlyAiring(prog)" class="epg-live-label"><span class="epg-live-dot"></span>{{ t('airing') }}</span>
              <span v-else-if="prog.category" class="epg-programme-category">{{ prog.category }}</span>
              <strong>{{ prog.title }}</strong>
              <span class="epg-programme-description">{{ prog.desc || t('noDetails') }}</span>
              <span v-if="isCurrentlyAiring(prog)" class="epg-progress-track"><span :style="{ width: getAiringProgress(prog) + '%' }"></span></span>
            </button>
          </div>
          <p v-else class="epg-schedule-empty">{{ t('noProgrammes') }}</p>
          <button v-if="getProgrammesForChannel(ch.id).length > 2" type="button" class="epg-expand-button"
            :aria-expanded="expandedChannels.has(ch.id)" @click="toggleChannel(ch.id)">
            {{ expandedChannels.has(ch.id) ? t('collapseSchedule') : t('fullSchedule') }} <span aria-hidden="true">{{ expandedChannels.has(ch.id) ? '−' : '→' }}</span>
          </button>
        </div>
      </article>
    </section>

    <!-- Empty State -->
    <div v-else class="p-12 text-center dani-panel rounded-3xl text-slate-400 font-medium text-xs">
      {{ t('noEPG') }}
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { encodePayload } from '../utils/payload';
import { apiUrl, fetchJson } from '../utils/api';
import { useI18n } from '../i18n';

const { t } = useI18n();

const channels = ref([]);
const programmes = ref([]);
const streamStations = ref([]);
const loading = ref(true);
const error = ref(null);

const searchQuery = ref('');
const selectedChannelFilter = ref('All');
const focusedProgramme = ref(null);
const expandedChannels = ref(new Set());
const now = ref(Date.now());
let clockTimer;

const fetchEPG = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetch(apiUrl('epg.xml'));
    if (!res.ok) {
      throw new Error(`Gagal memuat turun data EPG (Status: ${res.status})`);
    }
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const channelNodes = xmlDoc.getElementsByTagName('channel');
    const parsedChannels = [];
    for (let i = 0; i < channelNodes.length; i++) {
      const node = channelNodes[i];
      const id = node.getAttribute('id') || '';
      const displayNameNode = node.getElementsByTagName('display-name')[0];
      const iconNode = node.getElementsByTagName('icon')[0];

      parsedChannels.push({
        id,
        name: displayNameNode ? displayNameNode.textContent.trim() : id,
        icon: iconNode ? iconNode.getAttribute('src') : ''
      });
    }
    channels.value = parsedChannels;

    const programmeNodes = xmlDoc.getElementsByTagName('programme');
    const parsedProgrammes = [];
    for (let i = 0; i < programmeNodes.length; i++) {
      const node = programmeNodes[i];
      const channelId = node.getAttribute('channel') || '';
      const startStr = node.getAttribute('start') || '';
      const stopStr = node.getAttribute('stop') || '';
      
      const titleNode = node.getElementsByTagName('title')[0];
      const descNode = node.getElementsByTagName('desc')[0];
      const categoryNode = node.getElementsByTagName('category')[0];

      const start = parseXMLTVDate(startStr);
      const stop = parseXMLTVDate(stopStr);

      parsedProgrammes.push({
        id: `${channelId}-${i}`,
        channelId,
        start,
        stop,
        title: titleNode ? titleNode.textContent.trim() : t('untitledProgramme'),
        desc: descNode ? descNode.textContent.trim() : '',
        category: categoryNode ? categoryNode.textContent.trim() : ''
      });
    }
    programmes.value = parsedProgrammes;

    const now = new Date();
    const currentAiring = parsedProgrammes.find(p => p.start <= now && p.stop >= now);
    if (currentAiring) {
      focusedProgramme.value = currentAiring;
    } else if (parsedProgrammes.length > 0) {
      focusedProgramme.value = parsedProgrammes[0];
    }

  } catch (err) {
    error.value = err.message || 'Ralat semasa membaca fail EPG XML.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchEPG();
  Promise.allSettled([fetchJson('tv-stations'), fetchJson('radio-stations')]).then(results => {
    streamStations.value = results.flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []);
  });
  clockTimer = setInterval(() => { now.value = Date.now(); }, 60000);
});
onUnmounted(() => clearInterval(clockTimer));

function parseXMLTVDate(dateStr) {
  const match = /^([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})(?:\s*([+-])([0-9]{2})([0-9]{2}))?/.exec(dateStr || '');
  if (!match) return new Date(NaN);
  const [, year, month, day, hour, minute, second, sign, offsetHours, offsetMinutes] = match;
  if (sign) {
    const offset = (Number(offsetHours) * 60 + Number(offsetMinutes)) * (sign === '+' ? 1 : -1);
    return new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second) - offset * 60000);
  }
  return new Date(+year, +month - 1, +day, +hour, +minute, +second);
}

function formatTimeStr(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isCurrentlyAiring(prog) {
  if (!prog || !prog.start || !prog.stop) return false;
  return prog.start.getTime() <= now.value && prog.stop.getTime() >= now.value;
}

function getAiringProgress(prog) {
  if (!isCurrentlyAiring(prog)) return 0;
  const currentTime = now.value;
  const start = prog.start.getTime();
  const stop = prog.stop.getTime();
  const total = stop - start;
  if (total <= 0) return 100;
  const elapsed = currentTime - start;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function getRemainingTime(prog) {
  if (!isCurrentlyAiring(prog)) return '';
  const currentTime = now.value;
  const stop = prog.stop.getTime();
  const diffMinutes = Math.ceil((stop - currentTime) / 60000);
  return `${diffMinutes} ${t('minutesLeft')}`;
}

const focusedChannel = computed(() => {
  if (!focusedProgramme.value) return null;
  return channels.value.find(c => c.id === focusedProgramme.value.channelId) || { id: focusedProgramme.value.channelId, name: focusedProgramme.value.channelId };
});

const programmesByChannel = computed(() => {
  const map = new Map();
  programmes.value.forEach(programme => {
    if (!map.has(programme.channelId)) map.set(programme.channelId, []);
    map.get(programme.channelId).push(programme);
  });
  map.forEach(list => list.sort((a, b) => a.start - b.start));
  return map;
});

const getProgrammesForChannel = channelId => programmesByChannel.value.get(channelId) || [];
const getCurrentProgramme = channelId => getProgrammesForChannel(channelId).find(isCurrentlyAiring);
const getVisibleProgrammes = channelId => {
  const list = getProgrammesForChannel(channelId);
  if (expandedChannels.value.has(channelId)) return list;
  const firstUpcoming = list.findIndex(programme => programme.stop.getTime() >= now.value);
  return firstUpcoming < 0 ? [] : list.slice(firstUpcoming, firstUpcoming + 2);
};
function toggleChannel(channelId) {
  const next = new Set(expandedChannels.value);
  if (next.has(channelId)) next.delete(channelId); else next.add(channelId);
  expandedChannels.value = next;
}

const filteredChannels = computed(() => {
  return channels.value.filter(ch => {
    const matchesFilter = selectedChannelFilter.value === 'All' || ch.id === selectedChannelFilter.value;
    const matchesQuery = !searchQuery.value || 
      ch.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      getProgrammesForChannel(ch.id).some(p => p.title.toLowerCase().includes(searchQuery.value.toLowerCase()));
    
    return matchesFilter && matchesQuery;
  });
});

function getWatchRoute(ch) {
  if (!ch) return null;
  const normalized = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const station = streamStations.value.find(item => item.slug === ch.id)
    || streamStations.value.find(item => normalized(item.title) === normalized(ch.name));
  return station ? { name: 'Player', query: { payload: encodePayload(station) } } : null;
}
</script>

<style scoped>
.epg-list { display: grid; gap: 14px; }
.epg-list-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; padding: 0 4px 8px; }
.epg-list-heading h2 { margin-top: 8px; color: #f5f7fa; font-size: clamp(1.4rem, 2.5vw, 1.9rem); font-weight: 800; letter-spacing: -.03em; }
.epg-list-count { display: grid; place-items: center; min-width: 40px; min-height: 40px; padding: 4px 10px; border-radius: 50%; color: #fcd34d; background: #fbbf241a; border: 1px solid #fbbf2440; font-size: .875rem; font-weight: 800; }
.epg-channel-card { display: grid; grid-template-columns: minmax(210px, 240px) minmax(0, 1fr); gap: 22px; padding: 18px; border-radius: 24px; border: 1px solid rgba(255,255,255,.13); background: linear-gradient(120deg, rgba(33,28,20,.88), rgba(18,22,34,.78) 52%); box-shadow: inset 0 1px 1px rgba(255,255,255,.18), 0 16px 36px -16px rgba(0,0,0,.6); backdrop-filter: blur(24px) saturate(170%); }
.epg-channel-identity { display: grid; grid-template-columns: 52px minmax(0,1fr); align-content: start; align-items: center; gap: 12px; padding: 12px; border-radius: 18px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.08); }
.epg-channel-logo { display: grid; place-items: center; width: 52px; height: 52px; padding: 8px; border-radius: 14px; background: rgba(0,0,0,.32); border: 1px solid rgba(255,255,255,.1); color: #fcd34d; font-size: .75rem; font-weight: 800; }
.epg-channel-logo img { width: 100%; height: 100%; object-fit: contain; }
.epg-channel-name { min-width: 0; }
.epg-channel-name h3 { color: #fff; font-size: 1rem; font-weight: 800; line-height: 1.35; overflow-wrap: anywhere; }
.epg-channel-name p { margin-top: 5px; color: #aeb7c7; font-size: .75rem; line-height: 1.4; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.epg-watch-link { grid-column: 1 / -1; display: inline-flex; align-items: center; justify-content: center; width: 100%; min-height: 38px; border-radius: 999px; border: 1px solid #fbbf2440; background: #fbbf2417; color: #fcd34d; transition: background .2s, color .2s; }
.epg-watch-link:hover { background: #fbbf24; color: #171208; }
.epg-watch-link svg { width: 16px; height: 16px; fill: currentColor; }
.epg-channel-schedule { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.epg-programmes { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
.epg-programme-card { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; min-width: 0; min-height: 154px; padding: 16px; border-radius: 18px; border: 1px solid rgba(255,255,255,.11); background: rgba(255,255,255,.045); color: #f5f7fa; text-align: left; transition: border-color .2s, background .2s, transform .2s; }
.epg-programme-card:hover { border-color: #fbbf2470; background: #fbbf240d; transform: translateY(-2px); }
.epg-programme-card.is-selected { border-color: #fbbf24; background: #fbbf2414; box-shadow: inset 0 1px 1px #ffffff21, 0 0 22px #fbbf2415; }
.epg-programme-card.is-live { padding-bottom: 20px; }
.epg-programme-time { color: #fcd34d; font: 700 .75rem/1.3 var(--font-mono, monospace); letter-spacing: .01em; }
.epg-programme-time span { color: #8c8b89; margin: 0 2px; }
.epg-live-label, .epg-programme-category { position: absolute; top: 14px; right: 14px; max-width: 42%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .65rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.epg-live-label { display: inline-flex; align-items: center; gap: 5px; color: #fda4af; }
.epg-live-dot { width: 6px; height: 6px; flex: none; border-radius: 50%; background: #fb7185; box-shadow: 0 0 7px #fb7185; }
.epg-programme-category { color: #9da5b3; }
.epg-programme-card strong { width: 100%; font-size: .9375rem; line-height: 1.35; font-weight: 750; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.epg-programme-description { width: 100%; color: #aeb7c7; font-size: .75rem; line-height: 1.45; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.epg-progress-track { position: absolute; left: 16px; right: 16px; bottom: 10px; height: 4px; overflow: hidden; border-radius: 999px; background: rgba(0,0,0,.4); }
.epg-progress-track > span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #fbbf24, #f59e0b); }
.epg-expand-button { align-self: flex-start; min-height: 40px; padding: 8px 16px; border-radius: 999px; border: 1px solid #fbbf2440; color: #fcd34d; background: #fbbf240c; font-size: .8125rem; font-weight: 700; }
.epg-expand-button:hover { background: #fbbf241e; }
.epg-expand-button span { margin-left: 8px; font-size: 1rem; }
.epg-schedule-empty { padding: 30px 12px; color: #aeb7c7; font-size: .875rem; }
@media (max-width: 900px) { .epg-channel-card { grid-template-columns: 1fr; gap: 12px; } .epg-channel-identity { grid-template-columns: 52px minmax(0,1fr) 40px; } .epg-watch-link { grid-column: auto; width: 40px; min-height: 40px; } }
@media (max-width: 600px) { .epg-channel-card { padding: 12px; border-radius: 20px; } .epg-programmes { grid-template-columns: 1fr; } .epg-programme-card { min-height: 138px; } .epg-list-heading { padding: 0 2px 4px; } }
</style>
