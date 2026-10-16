<script setup lang="ts">
const { data } = await useFetch('/api/features', { key: 'features-index' })

const settings = computed(() => data.value?.settings)
const page = computed(() => data.value?.page)
const features = computed(() => data.value?.features || [])
const testimonials = computed(() => data.value?.testimonials || [])

useCoveSeo({
  title: page.value?.fields?.['seo-title'] || page.value?.fields?.title,
  description: page.value?.fields?.['seo-description'] || page.value?.fields?.intro,
  path: '/features',
  siteName: settings.value?.fields?.['site-name'],
  siteUrl: settings.value?.fields?.['site-url'],
  defaultDescription: settings.value?.fields?.['seo-description'],
  defaultOgImage: firstAssetUrl(settings.value?.fields?.['og-image'])
})

function iconName(name?: string) {
  if (!name) return 'i-lucide-sparkles'
  return name.startsWith('i-') ? name : `i-lucide-${name}`
}

const quote = computed(() => testimonials.value[0])
</script>

<template>
  <div v-if="page">
    <PageHero
      eyebrow="Product"
      :title="page.fields.title || 'Features'"
      :intro="page.fields.intro"
      dark
    />

    <!-- Featured product strip -->
    <section class="border-b border-black/5 bg-white">
      <div class="cove-wrap grid items-center gap-10 py-14 lg:grid-cols-2">
        <CoveReveal>
          <div>
            <span class="cove-pill">
              <span class="cove-pill-dot" />
              {{ page.fields['highlight-eyebrow'] || 'Product' }}
            </span>
            <h2 class="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              {{ page.fields['highlight-title'] || page.fields.title }}
            </h2>
            <p class="mt-4 text-lg text-ink-500">
              {{ page.fields['highlight-body'] || page.fields.intro }}
            </p>
            <div class="mt-7 flex flex-wrap gap-3">
              <UButton
                :to="page.fields['primary-cta-url'] || '/pricing'"
                color="primary"
                size="lg"
              >
                <span class="text-forest-900">{{ page.fields['primary-cta-label'] || 'Start free' }}</span>
              </UButton>
              <UButton
                :to="page.fields['secondary-cta-url'] || '/contact'"
                color="neutral"
                variant="outline"
                size="lg"
              >
                {{ page.fields['secondary-cta-label'] || 'Talk to sales' }}
              </UButton>
            </div>
          </div>
        </CoveReveal>
        <CoveReveal :delay="100">
          <div class="cove-float">
            <ProductDashboard />
          </div>
        </CoveReveal>
      </div>
    </section>

    <!-- Alternating feature stories -->
    <section class="cove-section">
      <div class="cove-wrap space-y-16">
        <CoveReveal
          v-for="(feature, index) in features"
          :key="feature.uuid"
        >
          <div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div :class="index % 2 === 1 ? 'lg:order-2' : ''">
              <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-700 text-lime-400">
                <UIcon :name="iconName(feature.fields.icon)" class="size-5" />
              </div>
              <h2 class="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-900">
                {{ feature.fields.title }}
              </h2>
              <p class="mt-3 text-lg leading-relaxed text-ink-500">
                {{ feature.fields.summary }}
              </p>
              <UButton
                class="mt-6"
                :to="`/features/${feature.fields.slug}`"
                color="primary"
                size="lg"
              >
                <span class="text-forest-900">Explore {{ feature.fields.title }}</span>
              </UButton>
            </div>
            <div
              class="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
              :class="index % 2 === 1 ? 'lg:order-1' : ''"
            >
              <img
                v-if="firstAssetUrl(feature.fields.image)"
                :src="firstAssetUrl(feature.fields.image)!"
                :alt="feature.fields.title || ''"
                class="aspect-[16/11] w-full object-cover"
              >
              <div
                v-else
                class="flex aspect-[16/11] items-end bg-[var(--color-canvas)] p-8"
              >
                <p class="text-ink-500">
                  {{ feature.fields.summary }}
                </p>
              </div>
            </div>
          </div>
        </CoveReveal>
      </div>
    </section>

    <!-- Social proof + CTA -->
    <section class="bg-forest-700 text-white">
      <div class="cove-wrap grid items-center gap-10 py-16 lg:grid-cols-2">
        <CoveReveal>
          <blockquote v-if="quote">
            <p class="font-display text-2xl font-medium leading-snug sm:text-3xl">
              “{{ quote.fields.quote }}”
            </p>
            <footer class="mt-6 text-sm text-white/70">
              {{ quote.fields['author-name'] }}
              <span v-if="quote.fields.role"> · {{ quote.fields.role }}</span>
              <span v-if="quote.fields.company">, {{ quote.fields.company }}</span>
            </footer>
          </blockquote>
        </CoveReveal>
        <CoveReveal :delay="100">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h3 class="font-display text-2xl font-semibold">
              {{ page.fields['cta-title'] }}
            </h3>
            <p class="mt-3 text-white/75">
              {{ page.fields['cta-body'] }}
            </p>
            <UButton
              class="mt-6"
              :to="page.fields['cta-url'] || '/pricing'"
              color="primary"
              size="lg"
            >
              <span class="text-forest-900">{{ page.fields['cta-label'] || 'Start free' }}</span>
            </UButton>
          </div>
        </CoveReveal>
      </div>
    </section>
  </div>
</template>
