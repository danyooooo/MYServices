<template>
  <component :is="href ? 'a' : 'div'" :href="href || undefined" :target="href ? '_blank' : undefined" :rel="href ? 'noopener noreferrer' : undefined" class="catalogue-card group" :class="{ 'opacity-70': !href }" :aria-label="href ? `${item.title || item.longTitle} · ${t('externalLink')}` : undefined">
    <div class="catalogue-artwork">
      <img v-if="image && !imageFailed" :src="image" :alt="item.title || ''" loading="lazy" @error="imageFailed = true" />
      <div v-else class="artwork-fallback">{{ providerLabel }}</div>
      <span class="catalogue-provider">{{ providerLabel }}</span>
    </div>
    <div class="p-4 flex flex-col flex-grow gap-2">
      <h4 class="text-sm sm:text-base font-bold leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">{{ item.title || item.longTitle }}</h4>
      <p v-if="item.description" class="text-sm text-slate-400 leading-snug line-clamp-2">{{ item.description }}</p>
      <div class="mt-auto pt-2 flex items-center justify-between gap-2 text-xs text-slate-400"><span>{{ item.productionYear || providerLabel }}</span><span v-if="href" class="text-amber-300 font-semibold" aria-hidden="true">↗</span></div>
    </div>
  </component>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from '../i18n';

const props = defineProps({ item: { type: Object, required: true }, provider: { type: String, required: true } });
const { t } = useI18n();
const imageFailed = ref(false);
const providerLabel = computed(() => props.provider === 'rtmklik' ? 'RTMKlik' : 'Tonton');
const image = computed(() => props.item.thumbnail || props.item.images?.landscape || props.item.images?.poster || '');
const href = computed(() => {
  try {
    const url = new URL(props.item.url);
    const hosts = props.provider === 'rtmklik' ? ['rtmklik.rtm.gov.my'] : ['watch.tonton.com.my'];
    return url.protocol === 'https:' && hosts.includes(url.hostname) ? url.toString() : '';
  } catch { return ''; }
});
</script>
