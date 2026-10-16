<script setup lang="ts">
const { locale, dictionary } = useLocaleDict()
const error = ref<string | null>(null)
const pending = ref(false)
const result = ref<{ url?: string, uuid?: string, alt_text?: string | null } | null>(null)

useHead({
  title: dictionary.value.upload.title,
  htmlAttrs: { lang: locale.value },
})

async function onSubmit(event: Event) {
  event.preventDefault()
  pending.value = true
  error.value = null
  result.value = null
  const form = event.target as HTMLFormElement
  const fd = new FormData(form)

  try {
    const data = await $fetch<{
      url?: string
      uuid?: string
      alt_text?: string | null
    }>('/api/assets/upload', {
      method: 'POST',
      body: fd,
    })
    result.value = data
    form.reset()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }, statusMessage?: string }
    error.value
      = err?.data?.statusMessage || err?.statusMessage || 'Upload failed.'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-4">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ dictionary.upload.title }}
      </h1>
      <p class="mt-2 text-sm text-zinc-600">
        {{ dictionary.upload.intro }}
      </p>
    </div>
    <form class="space-y-4" @submit="onSubmit">
      <div class="space-y-1.5">
        <label for="file" class="block text-sm font-medium">
          {{ dictionary.upload.file }}
        </label>
        <input id="file" name="file" type="file" required class="block w-full text-sm">
      </div>
      <div class="space-y-1.5">
        <label for="alt_text" class="block text-sm font-medium">
          {{ dictionary.upload.alt }}
        </label>
        <input
          id="alt_text"
          name="alt_text"
          type="text"
          class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
      </div>
      <p v-if="error" class="text-sm text-red-600">
        {{ error }}
      </p>
      <div
        v-if="result"
        class="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900"
      >
        <p>{{ dictionary.upload.success }}</p>
        <p v-if="result.uuid" class="mt-1 font-mono text-xs">
          uuid: {{ result.uuid }}
        </p>
        <p v-if="result.alt_text" class="mt-1 text-xs">
          alt: {{ result.alt_text }}
        </p>
        <a
          v-if="result.url"
          :href="result.url"
          target="_blank"
          rel="noreferrer"
          class="mt-1 block break-all underline"
        >{{ result.url }}</a>
      </div>
      <button
        type="submit"
        :disabled="pending"
        class="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {{ pending ? '…' : dictionary.upload.submit }}
      </button>
    </form>
  </div>
</template>
