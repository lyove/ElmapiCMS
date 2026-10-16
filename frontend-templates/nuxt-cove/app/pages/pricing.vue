<script setup lang="ts">
const { data } = await useFetch('/api/pricing', { key: 'pricing-page' })

const settings = computed(() => data.value?.settings)
const page = computed(() => data.value?.page)
const plans = computed(() => data.value?.plans || [])
const faqs = computed(() => data.value?.faqs || [])

useCoveSeo({
  title: page.value?.fields?.['seo-title'] || page.value?.fields?.title,
  description: page.value?.fields?.['seo-description'] || page.value?.fields?.intro,
  path: '/pricing',
  siteName: settings.value?.fields?.['site-name'],
  siteUrl: settings.value?.fields?.['site-url'],
  defaultDescription: settings.value?.fields?.['seo-description'],
  defaultOgImage: firstAssetUrl(settings.value?.fields?.['og-image'])
})
</script>

<template>
  <div v-if="page">
    <PageHero
      eyebrow="Pricing"
      :title="page.fields.title || 'Pricing'"
      :intro="page.fields.intro"
      dark
    />

    <section class="cove-section">
      <div class="cove-wrap grid gap-5 lg:grid-cols-3">
        <div
          v-for="plan in plans"
          :key="plan.uuid"
          class="relative flex flex-col rounded-2xl border p-7"
          :class="plan.fields.highlighted
            ? 'border-forest-700 bg-forest-700 text-white shadow-xl'
            : 'border-black/5 bg-white'"
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
      </div>
      <p
        v-if="page.fields.footnote"
        class="cove-wrap mt-8 text-center text-sm text-ink-400"
      >
        {{ page.fields.footnote }}
      </p>
    </section>

    <section v-if="faqs.length" class="cove-section bg-white">
      <div class="cove-wrap max-w-3xl">
        <span class="cove-pill">
          <span class="cove-pill-dot" />
          FAQ
        </span>
        <h2 class="mt-5 font-display text-3xl font-semibold text-ink-900">
          Everything you need to know
        </h2>
        <div class="mt-8 divide-y divide-black/5 border-y border-black/5">
          <details
            v-for="faq in faqs"
            :key="faq.uuid"
            class="group py-5"
          >
            <summary class="cursor-pointer list-none text-lg font-semibold text-ink-900 marker:content-none">
              {{ faq.fields.question }}
            </summary>
            <div
              class="rich-text mt-3 text-base"
              v-html="faq.fields.answer"
            />
          </details>
        </div>
      </div>
    </section>
  </div>
</template>
