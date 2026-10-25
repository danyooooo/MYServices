<template>
  <header class="sticky top-[18px] z-50 px-4 pointer-events-none">
    <div class="site-header pointer-events-auto mx-auto flex items-center justify-between gap-3 w-full max-w-7xl px-4 sm:px-5">
      <router-link to="/" class="flex items-center gap-2.5 font-extrabold text-base tracking-tight text-white no-underline group" @click="mobileMenuOpen = false">
        <span class="brand-mark" aria-hidden="true"><span class="brand-mark-core"></span></span>
        <span>Radio<span class="text-amber-300">MY</span></span>
        <span class="hidden sm:inline-flex text-[10px] px-2 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 tracking-wider">LIVE</span>
      </router-link>

      <nav class="hidden md:flex items-center gap-1 rounded-full bg-black/20 p-1 border border-white/10" :aria-label="t('menu')">
        <router-link v-for="item in navItems" :key="item.path" :to="item.path" class="nav-link" :class="{ 'nav-link-active': $route.path === item.path }" :aria-current="$route.path === item.path ? 'page' : undefined">
          {{ t(item.key) }}
        </router-link>
      </nav>

      <div class="radio-header-actions flex items-center gap-2">
        <ServiceDirectory current="radio" />
        <button type="button" class="header-icon-button min-w-[44px] px-2.5 text-sm font-bold" :aria-label="t('language')" @click="toggleLanguage">{{ locale === 'ms' ? 'EN' : 'BM' }}</button>
        <button type="button" class="header-icon-button md:hidden" :aria-label="mobileMenuOpen ? t('closeMenu') : t('menu')" :aria-expanded="mobileMenuOpen" aria-controls="mobile-nav" @click="mobileMenuOpen = !mobileMenuOpen">
          <span class="menu-lines" aria-hidden="true"><span></span><span></span><span></span></span>
        </button>
      </div>
    </div>
    <nav v-if="mobileMenuOpen" id="mobile-nav" class="mobile-nav pointer-events-auto mx-auto mt-2 max-w-7xl" :aria-label="t('menu')">
      <router-link v-for="item in navItems" :key="item.path" :to="item.path" class="mobile-nav-link" :class="{ 'mobile-nav-link-active': $route.path === item.path }" :aria-current="$route.path === item.path ? 'page' : undefined" @click="mobileMenuOpen = false">
        {{ t(item.key) }}<span class="ml-auto" aria-hidden="true">→</span>
      </router-link>
    </nav>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from '../i18n';
import ServiceDirectory from './ServiceDirectory.vue';

const { locale, setLocale, t } = useI18n();
const mobileMenuOpen = ref(false);
const toggleLanguage = () => setLocale(locale.value === 'ms' ? 'en' : 'ms');
const navItems = [
  { key: 'home', path: '/' },
  { key: 'radio', path: '/radio' },
  { key: 'tv', path: '/tv' },
  { key: 'epg', path: '/epg' },
];
</script>
