<script setup lang="ts">
const { t } = useI18n({
  messages: {
    en: {
      brand: 'Grade Journal',
      title: 'Welcome back',
      subtitle: 'Sign in to continue to your journal.',
      action: 'Sign in',
      hint: 'Single sign-on via your institution account.',
      back: 'Back to home',
    },
    ru: {
      brand: 'Классный журнал',
      title: 'С возвращением',
      subtitle: 'Войдите, чтобы продолжить работу с журналом.',
      action: 'Войти',
      hint: 'Единый вход через аккаунт вашего учебного заведения.',
      back: 'На главную',
    },
  },
})

const route = useRoute()
const { login, loggedIn } = useOidcAuth()

const redirectTo = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard',
)

const pending = ref(false)
async function signIn() {
  pending.value = true
  await login(redirectTo.value)
}

if (loggedIn.value)
  await navigateTo(redirectTo.value)
</script>

<template>
  <div class="min-h-svh flex flex-col bg-default">
    <div class="flex items-center justify-end gap-2 p-4">
      <AppLocaleSelect />
      <UColorModeButton />
    </div>

    <div class="flex-1 flex items-center justify-center px-4 pb-16">
      <div class="w-full max-w-sm flex flex-col items-center gap-8">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-highlighted">
          <UIcon name="i-lucide-notebook-pen" class="size-6 text-primary" />
          <span>{{ t('brand') }}</span>
        </NuxtLink>

        <UPageCard class="w-full">
          <div class="flex flex-col gap-6">
            <div class="flex flex-col items-center text-center gap-1">
              <h1 class="text-xl font-semibold text-highlighted">
                {{ t('title') }}
              </h1>
              <p class="text-sm text-muted">
                {{ t('subtitle') }}
              </p>
            </div>

            <UButton
              block
              size="xl"
              icon="i-lucide-log-in"
              :loading="pending"
              @click="signIn"
            >
              {{ t('action') }}
            </UButton>

            <p class="text-xs text-muted text-center">
              {{ t('hint') }}
            </p>
          </div>
        </UPageCard>

        <UButton
          to="/"
          variant="link"
          color="neutral"
          size="sm"
          icon="i-lucide-arrow-left"
        >
          {{ t('back') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
