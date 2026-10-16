<script setup lang="ts">
const route = useRoute()
const { data, error } = await useFetch(`/api/changelog/${route.params.slug}`, {
  key: `changelog-${route.params.slug}`
})

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 404,
    statusMessage: 'Changelog entry not found'
  })
}

const settings = computed(() => data.value?.settings)
const entry = computed(() => data.value?.entry)

useCoveSeo({
  title: entry.value?.fields?.['seo-title'] || entry.value?.fields?.title,
  description: entry.value?.fields?.['seo-description'] || entry.value?.fields?.summary,
  path: `/changelog/${route.params.slug}`,
  siteName: settings.value?.fields?.['site-name'],
  siteUrl: settings.value?.fields?.['site-url'],
  defaultDescription: settings.value?.fields?.['seo-description'],
  defaultOgImage: firstAssetUrl(settings.value?.fields?.['og-image'])
})

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <article v-if="entry">
    <PageHero
      eyebrow="Changelog"
      :title="entry.fields.title || 'Update'"
      :intro="entry.fields.summary"
      dark
    />
    <div class="cove-wrap max-w-3xl py-14">
      <NuxtLink to="/changelog" class="text-sm font-medium text-forest-700">
        ← Changelog
      </NuxtLink>
      <p class="mt-4 text-sm text-ink-400">
        <span v-if="entry.fields.version">v{{ entry.fields.version }}</span>
        <span v-if="entry.published_at"> · {{ formatDate(entry.published_at) }}</span>
      </p>
      <RichText class="mt-8" :html="data?.bodyHtml" />
    </div>
  </article>
</template>
