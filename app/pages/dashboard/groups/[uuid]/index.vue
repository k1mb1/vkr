<script setup lang="ts">
import type { StudentGroupResponse } from '#shared/types/backend'
import { useGroupsBreadcrumbLabel } from '~/composables/useGroupsBreadcrumbItems'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'

const route = useRoute()
const groupId = computed(() => String(route.params.uuid ?? ''))
const activeGroupName = useGroupsBreadcrumbLabel()

const { findById } = useStudentsGroupsApi()
const {
  data,
  pending,
  error,
  refresh
} = findById(groupId)

const group = computed<StudentGroupResponse | null>(() => data.value ?? null)

watch(groupId, () => {
  activeGroupName.value = null
}, { immediate: true })

watch(group, (value) => {
  activeGroupName.value = value?.name ?? null
}, { immediate: true })

const onRefresh = () => refresh()
</script>

<template>
  <div class="flex h-full flex-col gap-4 p-4 sm:p-6">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Failed to load group"
      :description="error.message"
    />

    <UPageCard
      v-else-if="group"
      class="flex-1"
    >
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ group.name }}
          </h2>

          <UBadge
            color="neutral"
            variant="soft"
          >
            {{ group.subgroups.length }} subgroups
          </UBadge>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-base font-semibold text-highlighted">
              Students
            </h3>
            <span class="text-sm text-muted">
              {{ group.students.length }} total
            </span>
          </div>

          <div
            v-if="group.students.length"
            class="flex flex-wrap gap-2"
          >
            <UBadge
              v-for="student in group.students"
              :key="student.id"
              color="neutral"
              variant="outline"
            >
              {{ student.name }}
            </UBadge>
          </div>

          <UAlert
            v-else
            color="neutral"
            variant="soft"
            title="No group students"
            description="This group has no students yet."
          />
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-base font-semibold text-highlighted">
              Subgroups
            </h3>
            <span class="text-sm text-muted">
              {{ group.subgroups.length }} total
            </span>
          </div>

          <div
            v-if="group.subgroups.length"
            class="space-y-3"
          >
            <div
              v-for="subgroup in group.subgroups"
              :key="subgroup.id"
              class="rounded-md border border-default p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="font-medium text-default">
                  {{ subgroup.name }}
                </p>
                <span class="text-sm text-muted">
                  {{ subgroup.students.length }} students
                </span>
              </div>

              <div
                v-if="subgroup.students.length"
                class="mt-2 flex flex-wrap gap-2"
              >
                <UBadge
                  v-for="student in subgroup.students"
                  :key="student.id"
                  color="neutral"
                  variant="subtle"
                >
                  {{ student.name }}
                </UBadge>
              </div>

              <p
                v-else
                class="mt-2 text-sm text-muted"
              >
                No students in this subgroup yet.
              </p>
            </div>
          </div>

          <UAlert
            v-else
            color="neutral"
            variant="soft"
            title="No subgroup students"
            description="This group has no subgroups yet."
          />
        </div>
      </div>
    </UPageCard>

    <UPageCard
      v-else-if="pending"
      class="space-y-3"
    >
      <USkeleton class="h-8 w-56" />
      <USkeleton class="h-5 w-40" />
      <USkeleton class="h-28 w-full" />
    </UPageCard>

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
        @click="onRefresh"
      >
        Refresh
      </UButton>
    </div>
  </div>
</template>
