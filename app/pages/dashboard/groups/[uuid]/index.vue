<script setup lang="ts">
import type { StudentGroupResponse } from '#shared/types/backend'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const groupId = computed(() => String(route.params.uuid ?? ''))

const { findById } = useStudentsGroupsApi()
const {
  data,
  pending,
  error,
  refresh
} = findById(groupId)

const group = computed<StudentGroupResponse | null>(() => data.value ?? null)
const activeSubgroupId = ref('')

const groupStudents = computed(() => group.value?.students ?? [])
const subgroupsWithStudents = computed(() => {
  return (group.value?.subgroups ?? []).filter(subgroup => subgroup.students.length > 0)
})

const subgroupTabItems = computed(() => {
  return subgroupsWithStudents.value.map(subgroup => ({
    label: subgroup.name,
    value: subgroup.id
  }))
})

const activeSubgroup = computed(() => {
  if (!subgroupsWithStudents.value.length) {
    return null
  }

  return subgroupsWithStudents.value.find(subgroup => subgroup.id === activeSubgroupId.value)
    ?? subgroupsWithStudents.value[0]
})

watch(
  () => subgroupsWithStudents.value,
  (subgroups) => {
    if (!subgroups.length) {
      activeSubgroupId.value = ''
      return
    }

    const hasCurrent = subgroups.some(subgroup => subgroup.id === activeSubgroupId.value)

    if (!hasCurrent) {
      const firstSubgroup = subgroups[0]

      if (firstSubgroup) {
        activeSubgroupId.value = firstSubgroup.id
      }
    }
  },
  { immediate: true }
)

const breadcrumbItems = computed(() => [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Groups', to: '/dashboard/groups' },
  { label: group.value?.name ?? groupId.value }
])
</script>

<template>
  <BaseDashboardPanel
    id="dashboard-group-details"
    :items="breadcrumbItems"
  >
    <template #body>
      <div class="flex h-full min-h-0 flex-col gap-4 p-4 sm:p-6">
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          title="Failed to load group"
          :description="error.message"
        />

        <UPageCard
          v-else-if="pending"
          class="space-y-3"
        >
          <USkeleton class="h-8 w-56" />
          <USkeleton class="h-5 w-40" />
          <USkeleton class="h-28 w-full" />
        </UPageCard>

        <template v-else-if="group">
          <UPageCard>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  {{ group.name }}
                </h2>
                <p class="text-sm text-muted">
                  Group ID: {{ group.id }}
                </p>
              </div>

              <UBadge
                color="neutral"
                variant="soft"
              >
                {{ group.subgroups.length }} subgroups
              </UBadge>
            </div>
          </UPageCard>

          <UPageCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-base font-semibold text-highlighted">
                  Students
                </h3>
                <span class="text-sm text-muted">{{ groupStudents.length }} total</span>
              </div>
            </template>

            <div
              v-if="groupStudents.length"
              class="flex flex-wrap gap-2"
            >
              <UBadge
                v-for="student in groupStudents"
                :key="student.id"
                color="neutral"
                variant="outline"
              >
                {{ student.name }}
              </UBadge>
            </div>
          </UPageCard>

          <UPageCard v-if="subgroupsWithStudents.length">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-base font-semibold text-highlighted">
                  Subgroups
                </h3>
                <span class="text-sm text-muted">{{ subgroupsWithStudents.length }} with students</span>
              </div>
            </template>

            <div class="space-y-4">
              <UTabs
                v-model="activeSubgroupId"
                :items="subgroupTabItems"
                :content="false"
                color="neutral"
                variant="link"
                class="w-full"
              />

              <UAlert
                v-if="!activeSubgroup"
                color="neutral"
                variant="soft"
                title="Select subgroup"
              />

              <div
                v-else
                class="space-y-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="font-medium text-default">
                    {{ activeSubgroup.name }}
                  </p>
                  <span class="text-sm text-muted">
                    {{ activeSubgroup.students.length }} students
                  </span>
                </div>

                <div class="flex flex-wrap gap-2">
                  <UBadge
                    v-for="student in activeSubgroup.students"
                    :key="student.id"
                    color="neutral"
                    variant="subtle"
                  >
                    {{ student.name }}
                  </UBadge>
                </div>
              </div>
            </div>
          </UPageCard>

          <UAlert
            v-if="!groupStudents.length"
            color="neutral"
            variant="soft"
            title="No group students"
            description="This group has no students yet."
          />

          <UAlert
            v-if="!subgroupsWithStudents.length"
            color="neutral"
            variant="soft"
            title="No subgroup students"
            description="Subgroups without students are hidden."
          />
        </template>

        <UAlert
          v-else
          color="warning"
          variant="soft"
          title="Group was not found"
          :description="`No data returned for ${groupId}.`"
        />

        <div class="flex items-center justify-between gap-2">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-arrow-left"
            to="/dashboard/groups"
          >
            Back to groups
          </UButton>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            :loading="pending"
            @click="() => refresh()"
          >
            Refresh
          </UButton>
        </div>
      </div>
    </template>
  </BaseDashboardPanel>
</template>
