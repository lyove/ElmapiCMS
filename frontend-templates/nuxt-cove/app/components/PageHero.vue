<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  intro?: string
  dark?: boolean
}>()
</script>

<template>
  <section :class="dark ? 'bg-forest-700 text-white' : 'bg-[var(--color-canvas)]'">
    <div class="cove-wrap max-w-3xl py-16 sm:py-20">
      <span
        v-if="eyebrow"
        class="cove-pill"
        :class="dark ? 'border-white/15 bg-white/10 text-white' : ''"
      >
        <span class="cove-pill-dot" :class="dark ? 'bg-lime-400' : ''" />
        {{ eyebrow }}
      </span>
      <h1
        class="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-5xl"
        :class="dark ? 'text-white' : 'text-ink-900'"
      >
        {{ title }}
      </h1>
      <p
        v-if="intro"
        class="mt-5 text-lg leading-relaxed"
        :class="dark ? 'text-white/75' : 'text-ink-500'"
      >
        {{ intro }}
      </p>
    </div>
  </section>
</template>
