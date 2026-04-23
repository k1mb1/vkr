<script setup lang="ts">
const { t } = useI18n({
  messages: {
    en: {
      nav: {
        dashboard: 'Journal',
        login: 'Sign in',
        language: 'Language',
      },
      footer: {
        copy: 'Grade Journal · All rights reserved',
      },
    },
    ru: {
      nav: {
        dashboard: 'Журнал',
        login: 'Войти',
        language: 'Язык',
      },
      footer: {
        copy: 'Классный журнал · Все права защищены',
      },
    },
  },
})
</script>

<template>
  <div class="min-h-svh flex flex-col">
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-base text-highlighted">
          <UIcon name="i-lucide-notebook-pen" class="size-5 text-primary shrink-0" />
          <span class="hidden sm:block">{{ t('footer.copy').split('·')[0]?.trim() }}</span>
        </NuxtLink>
      </template>

      <template #right>
        <AppLocaleSelect />
        <UColorModeButton />
        <UButton to="/auth/login" icon="i-lucide-log-in">
          {{ t('nav.login') }}
        </UButton>
      </template>

      <template #body>
        <div class="flex flex-col gap-3 p-4">
          <UButton
            to="/dashboard"
            variant="ghost"
            color="neutral"
            icon="i-lucide-notebook-pen"
            block
          >
            {{ t('nav.dashboard') }}
          </UButton>

          <USeparator />

          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-muted">{{ t('nav.language') }}</span>
            <AppLocaleSelect full />
          </div>
        </div>
      </template>
    </UHeader>

    <UMain class="flex-1">
      <slot />
    </UMain>

    <USeparator />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          © {{ new Date().getFullYear() }} {{ t('footer.copy') }}
        </p>
      </template>
    </UFooter>
  </div>
</template>
