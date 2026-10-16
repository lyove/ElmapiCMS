<script setup lang="ts">
import type { ContentEntry, DocVersionFields } from '../../server/utils/types'

const props = defineProps<{
  versions: ContentEntry<DocVersionFields>[]
  currentSlug: string
}>()

function onChange(event: Event) {
  const nextSlug = (event.target as HTMLSelectElement).value
  if (!nextSlug || nextSlug === props.currentSlug) return
  navigateTo(`/v/${encodeURIComponent(nextSlug)}`)
}
</script>

<template>
  <label class="relative inline-flex items-center">
    <span class="sr-only">Documentation version</span>
    <select
      :value="currentSlug"
      class="h-8 appearance-none rounded-md border border-border bg-background pr-8 pl-2.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-docs-primary/30"
      @change="onChange"
    >
      <option
        v-for="version in versions"
        :key="version.uuid"
        :value="version.fields.slug || version.uuid"
      >
        {{ version.fields.label || version.fields.slug || version.uuid }}
      </option>
    </select>
    <UIcon
      name="i-lucide-chevron-down"
      class="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
    />
  </label>
</template>
