<script setup lang="ts">
import { localePath } from '~/utils/i18n'

const { locale, dictionary } = useLocaleDict()
const route = useRoute()

const queryParams = computed(() => ({
  locale: locale.value,
  page: Number(route.query.page || 1) || 1,
  perPage: Number(route.query.perPage || 5) || 5,
  title: String(route.query.title || ''),
  slug: String(route.query.slug || ''),
  slugLike: String(route.query.slugLike || ''),
  author: String(route.query.author || ''),
  after: String(route.query.after || ''),
  or: String(route.query.or || ''),
  sort: String(route.query.sort || 'published_at:desc'),
}))

const { data, error, refresh } = await useAsyncData(
  () => `notes-${locale.value}-${JSON.stringify(queryParams.value)}`,
  () => $fetch('/api/notes', { query: queryParams.value }),
  { watch: [queryParams] },
)

useHead({
  title: dictionary.value.notes.title,
  htmlAttrs: { lang: locale.value },
})

const lastPage = computed(() => Math.max(1, data.value?.notes?.meta?.last_page ?? 1))
const page = computed(() => queryParams.value.page)
const pageNumbers = computed(() =>
  Array.from({ length: lastPage.value }, (_, i) => i + 1).slice(0, 8),
)

function hrefFor(overrides: Record<string, string | number | undefined>) {
  const next = { ...queryParams.value, ...overrides }
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(next)) {
    if (key === 'locale') continue
    if (value === undefined || value === '' || value === null) continue
    sp.set(key, String(value))
  }
  const qs = sp.toString()
  return `${localePath(locale.value, '/notes')}${qs ? `?${qs}` : ''}`
}

