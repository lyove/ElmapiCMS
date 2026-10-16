<script setup lang="ts">
const { data } = await useFetch('/api/blog', { key: 'blog-index' })

const settings = computed(() => data.value?.settings)
const page = computed(() => data.value?.page)
const posts = computed(() => data.value?.posts || [])

useCoveSeo({
  title: page.value?.fields?.['seo-title'] || page.value?.fields?.title,
  description: page.value?.fields?.['seo-description'] || page.value?.fields?.intro,
  path: '/blog',
  siteName: settings.value?.fields?.['site-name'],
  siteUrl: settings.value?.fields?.['site-url'],
  defaultDescription: settings.value?.fields?.['seo-description'],
  defaultOgImage: firstAssetUrl(settings.value?.fields?.['og-image'])
})

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div v-if="page">
    <PageHero
      eyebrow="Blog"
      :title="page.fields.title || 'Blog'"
      :intro="page.fields.intro"
      dark
    />

    <section class="cove-section">
      <div class="cove-wrap grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="post in posts"
          :key="post.uuid"
          :to="`/blog/${post.fields.slug}`"
          class="group overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:shadow-lg"
        >
          <div class="aspect-[16/10] overflow-hidden bg-ink-100">
            <img
              v-if="firstAssetUrl(post.fields['cover-image'])"
              :src="firstAssetUrl(post.fields['cover-image'])!"
              :alt="post.fields.title || ''"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            >
          </div>
          <div class="p-5">
            <p class="text-xs font-medium text-ink-400">
              <span v-if="post.fields.category?.fields?.name">
                {{ post.fields.category.fields.name }}
              </span>
              <span v-if="post.published_at"> · {{ formatDate(post.published_at) }}</span>
            </p>
            <h2 class="mt-2 text-xl font-semibold text-ink-900 group-hover:text-forest-700">
              {{ post.fields.title }}
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-ink-500">
              {{ post.fields.excerpt }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
