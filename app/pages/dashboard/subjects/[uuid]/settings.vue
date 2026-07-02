<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))
const base = computed(() => `/dashboard/subjects/${subjectId.value}/settings`)

// Боковая навигация — постоянный каркас (layout) для всех страниц настроек.
// Группы с заголовками (Доступ / Оценивание / Посещаемость / Отображение) читаются
// как разделы, а не плоский список; метки короткие, чтобы помещались в узкую
// колонку в одну строку. Дефолтный раздел — «Назначения» (см. settings/index.vue).
const navGroups = computed<NavigationMenuItem[][]>(() => {
  const b = base.value
  const link = (to: string, label: string, icon: string): NavigationMenuItem => ({
    label,
    icon,
    to,
    active: route.path === to || route.path.startsWith(`${to}/`),
  })

  return [
    [
      { label: 'Доступ', type: 'label' },
      link(`${b}/permissions`, 'Назначения', 'i-lucide-shield-check'),
    ],
    [
      { label: 'Оценивание', type: 'label' },
      link(`${b}/penalty-policy`, 'Понижение / бонусы', 'i-lucide-gavel'),
      link(`${b}/final-assessment-policy`, 'Аттестация', 'i-lucide-award'),
    ],
    [
      { label: 'Посещаемость', type: 'label' },
      link(`${b}/attendance-policy`, 'Учёт посещаемости', 'i-lucide-calendar-check'),
      link(`${b}/check-in-policy`, 'Время на отметку', 'i-lucide-timer'),
    ],
    [
      { label: 'Отображение', type: 'label' },
      link(`${b}/grading-highlight-policy`, 'Подсветка оценок', 'i-lucide-palette'),
      link(`${b}/attendance-highlight-policy`, 'Подсветка посещаемости', 'i-lucide-palette'),
    ],
  ]
})
</script>

<template>
  <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
    <aside class="shrink-0 lg:w-60 lg:sticky lg:top-4">
      <UNavigationMenu
        :items="navGroups"
        orientation="vertical"
        highlight
        :ui="{ link: 'text-sm' }"
        class="w-full rounded-lg border border-default bg-elevated/30 p-2"
      />
    </aside>
    <div class="min-w-0 flex-1">
      <NuxtPage />
    </div>
  </div>
</template>
