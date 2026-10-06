<script setup lang="ts">
const { data } = await useFetch('/api/contact', { key: 'contact-page' })

const settings = computed(() => data.value?.settings)
const page = computed(() => data.value?.page)
const faqs = computed(() => (data.value?.faqs || []).slice(0, 4))
const channels = computed(() =>
  asGroupList<{ title?: string, body?: string, meta?: string }>(page.value?.fields?.channels)
)

useCoveSeo({
  title: page.value?.fields?.['seo-title'] || page.value?.fields?.title,
  description: page.value?.fields?.['seo-description'] || page.value?.fields?.intro,
  path: '/contact',
  siteName: settings.value?.fields?.['site-name'],
  siteUrl: settings.value?.fields?.['site-url'],
  defaultDescription: settings.value?.fields?.['seo-description'],
  defaultOgImage: firstAssetUrl(settings.value?.fields?.['og-image'])
})

const form = reactive({
  name: '',
  email: '',
  company: '',
  message: ''
})

const submitting = ref(false)
const success = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  submitting.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: { ...form }
    })
    success.value = true
    form.name = ''
    form.email = ''
    form.company = ''
    form.message = ''
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string }, statusMessage?: string }
    errorMessage.value = e?.data?.statusMessage || e?.statusMessage || 'Something went wrong. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="page">
    <PageHero
      eyebrow="Contact"
      :title="page.fields.title || 'Contact'"
      :intro="page.fields.intro"
      dark
    />

    <section class="cove-section">
      <div class="cove-wrap grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div class="space-y-8">
          <CoveReveal>
            <div>
              <p class="text-sm font-semibold text-forest-700">
                Email
              </p>
              <a
                v-if="settings?.fields?.['contact-email']"
                :href="`mailto:${settings.fields['contact-email']}`"
                class="mt-2 inline-block text-2xl font-semibold text-ink-900 hover:text-forest-700"
              >
                {{ settings.fields['contact-email'] }}
              </a>
              <p
                v-if="page.fields['email-helper']"
                class="mt-3 text-sm text-ink-500"
              >
                {{ page.fields['email-helper'] }}
              </p>
            </div>
          </CoveReveal>

          <div v-if="channels.length" class="space-y-4">
            <CoveReveal
              v-for="(channel, index) in channels"
              :key="channel.title || String(index)"
              :delay="index * 70"
            >
              <div class="rounded-2xl border border-black/5 bg-white p-5">
                <p class="font-semibold text-ink-900">
                  {{ channel.title }}
                </p>
                <p class="mt-2 text-sm text-ink-500">
                  {{ channel.body }}
                </p>
                <p
                  v-if="channel.meta"
                  class="mt-3 text-xs font-medium text-forest-700"
                >
                  {{ channel.meta }}
                </p>
              </div>
            </CoveReveal>
          </div>
        </div>

        <CoveReveal :delay="100">
          <div class="rounded-2xl border border-black/5 bg-white p-6 sm:p-8">
            <h2 class="font-display text-2xl font-semibold text-ink-900">
              {{ page.fields['form-title'] || 'Send a message' }}
            </h2>
            <p
              v-if="page.fields['form-intro']"
              class="mt-2 text-sm text-ink-500"
            >
              {{ page.fields['form-intro'] }}
            </p>

            <p
              v-if="success"
              class="mt-6 rounded-xl bg-lime-100 px-4 py-3 text-sm text-forest-800"
            >
              {{ page.fields['form-success'] || 'Thanks. We received your message.' }}
            </p>

            <form
              v-else
              class="mt-6 space-y-4"
              @submit.prevent="onSubmit"
            >
              <UFormField label="Name" required>
                <UInput v-model="form.name" required size="lg" class="w-full" />
              </UFormField>
              <UFormField label="Email" required>
                <UInput v-model="form.email" type="email" required size="lg" class="w-full" />
              </UFormField>
              <UFormField label="Company">
                <UInput v-model="form.company" size="lg" class="w-full" />
              </UFormField>
              <UFormField label="Message" required>
                <UTextarea v-model="form.message" required :rows="5" class="w-full" />
              </UFormField>
              <p v-if="errorMessage" class="text-sm text-red-600">
                {{ errorMessage }}
              </p>
              <UButton type="submit" color="primary" size="lg" :loading="submitting">
                <span class="text-forest-900">Send message</span>
              </UButton>
            </form>
          </div>
        </CoveReveal>
      </div>
    </section>

    <section v-if="faqs.length" class="cove-section bg-white">
      <div class="cove-wrap max-w-3xl">
        <CoveReveal>
          <span class="cove-pill">
            <span class="cove-pill-dot" />
            Quick answers
          </span>
          <h2 class="mt-5 font-display text-3xl font-semibold text-ink-900">
            {{ page.fields['faq-title'] || 'Before you write in' }}
          </h2>
        </CoveReveal>
        <div class="mt-8 divide-y divide-black/5 border-y border-black/5">
          <CoveReveal
            v-for="(faq, index) in faqs"
            :key="faq.uuid"
            :delay="index * 50"
          >
            <details class="group py-5">
              <summary class="cursor-pointer list-none text-lg font-semibold text-ink-900 marker:content-none">
                {{ faq.fields.question }}
              </summary>
              <div
                class="rich-text mt-3 text-base"
                v-html="faq.fields.answer"
              />
            </details>
          </CoveReveal>
        </div>
        <CoveReveal>
          <NuxtLink
            to="/pricing"
            class="mt-8 inline-flex text-sm font-semibold text-forest-700 hover:text-forest-800"
          >
            See pricing and full FAQ →
          </NuxtLink>
        </CoveReveal>
      </div>
    </section>

    <section
      v-if="page.fields['cta-title']"
      class="bg-forest-700 text-white"
    >
      <div class="cove-wrap py-14 text-center">
        <CoveReveal>
          <h2 class="font-display text-3xl font-semibold">
            {{ page.fields['cta-title'] }}
          </h2>
          <p class="mx-auto mt-3 max-w-xl text-white/75">
            {{ page.fields['cta-body'] }}
          </p>
          <UButton
            class="mt-7"
            :to="page.fields['cta-url'] || '/pricing'"
            color="primary"
            size="lg"
          >
            <span class="text-forest-900">{{ page.fields['cta-label'] || 'Start free' }}</span>
          </UButton>
        </CoveReveal>
      </div>
    </section>
  </div>
</template>
