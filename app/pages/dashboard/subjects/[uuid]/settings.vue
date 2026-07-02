<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))
const base = computed(() => `/dashboard/subjects/${subjectId.value}/settings`)

// На обзоре (index) показываем крупные карточки-разделы; боковую навигацию — нет,
// чтобы не дублировать. На конкретной политике — master-detail: слева навигация,
// справа форма.
const isOverview = computed(() =>
  route.path === base.value || route.path === `${base.value}/`,
)

const navGroups = computed<NavigationMenuItem[][]>(() => {
  const b = base.value
  const link = (to: string, label: string, icon: string): NavigationMenuItem => ({
    label,
    icon,
    to,
    active: route.path === to || route.path.startsWith(`${to}/`),
  })

  return [
    [link(b, 'Обзор', 'i-lucide-layout-grid')],
    [link(`${b}/permissions`, 'Назначения преподавателей', 'i-lucide-shield-check')],
    [
      link(`${b}/penalty-policy`, 'Понижение / повышение балла', 'i-lucide-gavel'),
      link(`${b}/final-assessment-policy`, 'Промежуточная аттестация', 'i-lucide-award'),
    ],
    [
      link(`${b}/attendance-policy`, 'Учёт посещаемости', 'i-lucide-calendar-check'),
      link(`${b}/check-in-policy`, 'Единое время на отметку', 'i-lucide-timer'),
    ],
    [
      link(`${b}/grading-highlight-policy`, 'Подсветка оценок', 'i-lucide-palette'),
      link(`${b}/attendance-highlight-policy`, 'Подсветка посещаемости', 'i-lucide-palette'),
    ],
  ]
})
</script>

<template>
  <div
    v-if="!isOverview"
    class="flex flex-col gap-6 lg:flex-row lg:items-start"
  >
    <UNavigationMenu
      :items="navGroups"
      orientation="vertical"
      highlight
      class="shrink-0 lg:w-64 lg:sticky lg:top-4"
    />
    <div class="min-w-0 flex-1">
      <NuxtPage />
    </div>
  </div>

  <NuxtPage v-else />
</template>
