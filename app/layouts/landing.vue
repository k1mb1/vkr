<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n({
  messages: {
    en: {
      nav: {
        dashboard: 'Journal',
        login: 'Sign in',
        language: 'Language',
        features: 'Features',
        how: 'How it works',
        faq: 'FAQ',
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
        features: 'Возможности',
        how: 'Как это работает',
        faq: 'Вопросы и ответы',
      },
      footer: {
        copy: 'Классный журнал · Все права защищены',
      },
    },
  },
})

const navItems = computed<NavigationMenuItem[]>(() => [
  { label: t('nav.features'), to: '#features' },
  { label: t('nav.how'), to: '#how' },
  { label: t('nav.faq'), to: '#faq' },
])
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

      <UNavigationMenu :items="navItems" variant="link" class="hidden md:flex" />

      <template #right>
        <AppLocaleSelect />
        <UColorModeButton />
        <UButton to="/auth/login" icon="i-lucide-log-in">
          {{ t('nav.login') }}
        </UButton>
      </template>

      <template #body>
        <div class="flex flex-col gap-3 p-4">
          <UNavigationMenu :items="navItems" orientation="vertical" class="-mx-2.5" />

          <USeparator />

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
            <span class="text-muted">{{ t('nav.language') }}</span>
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
        <p class="text-muted">
          © {{ new Date().getFullYear() }} {{ t('footer.copy') }}
        </p>
      </template>
    </UFooter>
  </div>
</template>
