<script setup lang="ts">
defineProps<{
  html?: string | null
}>()
</script>

<template>
  <div v-if="html" class="rich-text" v-html="html" />
</template>
