<script setup lang="ts">
// Гостевой вход в демо-режиме. QR/ссылка ведут сюда: ставим демо-сессию и
// уводим в дашборд. Данные — сидовый набор (бэкенд не нужен).
const { t } = useI18n({
  messages: {
    en: {
      title: 'Demo access',
      loading: 'Preparing the demo…',
      disabledTitle: 'Demo is not available',
      disabledText: 'Demo mode is disabled on this instance.',
      home: 'Back to home',
      error: 'Could not start the demo. Please try again.',
    },
    ru: {
      title: 'Демо-доступ',
      loading: 'Готовим демо…',
      disabledTitle: 'Демо недоступно',
      disabledText: 'На этом стенде демо-режим выключен.',
      home: 'На главную',
      error: 'Не удалось запустить демо. Попробуйте ещё раз.',
    },
  },
})

const { public: { demoMode } } = useRuntimeConfig()
const { fetch: refreshSession } = useUserSession()
const failed = ref(false)

onMounted(async () => {
  if (!demoMode)
    return
  try {
    await $fetch('/api/demo/login', { method: 'POST' })
    await refreshSession()
    await navigateTo('/dashboard')
  }
  catch {
    failed.value = true
  }
})
</script>

<template>
  <div class="min-h-svh flex flex-col items-center justify-center gap-6 bg-default px-4 text-center">
    <template v-if="!demoMode">
      <UIcon name="i-lucide-lock" class="size-10 text-muted" />
      <div>
        <h1 class="text-xl font-semibold text-highlighted">
          {{ t('disabledTitle') }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ t('disabledText') }}
        </p>
      </div>
      <UButton to="/" variant="subtle" color="neutral" icon="i-lucide-arrow-left">
        {{ t('home') }}
      </UButton>
    </template>

    <template v-else-if="failed">
      <UIcon name="i-lucide-circle-alert" class="size-10 text-error" />
      <p class="text-sm text-muted">
        {{ t('error') }}
      </p>
      <UButton to="/" variant="subtle" color="neutral" icon="i-lucide-arrow-left">
        {{ t('home') }}
      </UButton>
    </template>

    <template v-else>
      <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-primary" />
      <p class="text-sm text-muted">
        {{ t('loading') }}
      </p>
    </template>
  </div>
</template>
