<script setup lang="ts">
import { localePath } from '~/utils/i18n'

const { locale, dictionary } = useLocaleDict()
const error = ref<string | null>(null)
const pending = ref(false)

useHead({
  title: dictionary.value.newNote.title,
  htmlAttrs: { lang: locale.value },
})

async function onSubmit(event: Event) {
  event.preventDefault()
  pending.value = true
  error.value = null
  const form = event.target as HTMLFormElement
  const fd = new FormData(form)

  try {
    const data = await $fetch<{ slug?: string, error?: string }>('/api/notes', {
      method: 'POST',
      body: {
        title: String(fd.get('title') || ''),
        slug: String(fd.get('slug') || ''),
        body: String(fd.get('body') || ''),
        locale: locale.value,
      },
    })
    await navigateTo(localePath(locale.value, `/notes/${data.slug}`))
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }, statusMessage?: string }
    error.value
      = err?.data?.statusMessage || err?.statusMessage || 'Create failed.'
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-4">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ dictionary.newNote.title }}
      </h1>
      <p class="mt-2 text-sm text-zinc-600">
        {{ dictionary.newNote.intro }}
      </p>
    </div>
    <form class="space-y-4" @submit="onSubmit">
      <div class="space-y-1.5">
        <label for="title" class="block text-sm font-medium">
          {{ dictionary.newNote.noteTitle }}
        </label>
        <input
          id="title"
          name="title"
          required
          class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
      </div>
      <div class="space-y-1.5">
        <label for="slug" class="block text-sm font-medium">
          {{ dictionary.newNote.slug }}
        </label>
        <input
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          placeholder="my-note"
          class="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
        >
      </div>
      <div class="space-y-1.5">
        <label for="body" class="block text-sm font-medium">
          {{ dictionary.newNote.body }}
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows="8"
          class="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
        >## New note

Write markdown here.</textarea>
      </div>
      <p v-if="error" class="text-sm text-red-600">
        {{ error }}
      </p>
      <button
        type="submit"
        :disabled="pending"
        class="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {{ pending ? '…' : dictionary.newNote.submit }}
      </button>
    </form>
  </div>
</template>
