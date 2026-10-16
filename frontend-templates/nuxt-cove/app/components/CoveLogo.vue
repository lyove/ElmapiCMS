<script setup lang="ts">
withDefaults(defineProps<{
  name?: string
  tone?: 'light' | 'dark'
}>(), {
  name: 'Cove',
  tone: 'dark'
})
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <span
      class="flex h-7 w-7 items-center justify-center rounded-full bg-lime-400 text-forest-900"
      aria-hidden="true"
    >
      <UIcon name="i-lucide-waves" class="size-3.5" />
    </span>
    <span
      class="text-[1.05rem] font-semibold tracking-tight"
      :class="tone === 'light' ? 'text-white' : 'text-ink-900'"
    >
      {{ name }}
    </span>
  </span>
</template>
