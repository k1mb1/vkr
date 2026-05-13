<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { TableColumn } from '@nuxt/ui'

type SubjectTeachingRowResponse = components['schemas']['SubjectTeachingRowResponse']

const route = useRoute()
const subjectId = computed(() => String(route.params.uuid ?? ''))

const { data, pending, error, refresh } = useBackend('/api/subjects/{id}/teaching-rows', {
  method: 'GET',
  path: {
    id: subjectId,
  },
})

const rows = computed<SubjectTeachingRowResponse[]>(() => data.value ?? [])

const columns: TableColumn<SubjectTeachingRowResponse>[] = [
  {
    accessorKey: 'groupName',
    header: 'Группа',
  },
  {
    accessorKey: 'teacherName',
    header: 'Преподаватель',
  },
  {
    accessorKey: 'lessonTypeScope',
    header: 'Тип занятия',
    cell: ({ row }) => {
      const scope = row.original.lessonTypeScope
      if (!scope) {
        return 'Все'
      }
      const map: Record<string, string> = {
        LECTURE: 'Лекция',
        PRACTICE: 'Практика',
      }
      return map[scope] ?? scope
    },
  },
  {
    accessorKey: 'subgroupIndex',
    header: 'Подгруппа',
    cell: ({ row }) => {
      const index = row.original.subgroupIndex
      return index === null || index === undefined ? 'Все' : String(index)
    },
  },
]
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <UPageHeader title="Назначения">
      <template #links>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="refresh()"
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

    <UTable
      v-else
      :data="rows"
      :columns="columns"
      :loading="pending && rows.length === 0"
      sticky
    >
      <template #empty>
        <UEmpty
          icon="i-lucide-book-open"
          title="Назначения не найдены"
          description="Для этого предмета пока нет назначений."
          variant="naked"
          class="py-6"
        />
      </template>
    </UTable>
  </div>
</template>
