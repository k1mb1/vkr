<script setup lang="ts">
import type { GroupResponse } from '#shared/types/backend'
import type { Form } from '#ui/types'
import type { TabsItem } from '@nuxt/ui'
import type * as v from 'valibot'
import type { StudentTableRow } from '~/components/groups/types'
import { UpdateGroupRequestSchema } from '#shared/types/backend/student-groups'
import { patch, remove, useStudentGroup } from '~/composables/api/useStudentsGroups'

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
const subgroupTabPrefix = 'subgroup:'

const activeTab = ref('students')
const sortDirection = ref<'asc' | 'desc'>('asc')

function toggleNameSort(): void {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

const usernameCollator = new Intl.Collator('ru-RU', {
  sensitivity: 'base',
  numeric: true,
})

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

// Group deletion
const deletingGroup = ref(false)
const deleteGroupPending = ref(false)

async function onDeleteGroup() {
  if (deleteGroupPending.value)
    return
  deleteGroupPending.value = true
  const { error } = await remove(groupId.value)
  deleteGroupPending.value = false
  if (error.value) {
    toastError(error.value, 'Ошибка')
    return
  }
  toast.add({ title: 'Группа удалена', color: 'success', icon: 'i-lucide-check' })
  await navigateTo('/dashboard/groups')
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
      <GroupsDetailHeader
        :name="group.name"
        :students-count="group.students.length"
        :subgroups-count="group.subgroups.length"
        :is-editing="isEditing"
        :edit-loading="editLoading"
        v-model="draft.groupName"
        @edit="enterEditMode"
        @cancel="exitEditMode"
        @save="handlePatch"
        @delete="deletingGroup = true"
      />

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

          <GroupsStudentsTable
            :rows="activeTabRows"
            :loading="pending"
            :sort-direction="sortDirection"
            :empty-title="activeTabData.emptyTitle"
            :empty-description="activeTabData.emptyDescription"
            @toggle-sort="toggleNameSort"
          />
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

            <GroupsStudentsEditor
              :rows="activeTabRows"
              :empty-description="activeTabData.emptyDescription"
              v-model:new-students-input="newStudentsInput"
              @update-username="updateDraftStudentUsername"
              @remove="removeDraftStudent"
              @add="handleAddDraftStudents"
              @paste="handleAddDraftPaste"
            />
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

    <GroupsDeleteModal
      :open="deletingGroup"
      :pending="deleteGroupPending"
      @close="deletingGroup = false"
      @confirm="onDeleteGroup"
    />
  </div>
</template>
