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
          label="Занятия"
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

    <div v-else>
      <p class="text-muted mb-4 text-sm">
        Ваше назначение по этому предмету:
      </p>

      <USkeleton v-if="pending" class="h-20" />

      <UEmpty
        v-else-if="!permission"
        icon="i-lucide-shield-off"
        title="Назначения нет"
        description="У вас нет назначения по данному предмету."
        variant="naked"
        class="py-8"
      />

      <UCard v-else :ui="{ body: 'p-4' }">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-users" class="text-(--ui-primary) mt-0.5 size-5 shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="font-medium">
              {{ permission.groupName ?? '—' }}
            </p>
            <div class="text-muted mt-1 flex flex-wrap gap-2 text-sm">
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
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
