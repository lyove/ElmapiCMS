<script setup lang="ts">
import type { TocItem } from '../../server/utils/types'

const props = defineProps<{
  items: TocItem[]
}>()

const activeId = ref('')
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (props.items.length === 0) return

  const headings = props.items
    .map(item => document.getElementById(item.id))
    .filter((el): el is HTMLElement => Boolean(el))

  if (headings.length === 0) return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      if (visible[0]?.target.id) {
        activeId.value = visible[0].target.id
      }
    },
    {
      rootMargin: '-96px 0px -65% 0px',
      threshold: [0, 1]
    }
  )

  for (const heading of headings) observer.observe(heading)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <nav
    v-if="items.length"
    aria-label="On this page"
    class="space-y-2.5"
  >
    <p class="text-xs font-medium text-foreground">
      On this page
    </p>
    <ul class="space-y-1 border-s border-border/80">
      <li
        v-for="item in items"
        :key="item.id"
      >
        <a
          :href="`#${item.id}`"
          class="block border-s-2 border-transparent py-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          :class="[
            item.depth === 3 ? 'ps-5' : 'ps-3',
            activeId === item.id && 'border-docs-primary font-medium text-foreground'
          ]"
        >
          {{ item.title }}
        </a>
      </li>
    </ul>
  </nav>
</template>
