<script setup lang="ts">
const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { permission, pending, error } = usePermissions()

const lessonTypeLabel: Record<string, string> = {
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UPageHeader title="Обзор предмета">
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/permissions`"
          icon="i-lucide-shield-check"
          color="neutral"
          variant="outline"
          label="Назначения"
        />
        <UButton
          :to="`/dashboard/subjects/${subjectId}/lessons`"
          icon="i-lucide-calendar"
          color="neutral"
          variant="outline"
          label="Занятия"
        />
        <UButton
          :to="`/dashboard/subjects/${subjectId}/check-ins`"
          icon="i-lucide-clipboard-list"
          color="neutral"
          variant="outline"
          label="Check-in"
        />
        <UButton
          :to="`/dashboard/subjects/${subjectId}/attendances`"
          icon="i-lucide-clipboard-check"
          label="Посещаемость"
        />
      </template>
    </UPageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <USkeleton v-else-if="pending" class="h-20" />

    <UEmpty
      v-else-if="!permission"
      icon="i-lucide-shield-off"
      title="Назначения нет"
      description="У вас нет назначения по данному предмету."
      variant="naked"
      class="py-8"
    />

    <UCard v-else>
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-users" class="text-primary size-5" />
          <span class="font-medium">{{ permission.groupName ?? '—' }}</span>
        </div>
      </template>
      <div class="flex flex-wrap gap-2">
        <UBadge
          variant="soft"
          color="neutral"
          :label="permission.allowedLessonType ? lessonTypeLabel[permission.allowedLessonType] : 'Все типы'"
          icon="i-lucide-book"
        />
        <UBadge
          variant="soft"
          color="neutral"
          :label="permission.allowedSubgroupIndex != null ? `Подгруппа ${permission.allowedSubgroupIndex}` : 'Все подгруппы'"
          icon="i-lucide-layers"
        />
      </div>
    </UCard>
  </div>
</template>
