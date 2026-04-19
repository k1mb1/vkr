<script setup lang="ts">
import type { StudentGroupResponse } from '#shared/types/backend'
import type { TableColumn, TabsItem } from '@nuxt/ui'
import { useStudentsApi } from '~/composables/api/useStudentsApi'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'
import { useGroupsBreadcrumbLabel } from '~/composables/useGroupsBreadcrumbItems'

const route = useRoute()
const groupId = computed(() => String(route.params.uuid ?? ''))
const activeGroupName = useGroupsBreadcrumbLabel()
const toast = useToast()

const { findById } = useStudentsGroupsApi()
const studentsApi = useStudentsApi()

const {
  data,
  pending,
  error,
  refresh,
} = findById(groupId)

const group = computed<StudentGroupResponse | null>(() => data.value ?? null)
const studentsCount = computed(() => group.value?.students?.length ?? 0)
const subgroupTabPrefix = 'subgroup:'

type SortDirection = 'asc' | 'desc'

interface StudentTableRow {
  key: string
  id: string
  index: number
  username: string
}

const activeTab = ref('students')
const sortDirection = ref<SortDirection>('asc')

const sortDirectionLabel = computed(() => {
  return sortDirection.value === 'asc' ? 'по возрастанию' : 'по убыванию'
})

function toggleNameSort(): void {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

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
        th: 'w-16 text-left',
        td: 'w-16 text-left',
      },
    },
  },
  {
    accessorKey: 'username',
    header: 'Имя',
    meta: {
      class: {
        th: 'text-left',
        td: 'text-left',
      },
    },
  },
  {
    id: 'actions',
    header: '',
    meta: {
      class: {
        th: 'w-12',
        td: 'w-12',
      },
    },
  },
]

const tabsData = computed(() => {
  const tabs: Array<{
    value: string
    label: string
    count: number
    icon: string
    title: string
    emptyTitle: string
    emptyDescription: string
    rows: Array<{ key: string, id: string, username: string }>
  }> = []

  if (studentsCount.value > 0) {
    const studentsRows = (group.value?.students ?? []).map((student, localIndex) => ({
      key: `students:${String(student.id ?? `${student.username}:${localIndex}`)}`,
      id: student.id,
      username: student.username,
    }))

    tabs.push({
      value: 'students',
      label: 'Студенты',
      count: studentsCount.value,
      icon: 'i-lucide-users-round',
      title: 'Основные студенты',
      emptyTitle: 'Нет студентов',
      emptyDescription: 'В этой вкладке пока нет студентов.',
      rows: studentsRows,
    })
  }

  for (const subgroup of group.value?.subgroups ?? []) {
    const tabValue = `${subgroupTabPrefix}${String(subgroup.id)}`
    const subgroupRows = subgroup.students.map((student, localIndex) => ({
      key: `${tabValue}:${String(student.id ?? `${student.username}:${localIndex}`)}`,
      id: student.id,
      username: student.username,
    }))

    tabs.push({
      value: tabValue,
      label: subgroup.name,
      count: subgroup.students.length,
      icon: 'i-lucide-git-fork',
      title: subgroup.name,
      emptyTitle: 'Подгруппа пуста',
      emptyDescription: 'Студенты для этой подгруппы пока не назначены.',
      rows: subgroupRows,
    })
  }

  return tabs
})

const groupTabs = computed<TabsItem[]>(() => {
  return tabsData.value.map(tab => ({
    value: tab.value,
    label: tab.label,
    icon: tab.icon,
    badge: {
      label: tab.count,
    },
  }))
})
const availableTabValues = computed<string[]>(() => tabsData.value.map(tab => tab.value))

const activeTabData = computed(() => {
  const tab = tabsData.value.find(item => item.value === activeTab.value)
  if (tab) {
    return tab
  }

  return tabsData.value[0] ?? null
})

const activeTabRows = computed<StudentTableRow[]>(() => {
  const sourceRows = activeTabData.value?.rows ?? []
  const sortedRows = [...sourceRows].sort((left, right) => {
    return sortDirection.value === 'asc'
      ? usernameCollator.compare(left.username, right.username)
      : usernameCollator.compare(right.username, left.username)
  })

  return sortedRows.map((row, index) => ({
    ...row,
    index: index + 1,
  }))
})

watch(groupId, () => {
  activeGroupName.value = null
}, { immediate: true })

watch(group, (value) => {
  activeGroupName.value = value?.name ?? null
}, { immediate: true })

watch(availableTabValues, (values) => {
  if (!values.length) {
    activeTab.value = 'students'
    return
  }

  if (!activeTab.value || !values.includes(activeTab.value)) {
    const firstValue = values[0]
    if (firstValue) {
      activeTab.value = firstValue
    }
  }
}, { immediate: true })

// Student actions
const editingStudent = ref<{ id: string, username: string } | null>(null)
const editUsername = ref('')
const editPending = ref(false)

const removingStudentId = ref<string | null>(null)
const removePending = ref(false)

const deletingStudentId = ref<string | null>(null)
const deletePending = ref(false)

function getErrorMessage(error: unknown): string {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'string')
    return error
  const e = error as { data?: { statusMessage?: string, message?: string }, message?: string }
  return e.data?.statusMessage || e.data?.message || e.message || 'Что-то пошло не так'
}

function openEditStudent(student: { id: string, username: string }) {
  editingStudent.value = { ...student }
  editUsername.value = student.username
}

function closeEditStudent() {
  editingStudent.value = null
  editUsername.value = ''
}

