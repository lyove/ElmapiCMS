<script setup lang="ts">
import { localePath } from '~/utils/i18n'

const { locale, dictionary } = useLocaleDict()
const { login } = useAuth()
const route = useRoute()
const error = ref<string | null>(null)
const pending = ref(false)

useHead({
  title: dictionary.value.auth.loginTitle,
  htmlAttrs: { lang: locale.value },
})

async function onSubmit(event: Event) {
  event.preventDefault()
  pending.value = true
  error.value = null
  const form = event.target as HTMLFormElement
  const fd = new FormData(form)

  try {
    await login(String(fd.get('email') || ''), String(fd.get('password') || ''))
    const callback = String(route.query.callbackUrl || localePath(locale.value, '/account'))
    await navigateTo(callback)
  }
  catch {
    error.value
      = 'Sign-in failed. Check your email and password, or confirm your email if verification is required.'
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm space-y-4">
    <h1 class="text-2xl font-semibold tracking-tight">
      {{ dictionary.auth.loginTitle }}
    </h1>
    <form class="space-y-4" @submit="onSubmit">
      <div class="space-y-1.5">
        <label for="email" class="block text-sm font-medium">{{ dictionary.auth.email }}</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
      </div>
      <div class="space-y-1.5">
        <label for="password" class="block text-sm font-medium">{{ dictionary.auth.password }}</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
      </div>
      <p v-if="error" class="text-sm text-red-600">
        {{ error }}
      </p>
      <button
        type="submit"
        :disabled="pending"
        class="w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {{ pending ? '…' : dictionary.auth.submitLogin }}
      </button>
    </form>
    <p class="text-sm text-zinc-600">
      {{ dictionary.auth.noAccount }}
      <NuxtLink :to="localePath(locale, '/register')" class="underline underline-offset-2">
        {{ dictionary.nav.register }}
      </NuxtLink>
    </p>
  </div>
</template>
