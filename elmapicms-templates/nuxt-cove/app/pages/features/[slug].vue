<script setup lang="ts">
const route = useRoute()
const { data, error } = await useFetch(`/api/features/${route.params.slug}`, {
  key: `feature-${route.params.slug}`
})

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 404,
    statusMessage: 'Feature not found'
  })
}

const settings = computed(() => data.value?.settings)
const feature = computed(() => data.value?.feature)

useCoveSeo({
  title: feature.value?.fields?.['seo-title'] || feature.value?.fields?.title,
  description: feature.value?.fields?.['seo-description'] || feature.value?.fields?.summary,
  path: `/features/${route.params.slug}`,
  siteName: settings.value?.fields?.['site-name'],
  siteUrl: settings.value?.fields?.['site-url'],
  defaultDescription: settings.value?.fields?.['seo-description'],
  defaultOgImage: firstAssetUrl(settings.value?.fields?.['og-image']),
  imageUrl: firstAssetUrl(feature.value?.fields?.image)
})
</script>

<template>
  <article v-if="feature">
    <PageHero
      eyebrow="Feature"
      :title="feature.fields.title || 'Feature'"
      :intro="feature.fields.summary"
      dark
    />
    <div class="cove-wrap max-w-3xl py-14">
      <NuxtLink to="/features" class="text-sm font-medium text-forest-700 hover:text-forest-800">
        ← All features
      </NuxtLink>
      <img
        v-if="firstAssetUrl(feature.fields.image)"
        :src="firstAssetUrl(feature.fields.image)!"
        :alt="feature.fields.title || ''"
        class="mt-8 aspect-[16/10] w-full rounded-2xl object-cover"
      >
      <RichText class="mt-10" :html="data?.bodyHtml" />
    </div>
  </article>
</template>
