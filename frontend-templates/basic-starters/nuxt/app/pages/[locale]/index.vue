<script setup lang="ts">
import { localePath } from '~/utils/i18n'

const { locale, dictionary } = useLocaleDict()

const { data, error } = await useAsyncData(
  () => `home-${locale.value}`,
  async () => {
    const [settings, notesRes] = await Promise.all([
      $fetch('/api/settings', { query: { locale: locale.value } }),
      $fetch('/api/notes', {
        query: { locale: locale.value, page: 1, perPage: 3 },
      }),
    ])
    return { settings, notes: notesRes.notes?.data || [] }
  },
  { watch: [locale] },
)

useHead({
  title: data.value?.settings?.fields?.['seo-title']
    || data.value?.settings?.fields?.['site-name']
    || dictionary.value.home.title,
  meta: [
    {
      name: 'description',
      content:
        data.value?.settings?.fields?.['seo-description']
        || data.value?.settings?.fields?.tagline
        || dictionary.value.home.intro,
    },
  ],
  htmlAttrs: { lang: locale.value },
})
</script>

<template>
  <div class="space-y-8">
    <section class="space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ data?.settings?.fields?.['site-name'] || dictionary.home.title }}
      </h1>
      <p class="max-w-2xl text-zinc-600">
        {{ data?.settings?.fields?.tagline || dictionary.home.intro }}
      </p>
    </section>

    <p
      v-if="error"
      class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      {{ dictionary.errors.loadFailed }}
    </p>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-medium">
          {{ dictionary.home.latestNotes }}
        </h2>
        <NuxtLink
          :to="localePath(locale, '/notes')"
          class="text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
        >
          {{ dictionary.home.viewAll }}
        </NuxtLink>
      </div>
      <ul class="divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
        <li
          v-if="!data?.notes?.length"
          class="px-4 py-3 text-sm text-zinc-500"
        >
          {{ dictionary.notes.empty }}
        </li>
        <li v-for="note in data?.notes || []" :key="note.uuid">
          <NuxtLink
            :to="localePath(locale, `/notes/${note.fields.slug}`)"
            class="block px-4 py-3 hover:bg-zinc-50"
          >
            <span class="font-medium">{{ note.fields.title }}</span>
            <span class="mt-0.5 block font-mono text-xs text-zinc-500">
              {{ note.fields.slug }}
            </span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
