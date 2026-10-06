<script setup lang="ts">
const { data } = await useFetch('/api/changelog', { key: 'changelog-index' })

const settings = computed(() => data.value?.settings)
const page = computed(() => data.value?.page)
const entries = computed(() => data.value?.entries || [])

useCoveSeo({
  title: page.value?.fields?.['seo-title'] || page.value?.fields?.title,
  description: page.value?.fields?.['seo-description'] || page.value?.fields?.intro,
  path: '/changelog',
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
      eyebrow="Changelog"
      :title="page.fields.title || 'Changelog'"
      :intro="page.fields.intro"
      dark
    />

    <section class="cove-section">
      <div class="cove-wrap max-w-3xl space-y-4">
        <NuxtLink
          v-for="entry in entries"
          :key="entry.uuid"
          :to="`/changelog/${entry.fields.slug}`"
          class="block rounded-2xl border border-black/5 bg-white p-6 transition hover:shadow-md"
        >
          <div class="flex flex-wrap items-center gap-3">
            <span
              v-if="entry.fields.version"
              class="rounded-full bg-lime-400/40 px-2.5 py-1 text-xs font-semibold text-forest-800"
            >
              v{{ entry.fields.version }}
            </span>
            <span class="text-xs text-ink-400">
              {{ formatDate(entry.published_at) }}
            </span>
          </div>
          <h2 class="mt-3 text-xl font-semibold text-ink-900">
            {{ entry.fields.title }}
          </h2>
          <p class="mt-2 text-sm text-ink-500">
            {{ entry.fields.summary }}
          </p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
