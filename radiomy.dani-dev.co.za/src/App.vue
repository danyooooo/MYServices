<template>
  <div class="app-root min-h-screen text-[#f8fafc] flex flex-col relative font-sans antialiased">
    <!-- Liquid Ambient Background & Refraction Grid from dani-dev.pages.dev -->
    <div class="liquid-bg-container">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="refraction-grid"></div>
    </div>

    <!-- Sticky Pill Dock Navigation Header -->
    <Header />

    <!-- Main Content Body -->
    <main class="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
      <router-view v-slot="{ Component }">
        <transition name="liquid-page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Floating Pill Footer -->
    <Footer />
  </div>
</template>

<script setup>
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
</script>

<style>
.liquid-page-enter-active,
.liquid-page-leave-active {
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.liquid-page-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.99);
}
.liquid-page-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.99);
}
</style>
