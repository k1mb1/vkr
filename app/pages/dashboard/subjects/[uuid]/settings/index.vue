<script setup lang="ts">
import type { PageCardProps } from '@nuxt/ui'

definePageMeta({ middleware: 'subject-permission' })

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const cards = computed<PageCardProps[]>(() => [
  {
    to: `/dashboard/subjects/${subjectId.value}/settings/permissions`,
    title: 'Назначения преподавателей',
    description: 'Управление доступами преподавателей к предмету',
    icon: 'i-lucide-shield-check',
  },
  {
    to: `/dashboard/subjects/${subjectId.value}/settings/penalty-policy`,
    title: 'Политика понижения / повышения балла',
    description: 'Настройка штрафов за просрочку и бонусов за досрочную сдачу',
    icon: 'i-lucide-gavel',
  },
  {
    to: `/dashboard/subjects/${subjectId.value}/settings/attendance-policy`,
    title: 'Политика учёта посещаемости',
    description: 'Баллы за присутствие, опоздание и отсутствие на занятиях',
    icon: 'i-lucide-calendar-check',
  },
  {
    to: `/dashboard/subjects/${subjectId.value}/settings/check-in-policy`,
    title: 'Единое время на отметку',
    description: 'Единые окна отметки для всех сессий предмета',
    icon: 'i-lucide-timer',
  },
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Настройки предмета" />

    <UPageGrid>
      <UPageCard
        v-for="card in cards"
        :key="card.to as string"
        v-bind="card"
      />
    </UPageGrid>
  </div>
</template>
