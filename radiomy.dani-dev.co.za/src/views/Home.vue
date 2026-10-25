<template>
  <div class="space-y-12 pb-12">
    <section class="dani-panel home-hero rounded-[2rem] p-7 sm:p-10 lg:p-12 overflow-hidden relative">
      <div class="relative z-10 grid lg:grid-cols-[1.15fr_.85fr] gap-10 items-center">
        <div class="max-w-2xl">
          <div class="eyebrow mb-5"><span class="badge-dot gold"></span> RadioMY · {{ t('catalogue') }}</div>
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] mb-5">{{ t('discover') }}</h1>
          <p class="text-base sm:text-lg text-slate-200/85 leading-relaxed max-w-xl mb-7">{{ t('discoverIntro') }}</p>
          <div class="flex flex-wrap gap-3">
            <a href="#catalogue" class="primary-action">{{ t('browse') }} <span aria-hidden="true">↓</span></a>
            <router-link to="/tv" class="secondary-action">{{ t('watchTV') }}</router-link>
            <router-link to="/radio" class="secondary-action">{{ t('listenRadio') }}</router-link>
          </div>
        </div>
        <div class="hero-posters" aria-hidden="true">
          <div v-for="(item, index) in heroItems" :key="`${item.provider}-${item.id || index}`" class="hero-poster" :class="`hero-poster-${index + 1}`">
            <img v-if="item.thumbnail" :src="item.thumbnail" alt="" />
            <div v-else class="w-full h-full bg-gradient-to-br from-amber-500/30 to-amber-500/20"></div>
            <span>{{ item.title }}</span>
          </div>
          <div v-if="heroItems.length === 0" class="hero-poster hero-poster-empty">Radio<span>MY</span></div>
        </div>
      </div>
    </section>

    <section id="catalogue" class="space-y-8 scroll-mt-28" aria-labelledby="catalogue-heading">
      <div class="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div class="eyebrow mb-3"><span class="badge-dot emerald"></span> {{ t('provider') }}</div>
          <h2 id="catalogue-heading" class="text-2xl sm:text-3xl font-extrabold tracking-tight">{{ t('catalogue') }}</h2>
        </div>
        <button v-if="selectedFilter" type="button" class="secondary-action" @click="closeFilter">← {{ t('backToCatalogue') }}</button>
      </div>

      <div v-if="selectedFilter" class="space-y-6">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="provider-badge">{{ providerLabel(selectedFilter.provider) }}</span>
          <h3 class="text-xl sm:text-2xl font-bold">{{ sectionTitle(selectedFilter.id, selectedFilter.title) }}</h3>
        </div>
        <div v-if="filterLoading" class="catalogue-grid" aria-live="polite">
          <div v-for="n in 8" :key="n" class="catalogue-skeleton"></div>
        </div>
        <div v-else-if="filterError" class="state-panel" role="alert">
          <p>{{ t('catalogueError') }}</p>
          <button type="button" class="secondary-action" @click="openFilter(selectedFilter.provider, selectedFilter.id, selectedFilter.title)">{{ t('retry') }}</button>
        </div>
        <div v-else-if="filterItems.length" class="catalogue-grid">
          <CatalogueCard v-for="(item, index) in filterItems" :key="`${selectedFilter.provider}-${item.id || item.slug || index}`" :item="item" :provider="selectedFilter.provider" />
        </div>
        <div v-else class="state-panel">{{ t('emptyCatalogue') }}</div>
      </div>

      <div v-else class="space-y-12">
        <div v-if="loading" class="space-y-10" aria-live="polite">
          <div v-for="n in 2" :key="n" class="space-y-4">
            <div class="h-7 w-40 rounded-lg bg-white/10 animate-pulse"></div>
            <div class="flex gap-4 overflow-hidden"><div v-for="m in 4" :key="m" class="catalogue-skeleton flex-shrink-0 w-56"></div></div>
          </div>
        </div>
        <div v-for="provider in providers" v-else :key="provider" class="space-y-7">
          <div class="provider-heading">
            <div><span class="provider-badge">{{ providerLabel(provider) }}</span><p class="mt-2 text-sm text-slate-400">{{ t('catalogue') }} · {{ providerLabel(provider) }}</p></div>
            <div v-if="filters[provider]?.length" class="provider-filter-list" :aria-label="`${providerLabel(provider)} ${t('allSections')}`">
              <button v-for="filter in filters[provider]" :key="filter.id" type="button" class="filter-chip" @click="openFilter(provider, filter.id, filter.title)">{{ sectionTitle(filter.id, filter.title) }}</button>
            </div>
          </div>
          <div v-if="errors[provider]" class="state-panel" role="alert"><p>{{ t('catalogueError') }}</p><button type="button" class="secondary-action" @click="loadCatalogue">{{ t('retry') }}</button></div>
          <div v-else-if="!dashboards[provider]?.length" class="state-panel">{{ t('emptyCatalogue') }}</div>
          <section v-for="section in dashboards[provider]" v-else :key="`${provider}-${section.id}`" class="space-y-4" :aria-label="sectionTitle(section.id, section.title)">
            <div class="flex items-center justify-between gap-4">
              <h3 class="text-lg sm:text-xl font-bold tracking-tight">{{ sectionTitle(section.id, section.title) }}</h3>
              <button type="button" class="view-all" @click="openFilter(provider, section.id, section.title)">{{ t('viewAll') }} <span aria-hidden="true">→</span></button>
            </div>
            <div class="catalogue-rail">
              <CatalogueCard v-for="(item, index) in section.data" :key="`${provider}-${section.id}-${item.id || item.slug || index}`" :item="item" :provider="provider" class="w-[215px] sm:w-[235px] flex-shrink-0" />
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import CatalogueCard from '../components/CatalogueCard.vue';
import { fetchJson } from '../utils/api';
import { useI18n } from '../i18n';

