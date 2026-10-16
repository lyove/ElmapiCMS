<script setup lang="ts">
const route = useRoute()
const { data, error } = await useFetch(`/api/blog/${route.params.slug}`, {
  key: `blog-${route.params.slug}`
})

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 404,
    statusMessage: 'Post not found'
  })
}

const settings = computed(() => data.value?.settings)
const post = computed(() => data.value?.post)

useCoveSeo({
  title: post.value?.fields?.['seo-title'] || post.value?.fields?.title,
  description: post.value?.fields?.['seo-description'] || post.value?.fields?.excerpt,
  path: `/blog/${route.params.slug}`,
  siteName: settings.value?.fields?.['site-name'],
  siteUrl: settings.value?.fields?.['site-url'],
  defaultDescription: settings.value?.fields?.['seo-description'],
  defaultOgImage: firstAssetUrl(settings.value?.fields?.['og-image']),
  imageUrl:
    firstAssetUrl(post.value?.fields?.['og-image'])
    || firstAssetUrl(post.value?.fields?.['cover-image'])
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
  <article v-if="post">
    <PageHero
      eyebrow="Blog"
      :title="post.fields.title || 'Post'"
      :intro="post.fields.excerpt"
      dark
    />
    <div class="cove-wrap max-w-3xl py-14">
      <NuxtLink to="/blog" class="text-sm font-medium text-forest-700">
        ← All posts
      </NuxtLink>
      <p class="mt-4 text-sm text-ink-400">
        <span v-if="post.fields.author?.fields?.name">
          {{ post.fields.author.fields.name }}
        </span>
        <span v-if="post.published_at"> · {{ formatDate(post.published_at) }}</span>
      </p>
      <img
        v-if="firstAssetUrl(post.fields['cover-image'])"
        :src="firstAssetUrl(post.fields['cover-image'])!"
        :alt="post.fields.title || ''"
        class="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
      >
      <RichText class="mt-10" :html="data?.bodyHtml" />
    </div>
  </article>
</template>
