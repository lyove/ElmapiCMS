<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

const { locale, dictionary } = useLocaleDict()
const { user, refresh, loaded } = useAuth()

if (!loaded.value) {
  await refresh()
}

useHead({
  title: dictionary.value.account.title,
  htmlAttrs: { lang: locale.value },
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold tracking-tight">
      {{ dictionary.account.title }}
    </h1>
    <p class="text-sm text-zinc-700">
      {{ dictionary.account.signedInAs }}
      <strong>{{ user?.email || user?.id }}</strong>
    </p>
    <p v-if="user?.name" class="text-sm text-zinc-600">
      {{ user.name }}
    </p>
    <p class="max-w-xl rounded border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
      {{ dictionary.account.sessionNote }}
    </p>
  </div>
</template>
