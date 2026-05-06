<script setup lang="ts">
import { useStudentGroups } from '~/composables/api/useStudentsGroups'
import { usePagable } from '~/composables/usePagable'

const { page, pageSize, request, toPageState } = usePagable()

const { data, pending, error, refresh } = useStudentGroups(request)

const { rows, total, totalPages } = toPageState(data)
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader
      title="Группы"
      :links="[{
        icon: 'i-lucide-refresh-cw',
        color: 'neutral',
        variant: 'ghost',
        loading: pending,
        onClick: () => refresh(),
      }]"
    >
      <GroupsCreateToolbarForm/>
  </UPageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <UPageGrid v-if="pending && rows.length === 0">
      <USkeleton v-for="i in 6" :key="i" class="h-28" />
    </UPageGrid>

    <UEmpty
      v-else-if="rows.length === 0"
      icon="i-lucide-users"
      title="Группы не найдены"
      description="Создайте первую группу с помощью кнопки выше."
      variant="naked"
    />

    <UPageGrid v-else>
      <UPageCard
        v-for="group in rows"
        :key="group.id"
        :to="`/dashboard/groups/${group.id}`"
        :title="group.name"
        :ui="{ title: 'truncate' }"
      >
        <template #leading>
          <UAvatar
            icon="i-lucide-users"
            class="rounded-lg bg-secondary/10 text-secondary"
          />
        </template>

        <template #default>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              color="neutral"
              variant="soft"
              :label="`${group.totalStudentCount} students`"
            />
            <UBadge
              color="primary"
              variant="soft"
              :label="`${group.subgroupCount} subgroups`"
            />
          </div>
        </template>

        <template #footer>
          <UButton
            color="neutral"
            variant="soft"
            label="Open"
            trailing-icon="i-lucide-chevron-right"
            :to="`/dashboard/groups/${group.id}`"
          />
        </template>
      </UPageCard>
    </UPageGrid>

    <UPagination
      v-model:page="page"
      :items-per-page="pageSize"
      :total="total"
      :disabled="pending"
      class="justify-center"
    />
  </div>
</template>
