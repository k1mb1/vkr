<script setup lang="ts">
import type { TabStudentRow } from '~/composables/useGroupTabs'
import { UpdateGroupRequestSchema, useGroupDetail } from '~/composables/useGroupDetail'

const route = useRoute()
const groupId = computed(() => String(route.params.uuid ?? ''))
const activeGroupName = useState<string | null>(
  'groups-active-name',
  () => null,
)

const {
  group,
  pending,
  error,

  isEditing,
  editLoading,
  showDiscardModal,

  draft,
  editFormRef: _editFormRef,

  enterEditMode,
  exitEditMode,
  confirmDiscardChanges,
  cancelDiscardChanges,

  displayStudents,

  updateDraftStudentUsername,
  updateDraftStudentSubgroup,
  removeDraftStudent,

  handleAddDraftStudents,
  handleAddDraftPaste,

  handlePatch,

  deletingGroup,
  deleteGroupPending,
  onDeleteGroup,
} = useGroupDetail(groupId)

const subgroupTabPrefix = 'subgroup:'

const activeTab = ref('students')
const sortDirection = ref<'asc' | 'desc'>('asc')
const studentSearch = ref('')
const newStudentsInput = ref('')

function toggleNameSort(): void {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

const usernameCollator = new Intl.Collator('ru-RU', {
  sensitivity: 'base',
  numeric: true,
})

const activeSubgroupId = computed<string | undefined>(() => {
  if (activeTab.value === 'students')
    return undefined
  return activeTab.value.replace(subgroupTabPrefix, '')
})

function onEnterEditMode() {
  enterEditMode()
  studentSearch.value = ''
}

function onExitEditMode() {
  exitEditMode()
  newStudentsInput.value = ''
}

function onConfirmDiscardChanges() {
  confirmDiscardChanges()
  newStudentsInput.value = ''
}

function onAddDraftStudents() {
  handleAddDraftStudents(newStudentsInput, activeSubgroupId)
}

function onAddDraftPaste(e: ClipboardEvent) {
  handleAddDraftPaste(e, newStudentsInput, activeSubgroupId)
}

// ── Tabs & Table ───────────────────────────────────────────
const {
  tabsData,
  groupTabs,
  availableTabValues,
} = useGroupTabs({
  students: displayStudents,
  subgroups: computed(() => (group.value?.subgroups ?? [])),
  isEditing,
  subgroupTabPrefix,
})

const activeTabData = useActiveTab(tabsData, activeTab)

const activeTabRows = computed<TabStudentRow[]>(() => {
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

const filteredTabRows = computed<TabStudentRow[]>(() => {
  let rows = activeTabRows.value
  const q = studentSearch.value.trim().toLowerCase()
  if (q) {
    rows = rows.filter(r => r.username.toLowerCase().includes(q))
  }
  return rows
})

const subgroupOptions = computed(() => {
  return (group.value?.subgroups ?? []).map((sg, idx) => ({
    value: sg.id!,
    label: `Подгруппа ${idx + 1}`,
  }))
})

watch(
  groupId,
  () => {
    activeGroupName.value = null
    studentSearch.value = ''
  },
  { immediate: true },
)

watch(
  group,
  (value) => {
    activeGroupName.value = value?.name ?? null
  },
  { immediate: true },
)

watch(
  availableTabValues,
  (values) => {
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
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="pending && !group">
      <USkeleton class="h-8 w-1/3" />
      <USkeleton class="h-12 w-full" />
      <UCard>
        <template #header>
          <USkeleton class="h-6 w-32" />
        </template>
        <div class="flex flex-col gap-2">
          <USkeleton v-for="i in 5" :key="i" class="h-10 w-full" />
        </div>
      </UCard>
    </template>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Ошибка при загрузке группы"
      :description="error.message"
    />

    <template v-else-if="group">
      <ULink
        to="/dashboard/groups"
        class="text-sm text-muted hover:text-default flex items-center gap-1 -mb-2"
      >
        <UIcon name="i-lucide-arrow-left" />
        К списку групп
      </ULink>

      <GroupsDetailHeader
        v-model="draft.groupName"
        :name="group.name ?? ''"
        :students-count="(group.students ?? []).length"
        :subgroups-count="(group.subgroups ?? []).length"
        :is-editing="isEditing"
        :edit-loading="editLoading"
        @edit="onEnterEditMode"
        @cancel="onExitEditMode"
        @save="handlePatch"
        @delete="deletingGroup = true"
      />

      <UTabs v-if="groupTabs.length" v-model="activeTab" :items="groupTabs" />

      <!-- View mode: Table -->
      <template v-if="!isEditing">
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
              <UButton
                icon="i-lucide-user-plus"
                label="Добавить"
                variant="ghost"
                @click="onEnterEditMode"
              />
            </div>
          </template>

          <div class="mb-4">
            <UInput
              v-model="studentSearch"
              icon="i-lucide-search"
              placeholder="Поиск по имени..."
              class="w-full sm:w-72"
            />
          </div>

          <GroupsStudentsTable
            :rows="filteredTabRows"
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
            :actions="[
              {
                label: 'Добавить студентов',
                icon: 'i-lucide-user-plus',
                onClick: onEnterEditMode,
              },
            ]"
          />
        </UCard>
      </template>

      <!-- Edit mode: Inline list -->
      <template v-else>
        <!-- eslint-disable vue/no-unused-refs -->
        <UForm
          ref="editForm"
          :schema="UpdateGroupRequestSchema"
          :state="draft"
          class="flex flex-col gap-4"
        >
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

            <div class="mb-4">
              <UInput
                v-model="studentSearch"
                icon="i-lucide-search"
                placeholder="Поиск по имени..."
                class="w-full sm:w-72"
              />
            </div>

            <GroupsStudentsEditor
              v-model:new-students-input="newStudentsInput"
              :rows="filteredTabRows"
              :empty-description="activeTabData.emptyDescription"
              :subgroups="subgroupOptions"
              @update-username="updateDraftStudentUsername"
              @update-subgroup="updateDraftStudentSubgroup"
              @remove="removeDraftStudent"
              @add="onAddDraftStudents"
              @paste="onAddDraftPaste"
            />
          </UCard>

          <UCard v-else>
            <UEmpty
              icon="i-lucide-users"
              title="В группе пока нет студентов и подгрупп"
              description="Добавьте студентов в группу или создайте подгруппы."
              variant="naked"
              :actions="[
                {
                  label: 'Добавить студентов',
                  icon: 'i-lucide-user-plus',
                  onClick: onEnterEditMode,
                },
              ]"
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
      @confirm="onDeleteGroup(groupId)"
    />

    <GroupsDiscardChangesModal
      v-model:open="showDiscardModal"
      @confirm="onConfirmDiscardChanges"
      @cancel="cancelDiscardChanges"
    />
  </div>
</template>
