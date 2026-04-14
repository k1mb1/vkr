<script setup lang="ts">
import type { StudentGroupResponse } from '#shared/types/backend'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'
import { useGroupsBreadcrumbLabel } from '~/composables/useGroupsBreadcrumbItems'

const route = useRoute()
const groupId = computed(() => String(route.params.uuid ?? ''))
const activeGroupName = useGroupsBreadcrumbLabel()

const { findById } = useStudentsGroupsApi()
const {
  data,
  pending,
  error,
} = findById(groupId)

const group = computed<StudentGroupResponse | null>(() => data.value ?? null)
const studentsCount = computed(() => group.value?.students?.length ?? 0)
const subgroupsCount = computed(() => group.value?.subgroups?.length ?? 0)

watch(groupId, () => {
  activeGroupName.value = null
}, { immediate: true })

watch(group, (value) => {
  activeGroupName.value = value?.name ?? null
}, { immediate: true })
</script>

<template>
  <div class="flex h-full flex-col gap-4 p-4 sm:p-6">
    <div v-if="pending" class="space-y-4">
      <USkeleton class="h-8 w-1/3" />
      <USkeleton class="h-36 w-full" />
      <USkeleton class="h-36 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Ошибка при загрузке группы"
      :description="error.message"
    />

    <template v-else-if="group">
      <UCard v-if="studentsCount">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-lg font-semibold">
              Студенты
            </h3>
            <UBadge color="neutral" variant="soft">
              {{ studentsCount }}
            </UBadge>
          </div>
        </template>

        <ul class="list-disc list-inside space-y-1.5">
          <li
            v-for="(student, index) in group.students"
            :key="student.id || index"
            class="text-sm text-muted"
          >
            {{ student.username }}
          </li>
        </ul>
      </UCard>

      <template v-if="subgroupsCount || !studentsCount">
        <USeparator v-if="studentsCount" />

        <div class="flex items-center justify-between gap-3">
          <h3 class="text-lg font-semibold">
            Подгруппы
          </h3>
          <UBadge color="neutral" variant="soft">
            {{ subgroupsCount }}
          </UBadge>
        </div>

        <div v-if="subgroupsCount" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UCard v-for="subgroup in group.subgroups" :key="subgroup.id">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h4 class="font-medium">
                  {{ subgroup.name }}
                </h4>
                <UBadge color="neutral" variant="subtle">
                  {{ subgroup.students.length }}
                </UBadge>
              </div>
            </template>

            <ul v-if="subgroup.students?.length" class="list-disc list-inside space-y-1.5">
              <li
                v-for="(student, index) in subgroup.students"
                :key="student.id || index"
                class="text-sm text-muted"
              >
                {{ student.username }}
              </li>
            </ul>

            <UEmpty
              v-else
              icon="i-lucide-users-round"
              title="Подгруппа пуста"
              description="Студенты для этой подгруппы пока не назначены."
              variant="naked"
              class="py-3"
            />
          </UCard>
        </div>

        <UEmpty
          v-else
          icon="i-lucide-users"
          title="Подгрупп пока нет"
          description="Создайте подгруппы, чтобы распределить студентов."
          variant="naked"
          class="rounded-lg border border-default py-8"
        />
      </template>
    </template>

    <UEmpty
      v-else
      icon="i-lucide-search-x"
      title="Группа не найдена"
      description="Проверьте ссылку или вернитесь к списку групп."
      variant="naked"
      class="h-full"
    />
  </div>
</template>
