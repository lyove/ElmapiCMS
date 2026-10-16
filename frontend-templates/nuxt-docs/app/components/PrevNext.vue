<script setup lang="ts">
defineProps<{
  versionSlug: string
  prev: { title: string, slug: string } | null
  next: { title: string, slug: string } | null
}>()
</script>

<template>
  <nav
    v-if="prev || next"
    aria-label="Adjacent articles"
    class="mt-16 grid gap-3 border-t border-border/80 pt-8 sm:grid-cols-2"
  >
    <NuxtLink
      v-if="prev"
      :to="`/v/${versionSlug}/${prev.slug}`"
      class="group flex flex-col gap-1.5 rounded-xl border border-border/80 px-4 py-3.5 transition-colors hover:bg-accent/70"
    >
      <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <UIcon
          name="i-lucide-chevron-left"
          class="size-3.5 transition-transform group-hover:-translate-x-0.5"
        />
        Previous
      </span>
      <span class="text-sm font-medium tracking-tight text-foreground">
        {{ prev.title }}
      </span>
    </NuxtLink>
    <div v-else />

    <NuxtLink
      v-if="next"
      :to="`/v/${versionSlug}/${next.slug}`"
      class="group flex flex-col items-end gap-1.5 rounded-xl border border-border/80 px-4 py-3.5 text-right transition-colors hover:bg-accent/70"
    >
      <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
        Next
        <UIcon
          name="i-lucide-chevron-right"
          class="size-3.5 transition-transform group-hover:translate-x-0.5"
        />
      </span>
      <span class="text-sm font-medium tracking-tight text-foreground">
        {{ next.title }}
      </span>
    </NuxtLink>
  </nav>
</template>
