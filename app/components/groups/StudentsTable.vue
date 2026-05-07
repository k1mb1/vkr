<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { StudentTableRow } from './types'

interface Props {
  rows: StudentTableRow[]
  loading: boolean
  sortDirection: 'asc' | 'desc'
  emptyTitle: string
  emptyDescription: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  toggleSort: []
}>()

const sortDirectionLabel = computed(() => {
  return props.sortDirection === 'asc' ? 'по возрастанию' : 'по убыванию'
})

const usernameCollator = new Intl.Collator('ru-RU', {
  sensitivity: 'base',
  numeric: true,
})

const tableColumns: TableColumn<StudentTableRow>[] = [
  {
    accessorKey: 'index',
    header: '№',
    meta: {
      class: {
        th: 'w-16',
        td: 'w-16',
      },
    },
  },
  {
    accessorKey: 'username',
    header: 'Имя',
  },
]
</script>

<template>
  <UTable
    :data="rows"
    :columns="tableColumns"
    :loading="loading"
    sticky="header"
  >
    <template #username-header>
      <UButton
        color="neutral"
        variant="ghost"
        class="justify-start px-0"
        :icon="sortDirection === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'"
        :aria-label="`Сортировать по имени (${sortDirectionLabel})`"
        @click="emit('toggleSort')"
      >
        Имя
      </UButton>
    </template>

    <template #empty>
      <UEmpty
        icon="i-lucide-users-round"
        :title="emptyTitle"
        :description="emptyDescription"
        variant="naked"
        class="py-6"
      />
    </template>
  </UTable>
</template>
