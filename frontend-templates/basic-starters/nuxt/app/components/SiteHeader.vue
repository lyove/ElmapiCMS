<script setup lang="ts">
import type { Dictionary } from '~/utils/dictionaries'
import type { Locale } from '~/utils/i18n'
import { localePath } from '~/utils/i18n'

const props = defineProps<{
  locale: Locale
  dictionary: Dictionary
  siteName: string
}>()

const { signedIn, logout } = useAuth()
const logoutError = ref<string | null>(null)
const pending = ref(false)

async function onLogout() {
  pending.value = true
  logoutError.value = null
  try {
    await logout()
    await navigateTo(localePath(props.locale, '/'))
  }
  catch {
    logoutError.value = props.dictionary.auth.logoutFailed
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <header class="border-b border-zinc-200 bg-white">
    <div class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div class="flex flex-wrap items-center gap-4">
        <NuxtLink
          :to="localePath(locale, '/')"
          class="text-sm font-semibold tracking-tight text-zinc-900"
        >
          {{ siteName }}
        </NuxtLink>
        <nav class="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
          <NuxtLink :to="localePath(locale, '/notes')" class="hover:text-zinc-900">
            {{ dictionary.nav.notes }}
          </NuxtLink>
          <NuxtLink :to="localePath(locale, '/notes/new')" class="hover:text-zinc-900">
            {{ dictionary.nav.newNote }}
          </NuxtLink>
          <NuxtLink :to="localePath(locale, '/upload')" class="hover:text-zinc-900">
            {{ dictionary.nav.upload }}
          </NuxtLink>
          <NuxtLink
            v-if="signedIn"
            :to="localePath(locale, '/account')"
            class="hover:text-zinc-900"
          >
            {{ dictionary.nav.account }}
          </NuxtLink>
          <template v-else>
            <NuxtLink :to="localePath(locale, '/login')" class="hover:text-zinc-900">
              {{ dictionary.nav.login }}
            </NuxtLink>
            <NuxtLink :to="localePath(locale, '/register')" class="hover:text-zinc-900">
              {{ dictionary.nav.register }}
            </NuxtLink>
          </template>
        </nav>
      </div>
      <div class="flex items-center gap-3">
        <LocaleSwitcher :locale="locale" :label="dictionary.locale.switcher" />
        <div v-if="signedIn" class="flex flex-col items-end gap-1">
          <button
            type="button"
            class="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
            :disabled="pending"
            @click="onLogout"
          >
            {{ pending ? '…' : dictionary.nav.logout }}
          </button>
          <p v-if="logoutError" class="text-xs text-red-600">
            {{ logoutError }}
          </p>
        </div>
      </div>
    </div>
  </header>
</template>
