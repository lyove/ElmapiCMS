<script setup lang="ts">
const { data: settings } = await useFetch('/api/settings', {
  key: 'site-settings'
})

useHead({
  htmlAttrs: { lang: 'en' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
    }
  ]
})

const colorMode = useColorMode()
colorMode.preference = 'light'
</script>

<template>
  <UApp :toaster="{ position: 'top-center' }">
    <NuxtLoadingIndicator
      color="#9FE870"
      :height="3"
      :duration="2000"
      :throttle="200"
    />

    <SiteHeader
      :site-name="settings?.fields?.['site-name']"
      :primary-label="settings?.fields?.['primary-cta-label']"
      :primary-url="settings?.fields?.['primary-cta-url']"
    />

    <main>
      <NuxtPage />
    </main>

    <SiteFooter
      :site-name="settings?.fields?.['site-name']"
      :blurb="settings?.fields?.['footer-blurb']"
      :email="settings?.fields?.['contact-email']"
      :twitter-url="settings?.fields?.['twitter-url']"
      :linkedin-url="settings?.fields?.['linkedin-url']"
      :github-url="settings?.fields?.['github-url']"
    />
  </UApp>
</template>
