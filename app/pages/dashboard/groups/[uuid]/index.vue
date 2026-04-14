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

watch(groupId, () => {
  activeGroupName.value = null
}, { immediate: true })

watch(group, (value) => {
  activeGroupName.value = value?.name ?? null
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <div v-if="pending" class="space-y-4">
      <USkeleton class="h-8 w-1/4" />
      <USkeleton class="h-32 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      title="Ошибка при загрузке группы"
      :description="error.message"
    />

    <template v-else-if="group">
      <!-- Студенты основной группы -->
      <UCard v-if="group.students?.length">
        <template #header>
          <h3 class="text-lg font-semibold">
            Студенты
          </h3>
        </template>

        <ul class="list-disc list-inside space-y-1">
          <li v-for="(student, index) in group.students" :key="student.id || index" class="text-gray-700 dark:text-gray-300">
            {{ student.name }}
          </li>
        </ul>
      </UCard>

      <!-- Подгруппы -->
      <template v-if="group.subgroups?.length">
        <h3 class="text-xl font-semibold pb-2">
          Подгруппы
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UCard v-for="subgroup in group.subgroups" :key="subgroup.id">
            <template #header>
              <h4 class="font-medium">
                {{ subgroup.name }}
              </h4>
            </template>

            <ul v-if="subgroup.students?.length" class="list-disc list-inside space-y-1">
              <li v-for="(student, index) in subgroup.students" :key="student.id || index" class="text-sm text-gray-700 dark:text-gray-300">
                {{ student.name || student }}
              </li>
            </ul>
          </UCard>
        </div>
      </template>
    </template>
  </div>
</template>