async function onFilter(event: Event) {
  event.preventDefault()
  const form = event.target as HTMLFormElement
  const fd = new FormData(form)
  const query: Record<string, string> = {}
  for (const [key, value] of fd.entries()) {
    const v = String(value).trim()
    if (v) query[key] = v
  }
  await navigateTo({ path: localePath(locale.value, '/notes'), query })
  await refresh()
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ dictionary.notes.title }}
      </h1>
      <p class="mt-1 text-sm text-zinc-500">
        {{ data?.total ?? 0 }} {{ dictionary.notes.results }} · locale {{ locale }}
      </p>
    </div>

    <form
      class="space-y-3 rounded border border-zinc-200 bg-white p-4"
      @submit="onFilter"
    >
      <h2 class="text-sm font-medium text-zinc-800">
        {{ dictionary.notes.filtersHeading }}
      </h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block space-y-1 text-sm">
          <span class="text-zinc-600">{{ dictionary.notes.titleContains }}</span>
          <input
            name="title"
            :value="queryParams.title"
            class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
        </label>
        <label class="block space-y-1 text-sm">
          <span class="text-zinc-600">{{ dictionary.notes.slugEq }}</span>
          <input
            name="slug"
            :value="queryParams.slug"
            class="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
          >
        </label>
        <label class="block space-y-1 text-sm">
          <span class="text-zinc-600">{{ dictionary.notes.slugContains }}</span>
          <input
            name="slugLike"
            :value="queryParams.slugLike"
            class="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
          >
        </label>
        <label class="block space-y-1 text-sm">
          <span class="text-zinc-600">{{ dictionary.notes.authorContains }}</span>
          <input
            name="author"
            :value="queryParams.author"
            class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
        </label>
        <label class="block space-y-1 text-sm">
          <span class="text-zinc-600">{{ dictionary.notes.publishedAfter }}</span>
          <input
            name="after"
            type="date"
            :value="queryParams.after"
            class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
        </label>
        <label class="block space-y-1 text-sm">
          <span class="text-zinc-600">{{ dictionary.notes.orTerm }}</span>
          <input
            name="or"
            :value="queryParams.or"
            class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
        </label>
        <label class="block space-y-1 text-sm">
          <span class="text-zinc-600">{{ dictionary.notes.sort }}</span>
          <select
            name="sort"
            :value="queryParams.sort"
            class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="published_at:desc">published_at:desc</option>
            <option value="published_at:asc">published_at:asc</option>
            <option value="title:asc">title:asc</option>
            <option value="title:desc">title:desc</option>
          </select>
        </label>
        <label class="block space-y-1 text-sm">
          <span class="text-zinc-600">{{ dictionary.notes.perPage }}</span>
          <select
            name="perPage"
            :value="String(queryParams.perPage)"
            class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="2">2</option>
            <option value="5">5</option>
            <option value="10">10</option>
          </select>
        </label>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="submit" class="rounded bg-zinc-900 px-3 py-2 text-sm text-white">
          {{ dictionary.notes.applyFilter }}
        </button>
        <NuxtLink
          :to="localePath(locale, '/notes')"
          class="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          {{ dictionary.notes.clearFilter }}
        </NuxtLink>
      </div>
    </form>

    <details class="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
      <summary class="cursor-pointer font-medium text-zinc-700">
        {{ dictionary.notes.queryPreview }}
      </summary>
      <pre class="mt-2 overflow-x-auto font-mono text-xs text-zinc-700">{{ JSON.stringify(data?.query || {}, null, 2) }}</pre>
    </details>

    <p
      v-if="error"
      class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      {{ dictionary.errors.loadFailed }}
    </p>

    <ul class="divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
      <li
        v-if="!data?.notes?.data?.length"
        class="px-4 py-3 text-sm text-zinc-500"
      >
        {{ dictionary.notes.empty }}
      </li>
      <li v-for="note in data?.notes?.data || []" :key="note.uuid">
        <NuxtLink
          :to="localePath(locale, `/notes/${note.fields.slug}`)"
          class="block px-4 py-3 hover:bg-zinc-50"
        >
          <span class="font-medium">{{ note.fields.title }}</span>
          <span class="mt-0.5 block font-mono text-xs text-zinc-500">
            {{ note.fields.slug }}
            <template v-if="note.fields['author-name']">
              · {{ note.fields['author-name'] }}
            </template>
            <template v-if="note.published_at">
              · {{ note.published_at.slice(0, 10) }}
            </template>
          </span>
        </NuxtLink>
      </li>
    </ul>

    <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span class="text-zinc-500">
        {{ dictionary.notes.page }} {{ page }} / {{ lastPage }}
      </span>
      <div class="flex flex-wrap gap-1">
        <NuxtLink
          v-if="page > 1"
          :to="hrefFor({ page: page - 1 })"
          class="rounded border border-zinc-300 px-3 py-1.5"
        >
          {{ dictionary.notes.prev }}
        </NuxtLink>
        <NuxtLink
          v-for="n in pageNumbers"
          :key="n"
          :to="hrefFor({ page: n })"
          class="rounded px-3 py-1.5"
          :class="n === page ? 'bg-zinc-900 text-white' : 'border border-zinc-300'"
        >
          {{ n }}
        </NuxtLink>
        <NuxtLink
          v-if="page < lastPage"
          :to="hrefFor({ page: page + 1 })"
          class="rounded border border-zinc-300 px-3 py-1.5"
        >
          {{ dictionary.notes.next }}
        </NuxtLink>
      </div>
    </div>

    <section class="space-y-2 rounded border border-dashed border-zinc-300 p-4">
      <h2 class="text-sm font-medium text-zinc-800">
        {{ dictionary.notes.offsetDemo }}
      </h2>
      <ul class="text-sm text-zinc-700">
        <li
          v-if="!data?.offsetSlice?.length"
          class="text-zinc-500"
        >
          {{ dictionary.notes.empty }}
        </li>
        <li
          v-for="note in data?.offsetSlice || []"
          :key="note.uuid"
          class="font-mono text-xs"
        >
          {{ note.fields.slug }}
        </li>
      </ul>
    </section>
  </div>
</template>
