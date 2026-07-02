<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
  block?: boolean
}>()

const { user, logout } = useOidcAuth()
const colorMode = useColorMode()

const displayName = computed(() => user.value?.name || user.value?.email || 'Пользователь')
const displayEmail = computed(() => user.value?.email || '')

const avatar = computed(() => ({
  src: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName.value)}`,
  alt: displayName.value,
}))

const items = computed<DropdownMenuItem[][]>(() => ([
  [{
    type: 'label',
    label: displayName.value,
    avatar: avatar.value,
    description: displayEmail.value || undefined,
  }],
  [{
    label: 'Тема',
    icon: 'i-lucide-sun-moon',
    children: [{
      label: 'Светлая',
      icon: 'i-lucide-sun',
      type: 'checkbox',
      checked: colorMode.preference === 'light',
      onSelect(e: Event) {
        e.preventDefault()
        colorMode.preference = 'light'
      },
    }, {
      label: 'Тёмная',
      icon: 'i-lucide-moon',
      type: 'checkbox',
      checked: colorMode.preference === 'dark',
      onSelect(e: Event) {
        e.preventDefault()
        colorMode.preference = 'dark'
      },
    }, {
      label: 'Системная',
      icon: 'i-lucide-monitor',
      type: 'checkbox',
      checked: colorMode.preference === 'system',
      onSelect(e: Event) {
        e.preventDefault()
        colorMode.preference = 'system'
      },
    }],
  }, {
    label: 'Обратная связь',
    icon: 'i-lucide-message-circle',
    to: 'https://k1mbb.t.me',
    target: '_blank',
  }],
  [{
    label: 'Выйти',
    icon: 'i-lucide-log-out',
    color: 'error',
    async onSelect(e: Event) {
      e.preventDefault()
      await logout()
    },
  }],
]))
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-64' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :label="collapsed ? undefined : displayName"
      :avatar="avatar"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      :block="block"
      :square="collapsed"
      class="w-full data-[state=open]:bg-elevated"
      :ui="{ trailingIcon: 'text-dimmed' }"
    />
  </UDropdownMenu>
</template>
