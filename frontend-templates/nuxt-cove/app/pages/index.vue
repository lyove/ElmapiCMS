<script setup lang="ts">
const { data } = await useFetch('/api/home', { key: 'home-page' })

const settings = computed(() => data.value?.settings)
const home = computed(() => data.value?.home)
const allFeatures = computed(() => data.value?.features || [])
const productFeatures = computed(() => allFeatures.value.slice(0, 4))
const benefitFeatures = computed(() => allFeatures.value.slice(0, 6))
const testimonials = computed(() => data.value?.testimonials || [])
const customers = computed(() => data.value?.customers || [])
const plans = computed(() => data.value?.plans || [])

useCoveSeo({
  title: home.value?.fields?.['seo-title'] || home.value?.fields?.headline,
  description: home.value?.fields?.['seo-description'] || home.value?.fields?.subheadline,
  path: '/',
  siteName: settings.value?.fields?.['site-name'],
  siteUrl: settings.value?.fields?.['site-url'],
  defaultDescription: settings.value?.fields?.['seo-description'],
  defaultOgImage: firstAssetUrl(settings.value?.fields?.['og-image']),
  imageUrl: firstAssetUrl(home.value?.fields?.['hero-image'])
})

function iconName(name?: string) {
  if (!name) return 'i-lucide-sparkles'
  return name.startsWith('i-') ? name : `i-lucide-${name}`
}

const quote = computed(() => testimonials.value[0])
const marqueeNames = computed(() => {
  const names = customers.value.map(c => c.fields.name).filter(Boolean) as string[]
  return [...names, ...names]
})

const comparisonColumns = computed(() =>
  asGroupList<{ label?: string, tone?: string | string[], points?: string }>(
    home.value?.fields?.['comparison-columns']
  ).map(column => ({
    label: column.label || '',
    tone: enumValue(column.tone, 'muted'),
    points: planFeatureLines(column.points)
  }))
)

const stats = computed(() =>
  asGroupList<{ value?: string, label?: string }>(home.value?.fields?.stats)
)
</script>

