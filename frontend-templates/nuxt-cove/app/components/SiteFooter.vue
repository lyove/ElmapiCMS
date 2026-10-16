<script setup lang="ts">
defineProps<{
  siteName?: string
  blurb?: string
  email?: string
  twitterUrl?: string
  linkedinUrl?: string
  githubUrl?: string
}>()

const year = new Date().getFullYear()

const product = [
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Changelog', to: '/changelog' }
]

const company = [
  { label: 'About', to: '/about' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact', to: '/contact' }
]
</script>

<template>
  <footer class="border-t border-black/5 bg-white">
    <div class="cove-wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <CoveLogo :name="siteName || 'Cove'" />
        <p class="mt-4 max-w-sm text-sm leading-relaxed text-ink-500">
          {{ blurb || 'Written updates for remote teams.' }}
        </p>
      </div>
      <div>
        <p class="text-sm font-semibold text-ink-900">
          Product
        </p>
        <ul class="mt-4 space-y-2">
          <li v-for="link in product" :key="link.to">
            <NuxtLink :to="link.to" class="text-sm text-ink-500 hover:text-ink-900">
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>
      <div>
        <p class="text-sm font-semibold text-ink-900">
          Company
        </p>
        <ul class="mt-4 space-y-2">
          <li v-for="link in company" :key="link.to">
            <NuxtLink :to="link.to" class="text-sm text-ink-500 hover:text-ink-900">
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
    <div class="cove-wrap flex flex-col gap-3 border-t border-black/5 py-6 text-sm text-ink-400 sm:flex-row sm:items-center sm:justify-between">
      <p>© {{ year }} {{ siteName || 'Cove' }}. All rights reserved.</p>
      <div class="flex flex-wrap gap-4">
        <a v-if="email" :href="`mailto:${email}`" class="hover:text-ink-700">{{ email }}</a>
        <a v-if="twitterUrl" :href="twitterUrl" target="_blank" rel="noopener noreferrer" class="hover:text-ink-700">X</a>
        <a v-if="linkedinUrl" :href="linkedinUrl" target="_blank" rel="noopener noreferrer" class="hover:text-ink-700">LinkedIn</a>
        <a v-if="githubUrl" :href="githubUrl" target="_blank" rel="noopener noreferrer" class="hover:text-ink-700">GitHub</a>
      </div>
    </div>
  </footer>
</template>
