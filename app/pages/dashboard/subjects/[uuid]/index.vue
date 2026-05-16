<script setup lang="ts">
import type { User } from '#auth-utils'

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { user } = useOidcAuth()
const { sub: teacherId } = user.value as User

const { permissions, pending, error } = usePermissions(subjectId, teacherId!)

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
        Ваши назначения по этому предмету:
      </p>

      <div v-if="pending" class="flex flex-col gap-3">
        <USkeleton v-for="i in 3" :key="i" class="h-20" />
      </div>

      <UEmpty
        v-else-if="permissions.length === 0"
        icon="i-lucide-shield-off"
        title="Назначений нет"
        description="У вас нет назначений по данному предмету."
        variant="naked"
        class="py-8"
      />

      <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="perm in permissions"
          :key="perm.id"
          :ui="{ body: 'p-4' }"
        >
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-users" class="text-(--ui-primary) mt-0.5 size-5 shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="font-medium">
                {{ perm.groupName ?? '—' }}
              </p>
              <div class="text-muted mt-1 flex flex-wrap gap-2 text-sm">
                <UBadge
                  variant="soft"
                  color="neutral"
                  :label="perm.allowedLessonType ? lessonTypeLabel[perm.allowedLessonType] : 'Все типы'"
                  icon="i-lucide-book"
                />
                <UBadge
                  variant="soft"
                  color="neutral"
                  :label="perm.allowedSubgroupIndex != null ? `Подгруппа ${perm.allowedSubgroupIndex}` : 'Все подгруппы'"
                  icon="i-lucide-layers"
                />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
