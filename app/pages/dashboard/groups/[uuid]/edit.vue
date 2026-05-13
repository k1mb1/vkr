<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import * as v from 'valibot'

import { useApiError } from '~/composables/useApiError'
import { arrayMinLength, string, uuidV4 } from '~/utils/validation'

type GroupResponse = components['schemas']['GroupResponse']
type UpdateGroupRequest = components['schemas']['UpdateGroupRequest']

const UpdateGroupRequestSchema: SchemaFor<UpdateGroupRequest> = v.object({
  groupName: string('Введите название группы'),

  students: arrayMinLength(
    v.object({
      id: v.optional(uuidV4('Некорректный UUID студента')),
      username: string('Введите username студента'),
      subgroupId: v.optional(uuidV4('Некорректный UUID подгруппы')),
    }),
    1,
    'Добавьте хотя бы одного студента',
  ),
})
type Schema = v.InferOutput<typeof UpdateGroupRequestSchema>

const route = useRoute()
const groupId = computed(() => String(route.params.uuid ?? ''))

const { toastError } = useApiError()
const toast = useToast()

// ── Load group ─────────────────────────────────────────────
const { data, pending, error, refresh } = useBackend('/api/groups/{id}', {
  method: 'GET',
  path: { id: groupId },
})

const group = computed<GroupResponse | null>(() => data.value ?? null)

// ── Form state ─────────────────────────────────────────────
const state = reactive<Schema>({
  groupName: '',
  students: [],
})

const loading = ref(false)
const formRef = useTemplateRef<Form<typeof UpdateGroupRequestSchema>>('form')

// ── Init from group data ───────────────────────────────────
watch(
  group,
  (g) => {
    if (!g)
      return
    state.groupName = g.name ?? ''
    state.students = (g.students ?? []).map(s => ({
      id: s.id,
      username: s.username ?? '',
      subgroupId: s.subgroupId ?? undefined,
    }))
  },
  { immediate: true },
)

// ── Subgroup options ───────────────────────────────────────
const subgroupOptions = computed(() => {
  return (group.value?.subgroups ?? []).map((sg, idx) => ({
    value: sg.id!,
    label: `Подгруппа ${idx + 1}`,
  }))
})

const hasSubgroups = computed(() => subgroupOptions.value.length > 0)

// ── Student management ─────────────────────────────────────
function updateStudentUsername(studentId: string | null, username: string) {
  const student = state.students.find(s => s.id === studentId)
  if (student)
    student.username = username.trim()
}

function updateStudentSubgroup(index: number, subgroupId: string | null) {
  const student = state.students[index]
  if (student)
    student.subgroupId = subgroupId ?? undefined
}

function removeStudent(studentId: string | null) {
  const idx = state.students.findIndex(s => s.id === studentId)
  if (idx !== -1)
    state.students.splice(idx, 1)
}

// ── Add new students ───────────────────────────────────────
const newStudentsInput = ref('')

const { addStudents: addStudentsRaw, handlePaste: handlePasteRaw } = useStudentInput<Schema['students'][number]>({ separator: /\n+/ })

function addStudents(raw: string, subgroupId: string | undefined) {
  addStudentsRaw(raw, subgroupId, state.students, (username, sid) => ({
    id: undefined,
    username,
    subgroupId: sid as string | undefined,
  }))
}

// ── Tabs ───────────────────────────────────────────────────
const subgroupTabPrefix = 'subgroup:'
const activeTab = ref('students')
const studentSearch = ref('')

const activeSubgroupId = computed<string | undefined>(() => {
  if (activeTab.value === 'students')
    return undefined
  return activeTab.value.replace(subgroupTabPrefix, '')
})

function handleAddStudents() {
  const text = newStudentsInput.value.trim()
  if (!text)
    return
  addStudents(text, activeSubgroupId.value)
  newStudentsInput.value = ''
}

function handlePaste(e: ClipboardEvent) {
  const handled = handlePasteRaw(e, activeSubgroupId.value, state.students, (username, sid) => ({
    id: undefined,
    username,
    subgroupId: sid as string | undefined,
  }))
  if (handled)
    newStudentsInput.value = ''
}

const {
  tabsData,
  groupTabs,
  availableTabValues,
} = useGroupTabs<Schema['students'][number]>({
  students: toRef(() => state.students),
  subgroups: computed(() => (group.value?.subgroups ?? []).map(sg => ({ id: sg.id!, index: sg.index }))),
  getId: s => s.id ?? null,
  getUsername: s => s.username,
  getSubgroupId: s => s.subgroupId ?? null,
  showEmptyStudentsTab: false,
  subgroupTabPrefix,
})

