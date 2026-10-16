<script setup lang="ts">
const route = useRoute()
const version = computed(() => String(route.params.version))

const { data: layout, error, pending } = await useFetch(
  () => `/api/docs/${version.value}/layout`,
  { watch: [version] }
)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Version not found' })
}

if (error.value && !layout.value) {
  throw createError({
    statusCode: error.value.statusCode || 500,
    statusMessage: error.value.statusMessage || 'Failed to load docs layout'
  })
}
</script>

<template>
  <div
    v-if="pending && !layout"
    class="flex min-h-svh items-center justify-center text-sm text-muted-foreground"
  >
    Loading docs…
  </div>
  <DocsShell
    v-else-if="layout"
    :site-name="layout.siteName"
    :version-slug="version"
    :versions="layout.versions"
    :nav="layout.nav"
    :search-items="layout.searchItems"
  >
    <NuxtPage />
  </DocsShell>
</template>
