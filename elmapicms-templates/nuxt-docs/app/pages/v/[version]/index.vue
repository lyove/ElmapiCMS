<script setup lang="ts">
const route = useRoute()
const version = computed(() => String(route.params.version))

const { data, error } = await useFetch(
  () => `/api/docs/${version.value}`,
  { watch: [version] }
)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Version not found' })
}

useDocsSeo(computed(() => data.value?.seo))
</script>

<template>
  <div
    v-if="data"
    class="space-y-12"
  >
    <header class="space-y-3">
      <p class="text-sm font-medium text-docs-primary">
        Version {{ data.version.fields.label || version }}
      </p>
      <h1 class="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem] sm:leading-[1.2]">
        {{ data.siteName }}
      </h1>
      <p
        v-if="data.tagline"
        class="max-w-2xl text-[15.5px] leading-7 text-muted-foreground"
      >
        {{ data.tagline }}
      </p>
      <p
        v-if="data.version.fields.description"
        class="max-w-2xl text-sm leading-6 text-muted-foreground"
      >
        {{ data.version.fields.description }}
      </p>
      <p
        v-if="data.homeIntro"
        class="max-w-2xl text-[15.5px] leading-7 text-foreground/90"
      >
        {{ data.homeIntro }}
      </p>
      <div
        v-if="data.nav[0]?.articles[0]"
        class="pt-2"
      >
        <NuxtLink
          :to="`/v/${version}/${data.nav[0].articles[0].slug}`"
          class="inline-flex items-center gap-2 rounded-lg bg-docs-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Start with {{ data.nav[0].articles[0].title }}
          <UIcon
            name="i-lucide-arrow-right"
            class="size-4"
          />
        </NuxtLink>
      </div>
    </header>

    <section
      class="space-y-10"
      aria-label="Browse by category"
    >
      <p
        v-if="data.nav.length === 0"
        class="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-sm text-muted-foreground"
      >
        No published articles for this version yet.
      </p>
      <div
        v-for="category in data.nav"
        :key="category.uuid"
        class="space-y-3"
      >
        <div>
          <h2 class="text-lg font-semibold tracking-tight">
            <NuxtLink
              :to="`/v/${version}/category/${category.slug}`"
              class="text-foreground transition-colors hover:text-docs-primary"
            >
              {{ category.title }}
            </NuxtLink>
          </h2>
          <p
            v-if="category.description"
            class="mt-1 text-sm leading-6 text-muted-foreground"
          >
            {{ category.description }}
          </p>
        </div>
        <ul class="space-y-0.5">
          <li
            v-for="article in category.articles"
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
    </section>
  </div>
</template>
