<script setup lang="ts">
defineProps<{
  html?: string
}>()
</script>

<template>
  <div class="rich-text" v-html="html || ''" />
</template>
