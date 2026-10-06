<script setup lang="ts">
const { data } = await useFetch('/api/docs/default')

const slug = data.value?.slug || '1.0'
await navigateTo(`/v/${slug}`, { redirectCode: 302 })
</script>

<template>
  <div />
</template>
