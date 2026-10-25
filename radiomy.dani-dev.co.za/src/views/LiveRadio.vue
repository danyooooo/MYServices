<template>
  <div class="space-y-8 pb-12">

    <!-- Hero Glass Banner (dani-panel) -->
    <div class="p-8 sm:p-10 rounded-3xl dani-panel space-y-4 relative overflow-hidden">
      <div class="flex items-center gap-2">
        <span class="badge-dot amber"></span>
        <span class="text-xs font-bold text-[#fbbf24] uppercase tracking-wider">{{ t('liveNow') }}</span>
      </div>

      <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
        {{ t('radio') }}
      </h1>

      <p class="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed font-normal">
        {{ t('radioIntro') }}
      </p>
    </div>

    <!-- Search & Filters -->
    <div class="space-y-4">
      <!-- Search Input -->
      <div class="relative w-full max-w-lg">
        <svg class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          :placeholder="t('searchRadio')" :aria-label="t('searchRadio')"
          class="w-full pl-11 pr-4 py-3 rounded-2xl dani-input text-sm"
        />
      </div>

      <!-- Filter Category Pills -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button 
          @click="selectedProvider = 'All'" 
          class="px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
          :class="selectedProvider === 'All' ? 'bg-[#fbbf24] text-black font-bold shadow-[0_0_12px_#fbbf2480]' : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'"
        >
          {{ t('allProviders') }}
        </button>

        <button 
          v-for="prov in uniqueProviders" 
          :key="prov"
          @click="selectedProvider = prov"
          class="px-4 py-2 rounded-full text-xs font-semibold transition-all capitalize whitespace-nowrap"
          :class="selectedProvider === prov ? 'bg-[#fbbf24] text-black font-bold shadow-[0_0_12px_#fbbf2480]' : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'"
        >
          {{ prov }}
        </button>
      </div>
    </div>

    <!-- Loading Skeleton Grid -->
    <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
      <div v-for="n in 10" :key="n" class="animate-pulse rounded-3xl bg-white/5 h-52 border border-white/5"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-8 rounded-3xl dani-panel text-center space-y-3">
      <p class="text-sm font-semibold text-rose-300">{{ t('loadRadioError') }}</p>
      <button @click="fetchRadioStations" class="px-5 py-2.5 rounded-full bg-[#fbbf24] hover:bg-amber-500 text-black text-sm font-bold transition-all">
        {{ t('retry') }}
      </button>
    </div>

    <!-- Radio Stations Grid (Cards display Image & Title ONLY by default) -->
    <div v-else-if="filteredRadioStations.length > 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
      <router-link 
        v-for="station in filteredRadioStations" 
        :key="station.slug || station.title"
        :to="{ name: 'Player', query: { payload: encodePayload(station) } }"
        class="group relative rounded-3xl dani-card overflow-hidden flex flex-col cursor-pointer"
      >
        <!-- Hover Overlay Badge -->
        <div class="absolute top-3 left-3 right-3 z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100 transition-opacity duration-300 flex items-center justify-between pointer-events-none">
          <span class="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase bg-[#fbbf24] text-black shadow-md">
            RADIO
          </span>
          <span v-if="station.provider" class="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase bg-black/80 text-[#fbbf24] border border-[#fbbf2440] backdrop-blur-md">
            {{ station.provider }}
          </span>
        </div>

        <!-- Image Container with Play Overlay -->
        <div class="relative w-full aspect-video bg-black/40 overflow-hidden flex items-center justify-center p-3">
          <img 
            :src="station.image" 
            :alt="station.title"
            class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />

          <!-- Play & Equalizer Overlay -->
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2">
            <div class="flex items-end space-x-1 h-5 mb-1">
              <span class="w-1 bg-[#fbbf24] rounded-full eq-bar"></span>
              <span class="w-1 bg-[#fbbf24] rounded-full eq-bar"></span>
              <span class="w-1 bg-[#f43f5e] rounded-full eq-bar"></span>
            </div>
            <div class="w-11 h-11 rounded-full bg-[#fbbf24] text-black flex items-center justify-center shadow-[0_0_15px_#fbbf2480] group-hover:scale-110 transition-transform">
              <svg class="w-5 h-5 translate-x-0.5 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Title Box (Shows Image & Title ONLY by default) -->
        <div class="p-4 flex items-center justify-center text-center flex-grow bg-black/20">
          <h3 class="text-sm font-bold text-slate-100 group-hover:text-[#fbbf24] transition-colors line-clamp-2">
            {{ station.title }}
          </h3>
        </div>
      </router-link>
    </div>

    <!-- Empty State -->
    <div v-else class="p-12 text-center dani-panel rounded-3xl text-slate-400 font-medium text-sm">
      {{ t('noRadio') }}
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { encodePayload } from '../utils/payload';
import { fetchJson } from '../utils/api';
import { useI18n } from '../i18n';

const { t } = useI18n();

const radioStations = ref([]);
const loading = ref(true);
const error = ref(false);

const searchQuery = ref('');
const selectedProvider = ref('All');
const selectedCategory = ref('All');

const fetchRadioStations = async () => {
  loading.value = true;
  error.value = false;
  try {
    const data = await fetchJson('radio-stations');
    radioStations.value = Array.isArray(data) ? data : [];
  } catch (err) {
    error.value = true;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchRadioStations();
});

const uniqueProviders = computed(() => {
  const set = new Set();
  radioStations.value.forEach(s => {
    if (s.provider) set.add(s.provider);
  });
  return Array.from(set);
});

const filteredRadioStations = computed(() => {
  return radioStations.value.filter(s => {
    const matchesProvider = selectedProvider.value === 'All' || s.provider === selectedProvider.value;
    const matchesCategory = selectedCategory.value === 'All' || s.category === selectedCategory.value;
    const matchesQuery = !searchQuery.value || s.title.toLowerCase().includes(searchQuery.value.toLowerCase());

    return matchesProvider && matchesCategory && matchesQuery;
  });
});
</script>