const activeTabData = useActiveTab(tabsData, activeTab)

watch(
  availableTabValues,
  (values) => {
    if (!values.length) {
      activeTab.value = 'students'
      return
    }
    if (!activeTab.value || !values.includes(activeTab.value)) {
      const firstValue = values[0]
      if (firstValue)
        activeTab.value = firstValue
    }
  },
  { immediate: true },
)

const activeTabRows = computed(() => {
  const rows = activeTabData.value?.rows ?? []
  return rows.map((row, index) => ({ ...row, index: index + 1 }))
})

const filteredTabRows = computed(() => {
  let rows = activeTabRows.value
  const q = studentSearch.value.trim().toLowerCase()
  if (q)
    rows = rows.filter(r => r.username.toLowerCase().includes(q))
  return rows
})

// ── Submit ─────────────────────────────────────────────────
async function handleSave() {
  const data = await formRef.value?.validate({ transform: true })
  if (!data)
    return

  loading.value = true
  try {
    const result = await useBackend('/api/groups/{id}', {
      method: 'patch',
      path: { id: groupId.value },
      body: data,
    })
    if (result.error.value) {
      toastError(result.error.value)
      return
    }
    toast.add({
      title: 'Группа обновлена',
      color: 'success',
      icon: 'i-lucide-check',
    })
    await refresh()
    await navigateTo(`/dashboard/groups/${groupId.value}`)
  }
  finally {
    loading.value = false
  }
}

function handleCancel() {
  navigateTo(`/dashboard/groups/${groupId.value}`)
}
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
        :to="`/dashboard/groups/${groupId}`"
        class="text-muted hover:text-default flex items-center gap-1 -mb-2"
      >
        <UIcon name="i-lucide-arrow-left" />
        К группе
      </ULink>

      <div class="flex items-center gap-4">
        <UAvatar
          icon="i-lucide-users"
          size="xl"
          class="rounded-xl bg-secondary/10 text-secondary"
        />
        <div class="flex-1">
          <UInput
            v-model="state.groupName"
            placeholder="Название группы"
            class="w-full sm:w-96"
          />
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          @click="handleCancel"
        >
          Отмена
        </UButton>
        <UButton
          icon="i-lucide-check"
          :loading="loading"
          :disabled="!state.groupName.trim()"
          @click="handleSave"
        >
          Сохранить
        </UButton>
      </div>

      <UForm
        ref="form"
        :schema="UpdateGroupRequestSchema"
        :state="state"
        class="flex flex-col gap-4"
      >
        <UTabs v-if="groupTabs.length" v-model="activeTab" :items="groupTabs" />

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

          <div class="flex flex-col gap-2">
            <div
              v-for="row in filteredTabRows"
              :key="row.key"
              class="flex items-center gap-2"
              :class="row.id === undefined ? 'rounded-lg bg-success/5 px-2 py-1 -mx-2' : ''"
            >
              <span class="w-8 text-center text-muted">{{ row.index }}</span>
              <UInput
                :model-value="row.username"
                class="flex-1"
                @update:model-value="(v: string) => updateStudentUsername(row.id, v)"
              />
              <USelect
                v-if="hasSubgroups"
                :model-value="row.subgroupId ?? ''"
                :items="subgroupOptions"
                class="w-44"
                @update:model-value="(v: string) => updateStudentSubgroup(row.draftIndex, v)"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                @click="removeStudent(row.id)"
              />
            </div>

            <div v-if="filteredTabRows.length === 0" class="py-4 text-muted">
              {{ activeTabData.emptyDescription }}
            </div>

            <UInput
              v-model="newStudentsInput"
              placeholder="Добавьте студентов (Enter или вставьте список)"
              icon="i-lucide-user-plus"
              class="mt-2"
              @keydown.enter.prevent="handleAddStudents"
              @paste="handlePaste"
            />
          </div>
        </UCard>

        <UCard v-else>
          <UEmpty
            icon="i-lucide-users"
            title="В группе пока нет студентов и подгрупп"
            description="Добавьте студентов в группу."
            variant="naked"
          />
        </UCard>
      </UForm>
    </template>

    <UEmpty
      v-else
      icon="i-lucide-search-x"
      title="Группа не найдена"
      description="Проверьте ссылку или вернитесь к списку групп."
      variant="naked"
      class="h-full"
    />
  </div>
</template>
