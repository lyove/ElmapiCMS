<script setup lang="ts">
import { locales, localeLabels, type Locale } from '~/utils/i18n'

defineProps<{
  locale: Locale
  label: string
}>()

const route = useRoute()

function pathForLocale(target: Locale) {
  const segments = route.path.split('/')
  segments[1] = target
  const path = segments.join('/') || `/${target}`
  const query = route.fullPath.includes('?')
    ? `?${route.fullPath.split('?')[1]}`
    : ''
  return `${path}${query}`
}
</script>

<template>
  <div class="flex items-center gap-1" role="group" :aria-label="label">
    <NuxtLink
      v-for="code in locales"
      :key="code"
      :to="pathForLocale(code)"
      class="rounded px-2 py-1 text-xs font-medium uppercase"
      :class="
        code === locale
          ? 'bg-zinc-900 text-white'
          : 'text-zinc-600 hover:bg-zinc-100'
      "
      :aria-current="code === locale ? 'true' : undefined"
      :title="localeLabels[code]"
    >
      {{ code }}
    </NuxtLink>
  </div>
</template>
