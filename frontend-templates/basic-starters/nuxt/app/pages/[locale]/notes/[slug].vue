<script setup lang="ts">
import { localePath } from '~/utils/i18n'

const { locale, dictionary } = useLocaleDict()
const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

const { data, error } = await useAsyncData(
  () => `note-${locale.value}-${slug.value}`,
  () =>
    $fetch(`/api/notes/${slug.value}`, {
      query: { locale: locale.value },
    }),
  { watch: [locale, slug] },
)

useHead({
  title: data.value?.note?.fields?.['seo-title'] || data.value?.note?.fields?.title,
  meta: [
    {
      name: 'description',
      content: data.value?.note?.fields?.['seo-description'] || '',
    },
  ],
  htmlAttrs: { lang: locale.value },
})
</script>

<template>
  <article class="space-y-6">
    <p
      v-if="error"
      class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      {{ dictionary.errors.loadFailed }}
    </p>
    <template v-else-if="data?.note">
      <div>
        <NuxtLink
          :to="localePath(locale, '/notes')"
          class="text-sm text-zinc-500 underline underline-offset-2"
        >
          {{ dictionary.notes.backToList }}
        </NuxtLink>
        <h1 class="mt-3 text-2xl font-semibold tracking-tight">
          {{ data.note.fields.title }}
        </h1>
        <p
          v-if="data.note.fields['author-name']"
          class="mt-1 text-sm text-zinc-500"
        >
          {{ dictionary.notes.author }}: {{ data.note.fields['author-name'] }}
        </p>
      </div>
      <RichText :html="data.html" />
    </template>
  </article>
</template>
