<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'en' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }]
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator color="var(--docs-primary)" :height="2" />
    <NuxtPage />
  </UApp>
</template>
