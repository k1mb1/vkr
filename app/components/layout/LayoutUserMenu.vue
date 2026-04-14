<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
  block?: boolean
}>()

const { user, logout } = useOidcAuth()
const colorMode = useColorMode()

const displayName = computed(() => user.value?.name || user.value?.email || 'User')
const displayEmail = computed(() => user.value?.email || 'No email')

const avatar = computed(() => ({
  src: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName.value)}`,
  alt: displayName.value,
}))

function mockSelect(label: string) {
  return (e: Event) => {
    e.preventDefault()
    console.warn(`[mock] ${label}`)
  }
}

const items = computed<DropdownMenuItem[][]>(() => ([
  [{
    type: 'label',
    label: displayName.value,
    avatar: avatar.value,
    description: displayEmail.value,
  }],
  [{
    label: 'Profile',
    icon: 'i-lucide-user',
    onSelect: mockSelect('Profile'),
  }, {
    label: 'Settings',
    icon: 'i-lucide-settings',
    onSelect: mockSelect('Settings'),
  }],
  [{
    label: 'Appearance',
    icon: 'i-lucide-sun-moon',
    children: [{
      label: 'Light',
      icon: 'i-lucide-sun',
      type: 'checkbox',
      checked: colorMode.preference === 'light',
      onSelect(e: Event) {
        e.preventDefault()
        colorMode.preference = 'light'
      },
    }, {
      label: 'Dark',
      icon: 'i-lucide-moon',
      type: 'checkbox',
      checked: colorMode.preference === 'dark',
      onSelect(e: Event) {
        e.preventDefault()
        colorMode.preference = 'dark'
      },
    }, {
      label: 'System',
      icon: 'i-lucide-monitor',
      type: 'checkbox',
      checked: colorMode.preference === 'system',
      onSelect(e: Event) {
        e.preventDefault()
        colorMode.preference = 'system'
      },
    }],
  }, {
    label: 'Language (mock)',
    icon: 'i-lucide-languages',
    onSelect: mockSelect('Language'),
  }, {
    label: 'Notifications (mock)',
    icon: 'i-lucide-bell',
    onSelect: mockSelect('Notifications'),
  }],
  [{
    label: 'Documentation',
    icon: 'i-lucide-book-open',
    to: 'https://ui.nuxt.com/docs/getting-started/installation/nuxt',
    target: '_blank',
  }, {
    label: 'Help center (mock)',
    icon: 'i-lucide-life-buoy',
    onSelect: mockSelect('Help center'),
  }, {
    label: 'Send feedback (mock)',
    icon: 'i-lucide-message-square',
    onSelect: mockSelect('Send feedback'),
  }],
  [{
    label: 'Log out',
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
