<script setup lang="ts">
import type { PageCardProps } from '@nuxt/ui'

definePageMeta({ middleware: 'subject-permission' })

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

interface SettingsCard extends PageCardProps {
  /** Цвет акцентной иконки. */
  accent: string
}

interface SettingsGroup {
  key: string
  label: string
  icon: string
  description: string
  cards: SettingsCard[]
}

const groups = computed<SettingsGroup[]>(() => [
  {
    key: 'access',
    label: 'Доступ',
    icon: 'i-lucide-users',
    description: 'Кто и как работает с предметом',
    cards: [
      {
        to: `/dashboard/subjects/${subjectId.value}/settings/permissions`,
        title: 'Назначения преподавателей',
        description: 'Кто из преподавателей работает с предметом и с какими группами',
        icon: 'i-lucide-shield-check',
        accent: 'text-primary',
      },
    ],
  },
  {
    key: 'grading',
    label: 'Оценивание',
    icon: 'i-lucide-graduation-cap',
    description: 'Как считаются баллы и итоговая оценка',
    cards: [
      {
        to: `/dashboard/subjects/${subjectId.value}/settings/penalty-policy`,
        title: 'Понижение / повышение балла',
        description: 'Штрафы за просрочку и бонусы за досрочную сдачу',
        icon: 'i-lucide-gavel',
        accent: 'text-warning',
      },
      {
        to: `/dashboard/subjects/${subjectId.value}/settings/final-assessment-policy`,
        title: 'Промежуточная аттестация',
        description: 'Итоговые уровни (отметки) и порог по посещаемости',
        icon: 'i-lucide-award',
        accent: 'text-success',
      },
    ],
  },
  {
    key: 'attendance',
    label: 'Посещаемость',
    icon: 'i-lucide-calendar-check',
    description: 'Учёт присутствия и отметка на занятиях',
    cards: [
      {
        to: `/dashboard/subjects/${subjectId.value}/settings/attendance-policy`,
        title: 'Учёт посещаемости',
        description: 'Баллы за присутствие, опоздание и отсутствие на занятиях',
        icon: 'i-lucide-calendar-check',
        accent: 'text-info',
      },
      {
        to: `/dashboard/subjects/${subjectId.value}/settings/check-in-policy`,
        title: 'Единое время на отметку',
        description: 'Единые окна отметки по QR для всех занятий предмета',
        icon: 'i-lucide-timer',
        accent: 'text-info',
      },
    ],
  },
  {
    key: 'appearance',
    label: 'Отображение',
    icon: 'i-lucide-palette',
    description: 'Цветовая раскраска таблиц',
    cards: [
      {
        to: `/dashboard/subjects/${subjectId.value}/settings/grading-highlight-policy`,
        title: 'Подсветка таблицы оценок',
        description: 'Цветовая раскраска ячеек таблицы оценок по прогрессу',
        icon: 'i-lucide-palette',
        accent: 'text-primary',
      },
      {
        to: `/dashboard/subjects/${subjectId.value}/settings/attendance-highlight-policy`,
        title: 'Подсветка таблицы посещаемости',
        description: 'Цветовая раскраска ячеек таблицы посещаемости по статусу',
        icon: 'i-lucide-palette',
        accent: 'text-primary',
      },
    ],
  },
])
</script>

<template>
  <div class="flex flex-col gap-8">
    <UPageHeader
      title="Настройки предмета"
      description="Политики оценивания, посещаемости, доступы преподавателей и оформление таблиц."
    />

    <section
      v-for="group in groups"
      :key="group.key"
      class="flex flex-col gap-3"
    >
      <div class="flex items-center gap-2">
        <UIcon :name="group.icon" class="size-5 text-muted" />
        <h2 class="text-sm font-semibold text-highlighted">
          {{ group.label }}
        </h2>
        <span class="text-xs text-muted">· {{ group.description }}</span>
      </div>

      <UPageGrid class="sm:grid-cols-2 lg:grid-cols-3">
        <UPageCard
          v-for="card in group.cards"
          :key="card.to as string"
          :to="card.to"
          :title="card.title"
          :description="card.description"
          variant="subtle"
          spotlight
          :ui="{
            leadingIcon: card.accent,
            title: 'font-semibold',
          }"
          :icon="card.icon"
        />
      </UPageGrid>
    </section>
  </div>
</template>
