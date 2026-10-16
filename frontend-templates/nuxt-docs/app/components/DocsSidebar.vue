<script setup lang="ts">
import type { NavCategory } from '../../server/utils/types'

const STORAGE_KEY = 'docs-sidebar-categories'

const props = defineProps<{
  siteName: string
  nav: NavCategory[]
  versionSlug: string
  class?: string
}>()

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()

function readStored(): Record<string, boolean> {
  if (!import.meta.client) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const next: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'boolean') next[key] = value
    }
    return next
  } catch {
    return {}
  }
}

function writeStored(map: Record<string, boolean>) {
  if (!import.meta.client) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

const open = ref<Record<string, boolean>>({})

function initOpen() {
  const stored = readStored()
  const initial: Record<string, boolean> = {}
  for (const category of props.nav) {
    initial[category.uuid]
      = typeof stored[category.uuid] === 'boolean'
        ? stored[category.uuid]
        : category.defaultOpen
  }
  open.value = initial
}

onMounted(initOpen)

watch(() => props.nav, initOpen, { deep: true })

watch(
  () => route.path,
  () => {
    for (const category of props.nav) {
      const articleActive = category.articles.some(
        article => route.path === `/v/${props.versionSlug}/${article.slug}`
      )
      const categoryActive
        = route.path === `/v/${props.versionSlug}/category/${category.slug}`
      if (!articleActive && !categoryActive) continue

      if (open.value[category.uuid] === true) continue
      open.value = { ...open.value, [category.uuid]: true }
      writeStored({ ...readStored(), [category.uuid]: true })
    }
  },
  { immediate: true }
)

function setCategoryOpen(uuid: string, value: boolean) {
  open.value = { ...open.value, [uuid]: value }
  writeStored({ ...readStored(), [uuid]: value })
}

function onNavigate() {
  emit('navigate')
}
</script>

<template>
  <div
    class="flex flex-col gap-5"
    :class="props.class"
  >
    <NuxtLink
      :to="`/v/${versionSlug}`"
      class="block text-[15px] font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
      @click="onNavigate"
    >
      {{ siteName }}
    </NuxtLink>

    <nav
      aria-label="Documentation"
      class="space-y-5"
    >
      <div
        v-for="category in nav"
        :key="category.uuid"
      >
        <div class="mb-1 flex items-center gap-0.5">
          <button
            type="button"
            :aria-expanded="open[category.uuid] ?? category.defaultOpen"
            :aria-label="`${(open[category.uuid] ?? category.defaultOpen) ? 'Collapse' : 'Expand'} ${category.title}`"
            class="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            @click="setCategoryOpen(category.uuid, !(open[category.uuid] ?? category.defaultOpen))"
          >
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5 transition-transform duration-150"
              :class="{ 'rotate-90': open[category.uuid] ?? category.defaultOpen }"
            />
          </button>
          <NuxtLink
            :to="`/v/${versionSlug}/category/${category.slug}`"
            class="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            :class="{ 'bg-accent text-foreground': route.path === `/v/${versionSlug}/category/${category.slug}` }"
            @click="setCategoryOpen(category.uuid, true); onNavigate()"
          >
            {{ category.title }}
          </NuxtLink>
        </div>
        <ul
          v-if="open[category.uuid] ?? category.defaultOpen"
          class="ms-3 space-y-0.5 border-s border-border/80 ps-2"
        >
          <li
            v-for="article in category.articles"
            :key="article.uuid"
          >
            <NuxtLink
              :to="`/v/${versionSlug}/${article.slug}`"
              class="block rounded-lg px-2.5 py-[0.4rem] text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              :class="{
                'bg-docs-primary/10 font-medium text-docs-primary hover:bg-docs-primary/10 hover:text-docs-primary':
                  route.path === `/v/${versionSlug}/${article.slug}`
              }"
              @click="onNavigate"
            >
              {{ article.title }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </nav>
  </div>
</template>
