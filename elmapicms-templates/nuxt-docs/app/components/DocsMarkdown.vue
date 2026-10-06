<script setup lang="ts">
defineProps<{
  html: string
}>()
</script>

<template>
  <div
    v-if="html"
    class="docs-md"
    v-html="html"
  />
</template>
