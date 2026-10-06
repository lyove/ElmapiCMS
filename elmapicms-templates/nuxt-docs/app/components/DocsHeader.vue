<script setup lang="ts">
import type {
  ContentEntry,
  DocVersionFields,
  NavCategory,
  SearchItem
} from '../../server/utils/types'

defineProps<{
  siteName: string
  versionSlug: string
  versions: ContentEntry<DocVersionFields>[]
  nav: NavCategory[]
  searchItems: SearchItem[]
  fullWidth: boolean
}>()

const emit = defineEmits<{
  toggleFullWidth: []
}>()

const mobileOpen = ref(false)
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/70">
    <div class="flex h-14 items-center gap-2 px-3 sm:px-4 lg:px-5">
      <UButton
        variant="ghost"
        color="neutral"
        size="sm"
        square
        class="lg:hidden"
        aria-label="Open navigation"
        @click="mobileOpen = true"
      >
        <UIcon
          name="i-lucide-menu"
          class="size-4"
        />
      </UButton>

      <Teleport to="body">
        <div
          v-if="mobileOpen"
          class="fixed inset-0 z-50 lg:hidden"
        >
          <button
            type="button"
            class="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            @click="mobileOpen = false"
          />
          <aside class="absolute inset-y-0 left-0 w-[min(20rem,90vw)] overflow-y-auto bg-docs-sidebar px-4 py-5 shadow-xl">
            <DocsSidebar
              :site-name="siteName"
              :nav="nav"
              :version-slug="versionSlug"
              @navigate="mobileOpen = false"
            />
          </aside>
        </div>
      </Teleport>

      <VersionSwitcher
        :versions="versions"
        :current-slug="versionSlug"
      />

      <div class="ml-auto flex items-center gap-1.5">
        <DocsSearch
          :items="searchItems"
          :version-slug="versionSlug"
          class="w-44 sm:w-56 md:w-64"
        />
        <WidthToggle
          :full-width="fullWidth"
          @toggle="emit('toggleFullWidth')"
        />
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>
