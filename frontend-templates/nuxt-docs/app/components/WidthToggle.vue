<script setup lang="ts">
defineProps<{
  fullWidth: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<template>
  <UButton
    variant="ghost"
    color="neutral"
    size="sm"
    square
    :aria-label="fullWidth ? 'Use reading width' : 'Use full width'"
    :title="fullWidth ? 'Reading width' : 'Full width'"
    @click="emit('toggle')"
  >
    <UIcon
      :name="fullWidth ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
      class="size-4"
    />
  </UButton>
</template>
