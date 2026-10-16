<script setup lang="ts">
const route = useRoute()
const version = computed(() => String(route.params.version))
const slug = computed(() => String(route.params.slug))

const { data, error } = await useFetch(
  () => `/api/docs/${version.value}/categories/${slug.value}`,
  { watch: [version, slug] }
)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found' })
}

useDocsSeo(computed(() => data.value?.seo))
</script>

<template>
  <div
    v-if="data"
    class="space-y-8"
  >
    <header class="space-y-3">
      <p class="text-sm font-medium text-docs-primary">
        Category
      </p>
      <h1 class="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem] sm:leading-[1.2]">
        {{ data.category.fields.title || 'Untitled' }}
      </h1>
      <p
        v-if="data.category.fields.description"
        class="max-w-2xl text-[15.5px] leading-7 text-muted-foreground"
      >
        {{ data.category.fields.description }}
      </p>
    </header>

    <ul class="space-y-0.5">
      <li
        v-for="article in data.section.articles"
        :key="article.uuid"
      >
        <NuxtLink
          :to="`/v/${version}/${article.slug}`"
          class="group flex items-start justify-between gap-4 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-accent/70"
        >
          <span>
            <span class="block text-[15px] font-medium tracking-tight text-foreground group-hover:text-docs-primary">
              {{ article.title }}
            </span>
            <span
              v-if="article.summary"
              class="mt-0.5 block text-sm leading-6 text-muted-foreground"
            >
              {{ article.summary }}
            </span>
          </span>
          <UIcon
            name="i-lucide-arrow-right"
            class="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-docs-primary"
          />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
