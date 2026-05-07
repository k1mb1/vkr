<script setup lang="ts">
import type { GroupResponse } from '#shared/types/backend'
import type { Form } from '#ui/types'
import type { TableColumn, TabsItem } from '@nuxt/ui'
import type * as v from 'valibot'
import { UpdateGroupRequestSchema } from '#shared/types/backend/student-groups'
import { deleteStudent, updateStudent } from '~/composables/api/useStudentsApi'
import { patch, useStudentGroup } from '~/composables/api/useStudentsGroups'

const route = useRoute()
const groupId = computed(() => String(route.params.uuid ?? ''))
const activeGroupName = useState<string | null>('groups-active-name', () => null)
const toast = useToast()
const { toastError } = useApiError()

const {
  data,
  pending,
  error,
  refresh,
} = useStudentGroup(groupId)

const group = computed<GroupResponse | null>(() => data.value ?? null)
const _studentsCount = computed(() => group.value?.students?.length ?? 0)
const subgroupTabPrefix = 'subgroup:'

type SortDirection = 'asc' | 'desc'

interface StudentTableRow {
  key: string
  id: string | null
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
        th: 'w-16',
        td: 'w-16',
      },
    },
  },
  {
    accessorKey: 'username',
    header: 'Имя',
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

// ── Editing state ──────────────────────────────────────────
const isEditing = ref(false)
const editLoading = ref(false)

type EditSchema = v.InferOutput<typeof UpdateGroupRequestSchema>

const draft = reactive<EditSchema>({
  groupName: '',
  students: [],
})

const editFormRef = useTemplateRef<Form<typeof UpdateGroupRequestSchema>>('editForm')

const newStudentsInput = ref('')

const activeSubgroupId = computed<string | null>(() => {
  if (activeTab.value === 'students')
    return null
  return activeTab.value.replace(subgroupTabPrefix, '')
})

function enterEditMode() {
  if (!group.value)
    return
  draft.groupName = group.value.name
  draft.students = group.value.students.map(s => ({
    id: s.id,
    username: s.username,
    subgroupId: s.subgroupId,
  }))
  isEditing.value = true
}

function exitEditMode() {
  isEditing.value = false
  newStudentsInput.value = ''
}

const displayStudents = computed(() => {
  return isEditing.value ? draft.students : (group.value?.students ?? [])
})

function updateDraftStudentUsername(studentId: string | null, username: string) {
  const student = draft.students.find(s => s.id === studentId)
  if (student)
    student.username = username.trim()
}

function removeDraftStudent(studentId: string | null) {
  const idx = draft.students.findIndex(s => s.id === studentId)
  if (idx !== -1)
    draft.students.splice(idx, 1)
}

function parseUsernames(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function addDraftStudents(raw: string, subgroupId: string | null) {
  const usernames = parseUsernames(raw)
  const existing = new Set(draft.students.map(s => s.username))

  for (const username of usernames) {
    if (!existing.has(username)) {
      draft.students.push({ id: null, username, subgroupId })
      existing.add(username)
    }
  }
}

function handleAddDraftStudents() {
  const text = newStudentsInput.value.trim()
  if (!text)
    return
  addDraftStudents(text, activeSubgroupId.value)
  newStudentsInput.value = ''
}

function handleAddDraftPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!text.includes('\n'))
    return
  e.preventDefault()
  addDraftStudents(text, activeSubgroupId.value)
  newStudentsInput.value = ''
}

async function handlePatch() {
  const form = editFormRef.value
  if (!form)
    return

  const data = await form.validate({ transform: true })
  if (!data)
    return

  editLoading.value = true
  try {
    const result = await patch(groupId.value, data)
    if (result.error.value) {
      toastError(result.error.value)
      return
    }
    exitEditMode()
    await refresh()
  }
  finally {
    editLoading.value = false
  }
}

