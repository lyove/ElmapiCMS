<script setup lang="ts">
const route = useRoute()
const version = computed(() => String(route.params.version))
const slug = computed(() => String(route.params.slug))

const { data, error } = await useFetch(
  () => `/api/docs/${version.value}/articles/${slug.value}`,
  { watch: [version, slug] }
)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Article not found' })
}

useDocsSeo(computed(() => data.value?.seo))
</script>

<template>
  <div
    v-if="data"
    class="xl:-me-4 xl:grid xl:grid-cols-[minmax(0,1fr)_12.5rem] xl:gap-12 2xl:grid-cols-[minmax(0,1fr)_14rem]"
  >
    <article class="min-w-0">
      <header class="mb-8 space-y-3">
        <p
          v-if="data.category?.fields.slug"
          class="text-sm font-medium text-docs-primary"
        >
          <NuxtLink
            :to="`/v/${version}/category/${data.category.fields.slug}`"
            class="hover:underline hover:underline-offset-4"
          >
            {{ data.category.fields.title }}
          </NuxtLink>
        </p>
        <h1 class="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem] sm:leading-[1.2]">
          {{ data.article.fields.title || 'Untitled' }}
        </h1>
        <p
          v-if="data.article.fields.summary"
          class="max-w-2xl text-[15.5px] leading-7 text-muted-foreground"
        >
          {{ data.article.fields.summary }}
        </p>
      </header>
      <DocsMarkdown :html="data.html" />
      <PrevNext
        :version-slug="version"
        :prev="data.prev"
        :next="data.next"
      />
    </article>
    <aside class="sticky top-24 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto pt-1 xl:block">
      <DocsToc :items="data.toc" />
    </aside>
  </div>
</template>
