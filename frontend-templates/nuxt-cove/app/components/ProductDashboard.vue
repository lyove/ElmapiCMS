<script setup lang="ts">
/** Cove product surface: async standup dashboard mock for marketing. */
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_24px_80px_rgb(0_0_0_/_0.12)]">
    <div class="grid min-h-[320px] sm:min-h-[380px] sm:grid-cols-[180px_1fr]">
      <aside class="hidden border-r border-ink-100 bg-ink-50/80 p-4 sm:block">
        <p class="text-xs font-semibold text-ink-900">
          Cove
        </p>
        <ul class="mt-5 space-y-3 text-sm text-ink-500">
          <li class="flex items-center gap-2 font-medium text-forest-700">
            <UIcon name="i-lucide-message-square" class="size-4" />
            Updates
          </li>
          <li class="flex items-center gap-2">
            <UIcon name="i-lucide-calendar-days" class="size-4" />
            Rollups
          </li>
          <li class="flex items-center gap-2">
            <UIcon name="i-lucide-alert-circle" class="size-4" />
            Blockers
          </li>
          <li class="flex items-center gap-2">
            <UIcon name="i-lucide-users" class="size-4" />
            Team
          </li>
        </ul>
        <p class="mt-10 text-xs text-ink-400">
          Help center
        </p>
      </aside>

      <div class="p-4 sm:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-ink-900">
              Morning updates
            </p>
            <p class="text-xs text-ink-400">
              Tuesday · 3 of 5 posted
            </p>
          </div>
          <span class="rounded-full bg-lime-400/30 px-2.5 py-1 text-[11px] font-semibold text-forest-800">
            Live
          </span>
        </div>

        <div class="mt-4 space-y-3">
          <div class="rounded-xl border border-ink-100 bg-white p-3">
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-forest-100 text-xs font-semibold text-forest-800">
                AR
              </span>
              <div>
                <p class="text-sm font-medium text-ink-900">
                  Alex Rivera
                </p>
                <p class="text-[11px] text-ink-400">
                  09:14
                </p>
              </div>
            </div>
            <p class="mt-2 text-sm text-ink-600">
              Shipped digest preview. Pairing on rollup drafts today.
            </p>
            <p class="mt-2 inline-flex rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
              Blocker · design sign-off
            </p>
          </div>

          <div class="rounded-xl border border-ink-100 bg-white p-3">
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                PN
              </span>
              <div>
                <p class="text-sm font-medium text-ink-900">
                  Priya Nair
                </p>
                <p class="text-[11px] text-ink-400">
                  08:51
                </p>
              </div>
            </div>
            <p class="mt-2 text-sm text-ink-600">
              Closed Harbor onboarding. Drafting async standup playbook.
            </p>
          </div>

          <div class="rounded-xl border border-ink-100 bg-ink-50/60 p-3 opacity-80">
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                JE
              </span>
              <div>
                <p class="text-sm font-medium text-ink-900">
                  Jordan Ellis
                </p>
                <p class="text-[11px] text-ink-400">
                  Waiting
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
