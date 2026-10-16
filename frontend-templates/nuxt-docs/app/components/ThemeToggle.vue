<script setup lang="ts">
const colorMode = useColorMode()
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})

const isDark = computed(() => colorMode.value === 'dark')

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <UButton
    variant="ghost"
    color="neutral"
    size="sm"
    square
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :disabled="!mounted"
    @click="toggle"
  >
    <UIcon
      :name="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
      class="size-4"
    />
  </UButton>
</template>
