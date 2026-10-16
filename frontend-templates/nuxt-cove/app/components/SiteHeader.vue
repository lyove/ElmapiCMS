<script setup lang="ts">
const props = defineProps<{
  siteName?: string
  primaryLabel?: string
  primaryUrl?: string
}>()

const items = [
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Changelog', to: '/changelog' },
  { label: 'Blog', to: '/blog' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' }
]

const open = ref(false)
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md">
    <div class="cove-wrap flex h-16 items-center justify-between gap-4">
      <NuxtLink to="/" class="shrink-0" @click="open = false">
        <CoveLogo :name="props.siteName || 'Cove'" />
      </NuxtLink>

      <nav class="hidden items-center gap-7 lg:flex" aria-label="Primary">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="text-sm font-medium text-ink-600 transition hover:text-ink-900"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-3">
        <UButton
          class="hidden sm:inline-flex"
          :to="props.primaryUrl || '/pricing'"
          color="primary"
          size="md"
        >
          <span class="text-forest-900">{{ props.primaryLabel || 'Start free' }}</span>
        </UButton>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center lg:hidden"
          :aria-label="open ? 'Close menu' : 'Open menu'"
          @click="open = !open"
        >
          <span class="flex w-5 flex-col gap-1.5">
            <span class="h-0.5 w-full bg-ink-900" />
            <span class="h-0.5 w-full bg-ink-900" />
          </span>
        </button>
      </div>
    </div>

    <div
      v-if="open"
      class="border-t border-black/5 bg-white lg:hidden"
    >
      <nav class="cove-wrap flex flex-col gap-1 py-4" aria-label="Mobile">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="rounded-xl px-3 py-2.5 text-base font-medium text-ink-700 hover:bg-ink-50"
          @click="open = false"
        >
          {{ item.label }}
        </NuxtLink>
        <UButton
          class="mt-2"
          :to="props.primaryUrl || '/pricing'"
          color="primary"
          block
          @click="open = false"
        >
          <span class="text-forest-900">{{ props.primaryLabel || 'Start free' }}</span>
        </UButton>
      </nav>
    </div>
  </header>
</template>
