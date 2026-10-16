<script setup lang="ts">
withDefaults(defineProps<{
  delay?: number
}>(), {
  delay: 0
})

const root = ref<HTMLElement | null>(null)
const visible = ref(false)

let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!root.value || import.meta.server) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    visible.value = true
    return
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        visible.value = true
        observer?.disconnect()
      }
    },
    { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
  )

  observer.observe(root.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div
    ref="root"
    class="cove-reveal"
    :class="{ 'is-visible': visible }"
    :style="{ '--cove-delay': `${delay}ms` }"
  >
    <slot />
  </div>
</template>