<template>
  <div v-if="home">
    <!-- Full-bleed forest hero -->
    <section class="bg-forest-700 text-white">
      <div class="cove-wrap py-16 text-center sm:py-24">
        <p class="cove-fade-up text-sm font-semibold tracking-wide text-lime-400">
          {{ settings?.fields?.['site-name'] || 'Cove' }}
        </p>
        <h1 class="cove-fade-up-2 mx-auto mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-6xl">
          {{ home.fields.headline }}
        </h1>
        <p class="cove-fade-up-2 mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
          {{ home.fields.subheadline }}
        </p>
        <div class="cove-fade-up-3 mt-8 flex flex-wrap items-center justify-center gap-3">
          <UButton
            :to="home.fields['primary-cta-url'] || '/pricing'"
            color="primary"
            size="xl"
            class="cove-pulse-soft"
          >
            <span class="text-forest-900">{{ home.fields['primary-cta-label'] || 'Start free' }}</span>
          </UButton>
          <UButton
            :to="home.fields['secondary-cta-url'] || '/features'"
            color="neutral"
            variant="ghost"
            size="xl"
            class="text-white hover:bg-white/10"
          >
            {{ home.fields['secondary-cta-label'] || 'Explore features' }}
          </UButton>
        </div>
      </div>
    </section>

    <!-- Split: testimonial + product dashboard -->
    <section class="grid lg:grid-cols-2">
      <div class="flex items-center bg-forest-700 px-6 py-14 text-white sm:px-12 lg:py-16">
        <CoveReveal v-if="quote">
          <blockquote class="max-w-md">
            <p class="font-display text-2xl font-medium leading-snug sm:text-3xl">
              “{{ quote.fields.quote }}”
            </p>
            <footer class="mt-8 flex items-center gap-3">
              <img
                v-if="firstAssetUrl(quote.fields.avatar)"
                :src="firstAssetUrl(quote.fields.avatar)!"
                :alt="quote.fields['author-name'] || ''"
                class="h-11 w-11 rounded-full object-cover"
              >
              <div>
                <p class="text-sm font-semibold">
                  {{ quote.fields['author-name'] }}
                </p>
                <p class="text-sm text-white/65">
                  {{ quote.fields.role }}{{ quote.fields.company ? `, ${quote.fields.company}` : '' }}
                </p>
              </div>
            </footer>
          </blockquote>
        </CoveReveal>
      </div>
      <div class="bg-[var(--color-canvas)] px-5 py-10 sm:px-10 lg:py-12">
        <CoveReveal :delay="120">
          <div class="cove-float">
            <ProductDashboard />
          </div>
        </CoveReveal>
      </div>
    </section>

    <!-- Logo strip -->
    <section class="overflow-hidden border-y border-black/5 bg-white py-10">
      <p class="text-center text-sm text-ink-400">
        {{ home.fields['social-proof-title'] || 'Trusted by teams that protect deep work' }}
      </p>
      <div class="mt-6 overflow-hidden">
        <div class="cove-marquee-track gap-12 px-6">
          <span
            v-for="(name, i) in marqueeNames"
            :key="`${name}-${i}`"
            class="shrink-0 text-lg font-semibold tracking-wide text-ink-300"
          >
            {{ name }}
          </span>
        </div>
      </div>
    </section>

    <!-- Why Cove: richer before/after + stats -->
    <section class="cove-section">
      <div class="cove-wrap">
        <CoveReveal>
          <div class="mx-auto max-w-3xl text-center">
            <span class="cove-pill">
              <span class="cove-pill-dot" />
              Why Cove
            </span>
            <h2 class="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              {{ home.fields['thesis-title'] }}
            </h2>
            <p class="mt-5 text-lg leading-relaxed text-ink-500">
              {{ home.fields['thesis-body'] }}
            </p>
          </div>
        </CoveReveal>

        <div v-if="comparisonColumns.length" class="mt-12 grid gap-5 lg:grid-cols-2">
          <CoveReveal
            v-for="(column, index) in comparisonColumns"
            :key="column.label"
            :delay="index * 100"
          >
            <div
              class="h-full rounded-2xl border p-6 sm:p-8"
              :class="column.tone === 'brand'
                ? 'border-forest-700 bg-forest-700 text-white'
                : 'border-black/5 bg-white'"
            >
              <p
                class="text-sm font-semibold"
                :class="column.tone === 'brand' ? 'text-lime-400' : 'text-ink-400'"
              >
                {{ column.label }}
              </p>
              <ul class="mt-5 space-y-4">
                <li
                  v-for="point in column.points"
                  :key="point"
                  class="flex items-start gap-3 text-base leading-relaxed"
                  :class="column.tone === 'brand' ? 'text-white/90' : 'text-ink-600'"
                >
                  <UIcon
                    :name="column.tone === 'brand' ? 'i-lucide-check' : 'i-lucide-x'"
                    class="mt-0.5 size-5 shrink-0"
                    :class="column.tone === 'brand' ? 'text-lime-400' : 'text-ink-300'"
                  />
                  <span>{{ point }}</span>
                </li>
              </ul>
            </div>
          </CoveReveal>
        </div>

        <div v-if="stats.length" class="mt-8 grid gap-4 sm:grid-cols-3">
          <CoveReveal
            v-for="(stat, index) in stats"
            :key="stat.label || String(index)"
            :delay="index * 80"
          >
            <div class="rounded-2xl border border-black/5 bg-white px-5 py-6 text-center">
              <p class="font-display text-3xl font-semibold text-forest-700 sm:text-4xl">
                {{ stat.value }}
              </p>
              <p class="mt-2 text-sm text-ink-500">
                {{ stat.label }}
              </p>
            </div>
          </CoveReveal>
        </div>
      </div>
    </section>

    <!-- Product: alternating feature stories -->
    <section class="cove-section bg-white pt-8">
      <div class="cove-wrap">
        <CoveReveal>
          <div class="mx-auto max-w-3xl text-center">
            <span class="cove-pill">
              <span class="cove-pill-dot" />
              Product
            </span>
            <h2 class="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              {{ home.fields['features-title'] }}
            </h2>
            <p class="mt-4 text-lg text-ink-500">
              {{ home.fields['features-intro'] }}
            </p>
          </div>
        </CoveReveal>

        <div class="mt-16 space-y-16">
          <CoveReveal
            v-for="(feature, index) in productFeatures"
            :key="feature.uuid"
            :delay="80"
          >
            <div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
              <div :class="index % 2 === 1 ? 'lg:order-2' : ''">
                <p class="text-sm font-semibold text-forest-700">
                  {{ feature.fields.title }}
                </p>
                <h3 class="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-900">
                  {{ feature.fields.summary }}
                </h3>
                <UButton
                  class="mt-6"
                  :to="`/features/${feature.fields.slug}`"
                  color="primary"
                  size="lg"
                >
                  <span class="text-forest-900">Learn more</span>
                </UButton>
              </div>
              <div
                class="overflow-hidden rounded-2xl border border-black/5 bg-[var(--color-canvas)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
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
                  class="flex aspect-[16/11] flex-col justify-between p-8"
                >
                  <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-700 text-lime-400">
                    <UIcon :name="iconName(feature.fields.icon)" class="size-7" />
                  </div>
                  <p class="text-ink-500">
                    Built for remote teams who want alignment without another recurring call.
                  </p>
                </div>
              </div>
            </div>
          </CoveReveal>
        </div>
      </div>
    </section>

    <!-- Benefits: all 6 -->
    <section class="cove-section">
      <div class="cove-wrap">
        <CoveReveal>
          <div class="mx-auto max-w-3xl text-center">
            <span class="cove-pill">
              <span class="cove-pill-dot" />
              Benefits
            </span>
            <h2 class="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              {{ home.fields['benefits-title'] || 'Everything you need for a quieter standup' }}
            </h2>
          </div>
        </CoveReveal>
        <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CoveReveal
            v-for="(feature, index) in benefitFeatures"
            :key="`benefit-${feature.uuid}`"
            :delay="index * 60"
          >
            <div class="h-full rounded-2xl border border-black/5 bg-white p-6 transition hover:-translate-y-1 hover:border-forest-200 hover:shadow-md">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/40 text-forest-800">
                <UIcon :name="iconName(feature.fields.icon)" class="size-5" />
              </div>
              <h3 class="mt-4 text-lg font-semibold text-ink-900">
                {{ feature.fields.title }}
              </h3>
              <p class="mt-2 text-sm leading-relaxed text-ink-500">
                {{ feature.fields.summary }}
              </p>
            </div>
          </CoveReveal>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="cove-section bg-white">
      <div class="cove-wrap">
        <CoveReveal>
          <div class="mx-auto max-w-3xl text-center">
            <span class="cove-pill">
              <span class="cove-pill-dot" />
              Testimonials
            </span>
            <h2 class="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              {{ home.fields['testimonials-title'] }}
            </h2>
          </div>
        </CoveReveal>
        <div class="mt-12 grid gap-5 lg:grid-cols-3">
          <CoveReveal
            v-for="(item, index) in testimonials"
            :key="item.uuid"
            :delay="index * 80"
          >
            <blockquote class="h-full rounded-2xl border border-black/5 bg-[var(--color-canvas)] p-6">
              <p class="text-base leading-relaxed text-ink-700">
                “{{ item.fields.quote }}”
              </p>
              <footer class="mt-6 flex items-center gap-3">
                <img
                  v-if="firstAssetUrl(item.fields.avatar)"
                  :src="firstAssetUrl(item.fields.avatar)!"
                  :alt="item.fields['author-name'] || ''"
                  class="h-10 w-10 rounded-full object-cover"
                >
                <div>
                  <p class="text-sm font-semibold text-ink-900">
                    {{ item.fields['author-name'] }}
                  </p>
                  <p class="text-sm text-ink-400">
                    {{ item.fields.role }}{{ item.fields.company ? `, ${item.fields.company}` : '' }}
                  </p>
                </div>
              </footer>
            </blockquote>
          </CoveReveal>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section class="cove-section">
      <div class="cove-wrap">
        <CoveReveal>
          <div class="mx-auto max-w-3xl text-center">
            <span class="cove-pill">
              <span class="cove-pill-dot" />
              Pricing
            </span>
            <h2 class="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              {{ home.fields['pricing-teaser-title'] }}
            </h2>
            <p class="mt-4 text-lg text-ink-500">
              {{ home.fields['pricing-teaser-intro'] }}
            </p>
          </div>
        </CoveReveal>

        <div class="mt-12 grid gap-5 lg:grid-cols-3">
          <CoveReveal
            v-for="(plan, index) in plans"
            :key="plan.uuid"
            :delay="index * 80"
          >
            <div
              class="relative flex h-full flex-col rounded-2xl border p-7 transition hover:-translate-y-1"
              :class="plan.fields.highlighted
                ? 'border-forest-700 bg-forest-700 text-white shadow-xl'
                : 'border-black/5 bg-white hover:shadow-md'"
            >
              <span
                v-if="plan.fields.highlighted"
                class="absolute -top-3 left-6 rounded-full bg-lime-400 px-3 py-1 text-[11px] font-bold text-forest-900"
              >
                Best value
              </span>
              <p
                class="text-sm font-semibold"
                :class="plan.fields.highlighted ? 'text-lime-400' : 'text-forest-700'"
              >
                {{ plan.fields.name }}
              </p>
              <p class="mt-4 font-display text-4xl font-semibold">
                {{ plan.fields.price }}
              </p>
              <p
                class="mt-1 text-sm"
                :class="plan.fields.highlighted ? 'text-white/65' : 'text-ink-400'"
              >
                {{ plan.fields.period }}
              </p>
              <p
                class="mt-4 text-sm"
                :class="plan.fields.highlighted ? 'text-white/80' : 'text-ink-500'"
              >
                {{ plan.fields.description }}
              </p>
              <ul class="mt-6 flex-1 space-y-2">
                <li
                  v-for="line in planFeatureLines(plan.fields.features)"
                  :key="line"
                  class="flex items-start gap-2 text-sm"
                  :class="plan.fields.highlighted ? 'text-white/85' : 'text-ink-600'"
                >
                  <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0" />
                  <span>{{ line }}</span>
                </li>
              </ul>
              <UButton
                class="mt-8"
                :to="plan.fields['cta-url'] || '/contact'"
                :color="plan.fields.highlighted ? 'primary' : 'neutral'"
                :variant="plan.fields.highlighted ? 'solid' : 'outline'"
                block
              >
                <span :class="plan.fields.highlighted ? 'text-forest-900' : ''">
                  {{ plan.fields['cta-label'] || 'Get started' }}
                </span>
              </UButton>
            </div>
          </CoveReveal>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-forest-700 text-white">
      <div class="cove-wrap grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-20">
        <CoveReveal>
          <div>
            <h2 class="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              {{ home.fields['cta-title'] }}
            </h2>
            <p class="mt-4 text-lg text-white/75">
              {{ home.fields['cta-body'] }}
            </p>
            <UButton
              class="mt-8"
              :to="home.fields['primary-cta-url'] || '/pricing'"
              color="primary"
              size="xl"
            >
              <span class="text-forest-900">{{ home.fields['primary-cta-label'] || 'Start free' }}</span>
            </UButton>
          </div>
        </CoveReveal>
        <CoveReveal :delay="120">
          <div class="cove-float">
            <ProductDashboard />
          </div>
        </CoveReveal>
      </div>
    </section>
  </div>
</template>
