<script setup lang="ts">
import type { SearchItem } from '../../server/utils/types'

const props = defineProps<{
  items: SearchItem[]
  versionSlug: string
  class?: string
}>()

const emit = defineEmits<{
  navigate: []
}>()

const query = ref('')

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return props.items
    .filter((item) => {
      const haystack
        = `${item.title} ${item.summary} ${item.categoryTitle}`.toLowerCase()
      return haystack.includes(q)
    })
    .slice(0, 8)
})

function onNavigate() {
  query.value = ''
  emit('navigate')
}
</script>

<template>
  <div
    class="relative"
    :class="props.class"
  >
    <label
      class="sr-only"
      for="docs-search"
    >Search documentation</label>
    <div class="relative">
      <UIcon
        name="i-lucide-search"
        class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <UInput
        id="docs-search"
        v-model="query"
        placeholder="Search..."
        autocomplete="off"
        class="h-8 pl-8 text-sm"
        :ui="{ base: 'bg-background' }"
      />
    </div>
    <div
      v-if="query.trim()"
      class="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-40 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
    >
      <p
        v-if="results.length === 0"
        class="px-3 py-2.5 text-sm text-muted-foreground"
      >
        No matches for "{{ query.trim() }}".
      </p>
      <ul
        v-else
        class="max-h-72 overflow-auto py-1"
      >
        <li
          v-for="item in results"
          :key="item.slug"
        >
          <NuxtLink
            :to="`/v/${versionSlug}/${item.slug}`"
            class="block px-3 py-2 transition-colors hover:bg-muted"
            @click="onNavigate"
          >
            <span class="block text-sm font-medium text-foreground">
              {{ item.title }}
            </span>
            <span class="mt-0.5 block text-xs text-muted-foreground">
              {{ item.categoryTitle }}<template v-if="item.summary"> · {{ item.summary }}</template>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
