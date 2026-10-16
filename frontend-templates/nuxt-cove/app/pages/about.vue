<script setup lang="ts">
const { data } = await useFetch('/api/about', { key: 'about-page' })

const settings = computed(() => data.value?.settings)
const page = computed(() => data.value?.page)
const testimonials = computed(() => data.value?.testimonials || [])
const customers = computed(() => data.value?.customers || [])
const beliefs = computed(() =>
  asGroupList<{ title?: string, body?: string }>(page.value?.fields?.beliefs)
)

useCoveSeo({
  title: page.value?.fields?.['seo-title'] || page.value?.fields?.title,
  description: page.value?.fields?.['seo-description'] || page.value?.fields?.intro,
  path: '/about',
  siteName: settings.value?.fields?.['site-name'],
  siteUrl: settings.value?.fields?.['site-url'],
  defaultDescription: settings.value?.fields?.['seo-description'],
  defaultOgImage: firstAssetUrl(settings.value?.fields?.['og-image']),
  imageUrl: firstAssetUrl(page.value?.fields?.image)
})
</script>

<template>
  <article v-if="page">
    <PageHero
      eyebrow="About"
      :title="page.fields.title || 'About'"
      :intro="page.fields.intro"
      dark
    />

    <section class="border-b border-black/5 bg-white">
      <div class="cove-wrap grid items-center gap-10 py-14 lg:grid-cols-2">
        <CoveReveal>
          <img
            v-if="firstAssetUrl(page.fields.image)"
            :src="firstAssetUrl(page.fields.image)!"
            :alt="page.fields.title || 'About Cove'"
            class="aspect-[4/3] w-full rounded-2xl object-cover"
          >
        </CoveReveal>
        <CoveReveal :delay="100">
          <div>
            <span class="cove-pill">
              <span class="cove-pill-dot" />
              {{ page.fields['story-eyebrow'] || 'Our story' }}
            </span>
            <h2 class="mt-5 font-display text-3xl font-semibold tracking-tight text-ink-900">
              {{ page.fields['story-title'] || page.fields.title }}
            </h2>
            <p class="mt-4 text-lg leading-relaxed text-ink-500">
              {{ page.fields.intro }}
            </p>
          </div>
        </CoveReveal>
      </div>
    </section>

    <section class="cove-section">
      <div class="cove-wrap max-w-3xl">
        <CoveReveal>
          <RichText :html="data?.bodyHtml" />
        </CoveReveal>
      </div>
    </section>

    <section v-if="beliefs.length" class="cove-section bg-white">
      <div class="cove-wrap">
        <CoveReveal>
          <div class="mx-auto max-w-2xl text-center">
            <span class="cove-pill">
              <span class="cove-pill-dot" />
              What we believe
            </span>
            <h2 class="mt-5 font-display text-3xl font-semibold text-ink-900">
              {{ page.fields['beliefs-title'] || 'What we believe' }}
            </h2>
          </div>
        </CoveReveal>
        <div class="mt-12 grid gap-5 md:grid-cols-3">
          <CoveReveal
            v-for="(belief, index) in beliefs"
            :key="belief.title || String(index)"
            :delay="index * 80"
          >
            <div class="h-full rounded-2xl border border-black/5 bg-[var(--color-canvas)] p-6">
              <p class="font-display text-xl font-semibold text-ink-900">
                {{ belief.title }}
              </p>
              <p class="mt-3 text-sm leading-relaxed text-ink-500">
                {{ belief.body }}
              </p>
            </div>
          </CoveReveal>
        </div>
      </div>
    </section>

    <section class="cove-section">
      <div class="cove-wrap">
        <CoveReveal>
          <p class="text-center text-sm text-ink-400">
            {{ page.fields['customers-label'] || 'Teams shipping with Cove' }}
          </p>
        </CoveReveal>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          <span
            v-for="customer in customers"
            :key="customer.uuid"
            class="text-lg font-semibold tracking-wide text-ink-300"
          >
            {{ customer.fields.name }}
          </span>
        </div>

        <div class="mt-14 grid gap-5 lg:grid-cols-3">
          <CoveReveal
            v-for="(item, index) in testimonials"
            :key="item.uuid"
            :delay="index * 80"
          >
            <blockquote class="h-full rounded-2xl border border-black/5 bg-white p-6">
              <p class="text-base leading-relaxed text-ink-700">
                “{{ item.fields.quote }}”
              </p>
              <footer class="mt-5 text-sm text-ink-400">
                {{ item.fields['author-name'] }}
                <span v-if="item.fields.company"> · {{ item.fields.company }}</span>
              </footer>
            </blockquote>
          </CoveReveal>
        </div>
      </div>
    </section>

    <section class="bg-forest-700 text-white">
      <div class="cove-wrap py-16 text-center">
        <CoveReveal>
          <h2 class="font-display text-3xl font-semibold sm:text-4xl">
            {{ page.fields['cta-title'] }}
          </h2>
          <p class="mx-auto mt-4 max-w-xl text-white/75">
            {{ page.fields['cta-body'] }}
          </p>
          <div class="mt-8 flex flex-wrap justify-center gap-3">
            <UButton
              :to="page.fields['cta-primary-url'] || '/contact'"
              color="primary"
              size="lg"
            >
              <span class="text-forest-900">{{ page.fields['cta-primary-label'] || 'Contact us' }}</span>
            </UButton>
            <UButton
              :to="page.fields['cta-secondary-url'] || '/pricing'"
              color="neutral"
              variant="ghost"
              size="lg"
              class="text-white hover:bg-white/10"
            >
              {{ page.fields['cta-secondary-label'] || 'See pricing' }}
            </UButton>
          </div>
        </CoveReveal>
      </div>
    </section>
  </article>
</template>