async function onRenameStudent() {
  if (!editingStudent.value || editPending.value)
    return
  editPending.value = true
  try {
    const { error: err } = await studentsApi.update(editingStudent.value.id, { name: editUsername.value.trim() })
    if (err.value)
      throw err.value
    toast.add({ title: 'Студент переименован', color: 'success', icon: 'i-lucide-check' })
    closeEditStudent()
    await refresh()
  }
  catch (e) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    editPending.value = false
  }
}

async function onRemoveFromGroup() {
  if (!removingStudentId.value || removePending.value)
    return
  removePending.value = true
  try {
    const { error: err } = await studentsApi.update(removingStudentId.value, { groupId: null })
    if (err.value)
      throw err.value
    toast.add({ title: 'Студент убран из группы', color: 'success', icon: 'i-lucide-check' })
    removingStudentId.value = null
    await refresh()
  }
  catch (e) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    removePending.value = false
  }
}

async function onDeleteStudent() {
  if (!deletingStudentId.value || deletePending.value)
    return
  deletePending.value = true
  try {
    const { error: err } = await studentsApi.remove(deletingStudentId.value)
    if (err.value)
      throw err.value
    toast.add({ title: 'Студент удалён', color: 'success', icon: 'i-lucide-check' })
    deletingStudentId.value = null
    await refresh()
  }
  catch (e) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    deletePending.value = false
  }
}

function getStudentActions(row: StudentTableRow) {
  return [
    [
      {
        label: 'Переименовать',
        icon: 'i-lucide-pencil',
        onSelect: () => openEditStudent({ id: row.id, username: row.username }),
      },
      {
        label: 'Убрать из группы',
        icon: 'i-lucide-user-minus',
        onSelect: () => { removingStudentId.value = row.id },
      },
    ],
    [
      {
        label: 'Удалить',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => { deletingStudentId.value = row.id },
      },
    ],
  ]
}
</script>

<template>
  <div class="p-4">
    <div v-if="pending && !group" class="space-y-4">
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
      <UTabs
        v-if="groupTabs.length"
        v-model="activeTab"
        :items="groupTabs"
      />

      <UCard v-if="groupTabs.length && activeTabData">
        <template #header>
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-semibold">
              {{ activeTabData.title }}
            </h3>
            <UBadge color="neutral" variant="soft">
              {{ activeTabRows.length }}
            </UBadge>
          </div>
        </template>

        <UTable
          :data="activeTabRows"
          :columns="tableColumns"
          :loading="pending"
          loading-animation="carousel"
          sticky="header"
        >
          <template #username-header>
            <UButton
              color="neutral"
              variant="ghost"
              class="justify-start px-0"
              :icon="sortDirection === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'"
              :aria-label="`Сортировать по имени (${sortDirectionLabel})`"
              @click="toggleNameSort"
            >
              Имя
            </UButton>
          </template>

          <template #actions-cell="{ row }">
            <UDropdownMenu :items="getStudentActions(row.original)">
              <UButton
                icon="i-lucide-ellipsis-vertical"
                color="neutral"
                variant="ghost"
                :aria-label="`Действия со студентом ${row.original.username}`"
              />
            </UDropdownMenu>
          </template>

          <template #empty>
            <UEmpty
              icon="i-lucide-users-round"
              :title="activeTabData.emptyTitle"
              :description="activeTabData.emptyDescription"
              variant="naked"
              class="py-6"
            />
          </template>
        </UTable>
      </UCard>

      <UEmpty
        v-else
        icon="i-lucide-users"
        title="В группе пока нет студентов и подгрупп"
        description="Добавьте студентов в группу или создайте подгруппы."
        variant="naked"
        class="rounded-lg border border-default py-8"
      />
    </template>

    <UEmpty
      v-else
      icon="i-lucide-search-x"
      title="Группа не найдена"
      description="Проверьте ссылку или вернитесь к списку групп."
      variant="naked"
      class="h-full"
    />

    <!-- Rename student modal -->
    <UModal
      :open="!!editingStudent"
      title="Переименовать студента"
      @update:open="(v) => { if (!v) closeEditStudent() }"
    >
      <template #body="{ close }">
        <div class="space-y-4">
          <UFormField label="Имя" required>
            <UInput
              v-model="editUsername"
              placeholder="Введите имя"
              :disabled="editPending"
              class="w-full"
              @keydown.enter="onRenameStudent"
            />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="editPending"
              @click="close()"
            >
              Отмена
            </UButton>

            <UButton
              icon="i-lucide-check"
              :loading="editPending"
              :disabled="editPending || !editUsername.trim()"
              @click="onRenameStudent"
            >
              Сохранить
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Remove from group confirm modal -->
    <UModal
      :open="!!removingStudentId"
      title="Убрать из группы"
      @update:open="(v) => { if (!v && !removePending) removingStudentId = null }"
    >
      <template #body="{ close }">
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Студент будет откреплён от группы, но не удалён из системы.
          </p>

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="removePending"
              @click="close()"
            >
              Отмена
            </UButton>

            <UButton
              color="warning"
              icon="i-lucide-user-minus"
              :loading="removePending"
              :disabled="removePending"
              @click="onRemoveFromGroup"
            >
              Убрать
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete student confirm modal -->
    <UModal
      :open="!!deletingStudentId"
      title="Удалить студента"
      @update:open="(v) => { if (!v && !deletePending) deletingStudentId = null }"
    >
      <template #body="{ close }">
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Студент будет удалён из системы безвозвратно.
          </p>

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="deletePending"
              @click="close()"
            >
              Отмена
            </UButton>

            <UButton
              color="error"
              icon="i-lucide-trash-2"
              :loading="deletePending"
              :disabled="deletePending"
              @click="onDeleteStudent"
            >
              Удалить
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
