<script setup lang="ts">
import { localePath } from '~/utils/i18n'

const { locale, dictionary } = useLocaleDict()
const { register } = useAuth()
const error = ref<string | null>(null)
const verifyToken = ref<string | null>(null)
const pending = ref(false)

useHead({
  title: dictionary.value.auth.registerTitle,
  htmlAttrs: { lang: locale.value },
})

async function onSubmit(event: Event) {
  event.preventDefault()
  pending.value = true
  error.value = null
  verifyToken.value = null
  const form = event.target as HTMLFormElement
  const fd = new FormData(form)

  try {
    const data = await register({
      email: String(fd.get('email') || ''),
      password: String(fd.get('password') || ''),
      display_name: String(fd.get('display_name') || ''),
    })

    if (data.verification_required) {
      verifyToken.value = data.verification_token || '(no token returned)'
      pending.value = false
      return
    }

    if (data.user) {
      await navigateTo(localePath(locale.value, '/account'))
      return
    }

    await navigateTo(localePath(locale.value, '/login'))
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }, statusMessage?: string }
    error.value
      = err?.data?.statusMessage || err?.statusMessage || 'Registration failed.'
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm space-y-4">
    <h1 class="text-2xl font-semibold tracking-tight">
      {{ dictionary.auth.registerTitle }}
    </h1>
    <form class="space-y-4" @submit="onSubmit">
      <div class="space-y-1.5">
        <label for="display_name" class="block text-sm font-medium">
          {{ dictionary.auth.displayName }}
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          autocomplete="name"
          class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
      </div>
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
          minlength="8"
          autocomplete="new-password"
          class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
      </div>
      <p v-if="error" class="text-sm text-red-600">
        {{ error }}
      </p>
      <p
        v-if="verifyToken"
        class="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
      >
        Email verification is required. Your app owns delivery of this token:
        <code class="break-all">{{ verifyToken }}</code>
      </p>
      <button
        type="submit"
        :disabled="pending"
        class="w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {{ pending ? '…' : dictionary.auth.submitRegister }}
      </button>
    </form>
    <p class="text-sm text-zinc-600">
      {{ dictionary.auth.hasAccount }}
      <NuxtLink :to="localePath(locale, '/login')" class="underline underline-offset-2">
        {{ dictionary.nav.login }}
      </NuxtLink>
    </p>
  </div>
</template>
