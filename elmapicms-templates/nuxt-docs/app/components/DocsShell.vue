<script setup lang="ts">
import type {
  ContentEntry,
  DocVersionFields,
  NavCategory,
  SearchItem
} from '../../server/utils/types'

const FULL_WIDTH_KEY = 'docs-full-width'
const LAYOUT_WIDTH = '97rem'
const SIDEBAR_WIDTH = '268px'

defineProps<{
  siteName: string
  versionSlug: string
  versions: ContentEntry<DocVersionFields>[]
  nav: NavCategory[]
  searchItems: SearchItem[]
}>()

const fullWidth = ref(false)

const sidebarGutterStyle = computed(() => ({
  width: fullWidth.value
    ? SIDEBAR_WIDTH
    : `max(${SIDEBAR_WIDTH}, calc((100vw - min(100vw, ${LAYOUT_WIDTH})) / 2 + ${SIDEBAR_WIDTH}))`
}))

onMounted(() => {
  const storedWidth = window.localStorage.getItem(FULL_WIDTH_KEY)
  if (storedWidth === '1') fullWidth.value = true
})

function onToggleFullWidth() {
  fullWidth.value = !fullWidth.value
  window.localStorage.setItem(FULL_WIDTH_KEY, fullWidth.value ? '1' : '0')
}
</script>

<template>
  <div class="relative min-h-full bg-background">
    <div
      aria-hidden
      class="pointer-events-none fixed inset-y-0 left-0 z-0 hidden bg-docs-sidebar lg:block"
      :style="sidebarGutterStyle"
    />

    <div
      class="relative z-10 mx-auto flex min-h-full w-full transition-[max-width] duration-200"
      :class="fullWidth ? 'max-w-none' : 'max-w-[97rem]'"
    >
      <aside class="sticky top-0 hidden h-svh w-[268px] shrink-0 border-r border-border/80 bg-transparent lg:block">
        <div class="h-full overflow-y-auto">
          <div class="px-4 py-5">
            <DocsSidebar
              :site-name="siteName"
              :nav="nav"
              :version-slug="versionSlug"
            />
          </div>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col bg-background">
        <DocsHeader
          :site-name="siteName"
          :version-slug="versionSlug"
          :versions="versions"
          :nav="nav"
          :search-items="searchItems"
          :full-width="fullWidth"
          @toggle-full-width="onToggleFullWidth"
        />
        <main class="min-w-0 flex-1 px-4 py-10 sm:px-6 md:px-8 lg:px-10 lg:py-12">
          <div class="mx-auto w-full max-w-[860px]">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
