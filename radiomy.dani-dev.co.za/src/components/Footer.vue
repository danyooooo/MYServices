<template>
  <footer class="relative z-10 py-8 px-4 flex justify-center w-full">
    <div class="radio-footer-bar w-full py-4 px-6 rounded-3xl sm:rounded-full flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
      
      <!-- Left Copyright & Brand -->
      <div class="flex items-center gap-2.5">
        <router-link to="/" class="inline-flex items-center gap-2 font-bold text-white no-underline">
          <span class="w-2 h-2 rounded-full bg-[#fbbf24] shadow-[0_0_8px_#fbbf24]"></span>
          <span>Radio<span class="text-[#fbbf24]">MY</span></span>
        </router-link>
        <span class="text-slate-500 opacity-50">&bull;</span>
        <a href="https://dani-dev.co.za" target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-white font-medium hover:underline transition-colors">&copy; {{ new Date().getFullYear() }} dani dev</a>
      </div>

      <a href="https://github.com/danyooooo/malaysian-api" target="_blank" rel="noopener noreferrer" title="malaysian-api on GitHub" class="text-slate-400 font-medium no-underline hover:text-white hover:underline transition-colors">
        Powered by malaysian-api <span aria-hidden="true" class="opacity-60">↗</span>
      </a>

    </div>
  </footer>
</template>