const { t, sectionTitle } = useI18n();
const providers = ['rtmklik', 'tonton'];
const providerLabel = provider => provider === 'rtmklik' ? 'RTMKlik' : 'Tonton';
const filters = ref({});
const dashboards = ref({});
const errors = ref({});
const loading = ref(true);
const selectedFilter = ref(null);
const filterItems = ref([]);
const filterLoading = ref(false);
const filterError = ref(false);
let dashboardController;
let filterController;

const heroItems = computed(() => providers.map(provider => {
  const item = dashboards.value[provider]?.find(section => section.data?.length)?.data?.[0];
  return item ? { ...item, provider } : null;
}).filter(Boolean));

async function loadCatalogue() {
  dashboardController?.abort();
  const controller = new AbortController();
  dashboardController = controller;
  loading.value = true;
  errors.value = {};
  const options = { signal: controller.signal };
  const results = await Promise.allSettled([
    fetchJson('news-filter', {}, options),
    ...providers.map(provider => fetchJson('news', { provider }, options)),
  ]);
  if (controller.signal.aborted) return;
  if (results[0].status === 'fulfilled') filters.value = results[0].value.providers || {};
  providers.forEach((provider, index) => {
    const result = results[index + 1];
    if (result.status === 'fulfilled' && result.value?.ok) {
      dashboards.value[provider] = (result.value.sections || []).filter(section => Array.isArray(section.data) && section.data.length);
    } else {
      errors.value[provider] = true;
    }
  });
  loading.value = false;
}

async function openFilter(provider, id, title) {
  selectedFilter.value = { provider, id, title };
  filterController?.abort();
  const controller = new AbortController();
  filterController = controller;
  filterLoading.value = true;
  filterError.value = false;
  filterItems.value = [];
  document.getElementById('catalogue')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  try {
    const result = await fetchJson('news', { provider, filter: id }, { signal: controller.signal });
    if (!controller.signal.aborted) filterItems.value = Array.isArray(result.data) ? result.data : [];
  } catch {
    if (!controller.signal.aborted) filterError.value = true;
  } finally {
    if (!controller.signal.aborted) filterLoading.value = false;
  }
}

function closeFilter() {
  filterController?.abort();
  selectedFilter.value = null;
  filterItems.value = [];
}

onMounted(loadCatalogue);
onUnmounted(() => { dashboardController?.abort(); filterController?.abort(); });
</script>
