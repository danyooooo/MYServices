<script setup>
import { onMounted, ref } from 'vue'
import DOMPurify from 'dompurify'
import { dataOf, errorText, get } from './api'

const notices = ref([])
const limit = ref(4)
const loading = ref(false)
const error = ref('')
const hasMore = ref(true)

function safeContent(html) {
  const clean = DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'img', 'figure', 'figcaption'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height'],
  })
  const document = new DOMParser().parseFromString(clean, 'text/html')
  document.querySelectorAll('a').forEach(link => {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  })
  document.querySelectorAll('img').forEach(image => {
    image.loading = 'lazy'
    image.referrerPolicy = 'no-referrer'
  })
  return document.body.innerHTML
}
function safeImage(url) {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : '' }
  catch { return '' }
}
async function fetchNotices(nextLimit = limit.value) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const result = dataOf(await get('/rapidkl/no-auth/announcements', { maxposts: nextLimit }))
    const received = Array.isArray(result) ? result : []
    hasMore.value = received.length >= nextLimit && (notices.value.length === 0 || received.length > notices.value.length)
    notices.value = received.map(item => ({
      ...item,
      safeContent: safeContent(item.content),
      safeFeaturedImage: safeImage(item.featured_image),
    })).sort((a, b) => String(b.date_published || '').localeCompare(String(a.date_published || '')))
    limit.value = nextLimit
  } catch (reason) { error.value = errorText(reason) }
  finally { loading.value = false }
}
function loadMore() { fetchNotices(limit.value + 4) }
onMounted(() => fetchNotices())
</script>

<template>
  <section class="liquid-card notice-panel rapid-notices" aria-label="Rapid KL notices">
    <div class="panel-heading"><span class="section-kicker">Service information</span><h3>Rapid KL notices</h3><p>Read full posts from the provider, with their original publication dates.</p></div>
    <div v-if="loading && !notices.length" class="state-card">Loading notices…</div>
    <div v-if="error" class="state-card error">{{ error }} <button type="button" @click="fetchNotices()">Retry</button></div>
    <div v-if="notices.length" class="rapid-notice-list">
      <details v-for="notice in notices" :key="notice.id" class="rapid-notice">
        <summary><span><strong>{{ notice.title || 'Service update' }}</strong><small>{{ notice.date_published || 'Publication date unavailable' }}</small></span><span class="notice-expand">Read post <span aria-hidden="true">⌄</span></span></summary>
        <div class="rapid-notice-body">
          <p v-if="notice.excerpt" class="notice-excerpt">{{ notice.excerpt }}</p>
          <div v-if="notice.categories?.length || notice.tags?.length" class="notice-tags"><span v-for="category in notice.categories || []" :key="`category-${category.id}`">{{ category.name }}</span><span v-for="tag in notice.tags || []" :key="`tag-${tag.id}`">{{ tag.name }}</span></div>
          <img v-if="notice.safeFeaturedImage && !notice.safeContent.includes('<img')" class="notice-featured" :src="notice.safeFeaturedImage" :alt="notice.title || 'Notice image'" loading="lazy" referrerpolicy="no-referrer">
          <div v-if="notice.safeContent" class="notice-content" v-html="notice.safeContent"></div>
          <p v-else-if="!notice.excerpt" class="panel-footnote">No additional post content was provided.</p>
          <p v-if="notice.date_modified && notice.date_modified !== notice.date_published" class="panel-footnote">Updated {{ notice.date_modified }}</p>
        </div>
      </details>
    </div>
    <div v-else-if="!loading && !error" class="state-card">No notices were returned.</div>
    <div v-if="notices.length" class="notice-footer"><span>{{ notices.length }} posts shown</span><button v-if="hasMore" class="secondary-button" type="button" :disabled="loading" @click="loadMore">{{ loading ? 'Loading…' : 'Load more posts' }}</button></div>
  </section>
</template>
