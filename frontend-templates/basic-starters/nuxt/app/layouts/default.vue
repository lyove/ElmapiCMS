<script setup lang="ts">
const { locale, dictionary } = useLocaleDict()
const { refresh, loaded } = useAuth()

const { data: settings } = await useAsyncData(
  () => `settings-${locale.value}`,
  () => $fetch('/api/settings', { query: { locale: locale.value } }),
  { watch: [locale] },
)

const siteName = computed(
  () => settings.value?.fields?.['site-name'] || 'Elmapi Basic Starter',
)

onMounted(async () => {
  if (!loaded.value) await refresh()
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <SiteHeader :locale="locale" :dictionary="dictionary" :site-name="siteName" />
    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <slot />
    </main>
    <footer class="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
      Elmapi basic starter · {{ locale }}
    </footer>
  </div>
</template>