// ── Tabs & Table ───────────────────────────────────────────
const tabsData = computed(() => {
  const tabs: Array<{
    value: string
    label: string
    count: number
    icon: string
    title: string
    emptyTitle: string
    emptyDescription: string
    rows: Array<{ key: string, id: string | null, username: string }>
  }> = []

  const groupStudents = displayStudents.value
  const hasSubgroups = (group.value?.subgroups ?? []).length > 0

  const studentsWithoutSubgroup = groupStudents.filter(s => s.subgroupId === null)
  if (!hasSubgroups && (studentsWithoutSubgroup.length > 0 || isEditing.value)) {
    const studentsRows = studentsWithoutSubgroup.map((student, localIndex) => ({
      key: `students:${String(student.id ?? `${student.username}:${localIndex}`)}`,
      id: student.id,
      username: student.username,
    }))

    tabs.push({
      value: 'students',
      label: 'Студенты',
      count: studentsWithoutSubgroup.length,
      icon: 'i-lucide-users-round',
      title: 'Основные студенты',
      emptyTitle: 'Нет студентов',
      emptyDescription: 'В этой вкладке пока нет студентов.',
      rows: studentsRows,
    })
  }

  for (const subgroup of group.value?.subgroups ?? []) {
    const tabValue = `${subgroupTabPrefix}${String(subgroup.id)}`
    const subgroupStudents = groupStudents.filter(s => s.subgroupId === subgroup.id)
    const subgroupRows = subgroupStudents.map((student, localIndex) => ({
      key: `${tabValue}:${String(student.id ?? `${student.username}:${localIndex}`)}`,
      id: student.id,
      username: student.username,
    }))

    tabs.push({
      value: tabValue,
      label: subgroup.name,
      count: subgroupStudents.length,
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
    badge: tab.count || undefined,
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

  if (isEditing.value) {
    return sourceRows.map((row, index) => ({
      ...row,
      index: index + 1,
    }))
  }

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

function closeEditStudent() {
  editingStudent.value = null
  editUsername.value = ''
}

async function onRenameStudent() {
  if (!editingStudent.value || editPending.value)
    return
  editPending.value = true
  const { error } = await updateStudent(editingStudent.value.id, { username: editUsername.value.trim() })
  editPending.value = false
  if (error.value) {
    toastError(error.value, 'Ошибка')
    return
  }
  toast.add({ title: 'Студент переименован', color: 'success', icon: 'i-lucide-check' })
  closeEditStudent()
  await refresh()
}

async function onRemoveFromGroup() {
  if (!removingStudentId.value || removePending.value)
    return
  removePending.value = true
  const { error } = await updateStudent(removingStudentId.value, { groupId: null })
  removePending.value = false
  if (error.value) {
    toastError(error.value, 'Ошибка')
    return
  }
  toast.add({ title: 'Студент убран из группы', color: 'success', icon: 'i-lucide-check' })
  removingStudentId.value = null
  await refresh()
}

async function onDeleteStudent() {
  if (!deletingStudentId.value || deletePending.value)
    return
  deletePending.value = true
  const { error } = await deleteStudent(deletingStudentId.value)
  deletePending.value = false
  if (error.value) {
    toastError(error.value, 'Ошибка')
    return
  }
  toast.add({ title: 'Студент удалён', color: 'success', icon: 'i-lucide-check' })
  deletingStudentId.value = null
  await refresh()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="pending && !group" class="flex flex-col gap-4">
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
      <!-- Group header -->
      <div class="flex items-center gap-4">
        <UAvatar
          icon="i-lucide-users"
          size="xl"
          class="rounded-xl bg-secondary/10 text-secondary"
        />
        <div class="flex-1">
          <template v-if="!isEditing">
            <h1 class="text-xl font-semibold">
              {{ group.name }}
            </h1>
            <div class="flex items-center gap-2 text-sm text-muted">
              <span>{{ group.students.length }} студентов</span>
              <span>·</span>
              <span>{{ group.subgroups.length }} подгрупп</span>
            </div>
          </template>
          <template v-else>
            <UInput v-model="draft.groupName" placeholder="Название группы" class="w-full" />
          </template>
        </div>
        <template v-if="!isEditing">
          <UButton
            label="Редактировать"
            icon="i-lucide-pencil"
            variant="outline"
            @click="enterEditMode"
          />
        </template>
        <template v-else>
          <UButton
            color="neutral"
            variant="ghost"
            @click="exitEditMode"
          >
            Отмена
          </UButton>
          <UButton
            icon="i-lucide-check"
            :loading="editLoading"
            @click="handlePatch"
          >
            Сохранить
          </UButton>
        </template>
      </div>

      <UTabs
        v-if="groupTabs.length"
        v-model="activeTab"
        :items="groupTabs"
      />

      <!-- View mode: Table -->
      <template v-if="!isEditing">
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

        <UCard v-else>
          <UEmpty
            icon="i-lucide-users"
            title="В группе пока нет студентов и подгрупп"
            description="Добавьте студентов в группу или создайте подгруппы."
            variant="naked"
          />
        </UCard>
      </template>

      <!-- Edit mode: Inline list -->
      <template v-else>
        <UForm ref="editForm" :schema="UpdateGroupRequestSchema" :state="draft" class="flex flex-col gap-4">
          <UFormField name="students" />
          <UCard v-if="groupTabs.length && activeTabData">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold">
                    {{ activeTabData.title }}
                  </h3>
                  <UBadge color="neutral" variant="soft">
                    {{ activeTabRows.length }}
                  </UBadge>
                </div>
              </div>
            </template>

            <div class="flex flex-col gap-2">
              <div
                v-for="row in activeTabRows"
                :key="row.key"
                class="flex items-center gap-2"
              >
                <span class="w-8 text-center text-sm text-muted">{{ row.index }}</span>
                <UInput
                  :model-value="row.username"
                  class="flex-1"
                  @update:model-value="(v) => updateDraftStudentUsername(row.id, v)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  @click="removeDraftStudent(row.id)"
                />
              </div>

              <div
                v-if="activeTabRows.length === 0"
                class="py-4 text-sm text-muted"
              >
                {{ activeTabData.emptyDescription }}
              </div>

              <UInput
                v-model="newStudentsInput"
                placeholder="Добавьте студентов (Enter или вставьте список)"
                icon="i-lucide-user-plus"
                class="mt-2"
                @keydown.enter.prevent="handleAddDraftStudents"
                @paste="handleAddDraftPaste"
              />
            </div>
          </UCard>

          <UCard v-else>
            <UEmpty
              icon="i-lucide-users"
              title="В группе пока нет студентов и подгрупп"
              description="Добавьте студентов в группу или создайте подгруппы."
              variant="naked"
            />
          </UCard>
        </UForm>
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

    <!-- Rename student modal -->
    <UModal
      :open="!!editingStudent"
      title="Переименовать студента"
      @update:open="(v) => { if (!v) closeEditStudent() }"
    >
      <template #body="{ close }">
        <div class="flex flex-col gap-4">
          <UFormField label="Имя" required>
            <UInput
              v-model="editUsername"
              placeholder="Введите имя"
              :disabled="editPending"
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
        <div class="flex flex-col gap-4">
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
        <div class="flex flex-col gap-4">
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
