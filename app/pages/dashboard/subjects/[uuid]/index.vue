<script setup lang="ts">
const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permission, pending, error } = usePermissions()

const cards = computed(() => {
  const baseCards = [
    {
      label: 'Занятия',
      description: 'Расписание и управление занятиями',
      icon: 'i-lucide-calendar',
      to: `/dashboard/subjects/${subjectId.value}/lessons`,
    },
    {
      label: 'Отметка присутствия',
      description: 'Запуск и управление отметками присутствия',
      icon: 'i-lucide-clipboard-list',
      to: `/dashboard/subjects/${subjectId.value}/check-ins`,
    },
    {
      label: 'Посещаемость',
      description: 'Просмотр статистики посещаемости',
      icon: 'i-lucide-clipboard-check',
      to: `/dashboard/subjects/${subjectId.value}/attendances`,
    },
    {
      label: 'Оценки',
      description: 'Журнал оценок и задания',
      icon: 'i-lucide-graduation-cap',
      to: `/dashboard/subjects/${subjectId.value}/grades`,
    },
    {
      label: 'Итоговые оценки',
      description: 'Сводная таблица итоговых баллов по студентам',
      icon: 'i-lucide-trophy',
      to: `/dashboard/subjects/${subjectId.value}/final`,
    },
  ]

  return baseCards
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader
      title="Обзор предмета"
      description="Разделы предмета: занятия, отметка присутствия, посещаемость, оценки и итоги. Доступ к разделам зависит от вашего назначения."
    />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <UPageGrid v-else-if="pending">
      <USkeleton v-for="i in 6" :key="i" class="h-28" />
    </UPageGrid>

    <UEmpty
      v-else-if="!permission"
      icon="i-lucide-shield-off"
      title="Назначения нет"
      description="У вас нет назначения по данному предмету."
      variant="naked"
      class="py-8"
    />

    <UPageGrid v-else>
      <UPageCard
        v-for="card in cards"
        :key="card.label"
        :to="card.to"
        :title="card.label"
        :description="card.description"
        :icon="card.icon"
      />

      <SubjectPermissionGate>
        <UPageCard
          :to="`/dashboard/subjects/${subjectId}/settings`"
          title="Настройки"
          description="Назначения преподавателей и права доступа"
          icon="i-lucide-settings"
        />
      </SubjectPermissionGate>
    </UPageGrid>
  </div>
</template>
