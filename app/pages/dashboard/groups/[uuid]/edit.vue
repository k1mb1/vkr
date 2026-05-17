<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import type { FetchError } from 'ofetch'
import * as v from 'valibot'

import { useApiError } from '~/composables/useApiError'
import { arrayMinLength, string, uuidV4 } from '~/utils/validation'

type GroupResponse = components['schemas']['GroupResponse']
type UpdateGroupRequest = components['schemas']['UpdateGroupRequest']

interface FormSchema {
  name: string
  students: {
    id?: string
    username: string
    subgroupId?: string
  }[]
}

const UpdateGroupRequestSchema: SchemaFor<FormSchema> = v.object({
  name: string('Введите название группы'),

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

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

const { data, pending, error, refresh } = useBackend('/api/groups/{id}', {
  method: 'GET',
  path: { id: groupId },
})

const group = computed<GroupResponse | null>(() => data.value ?? null)

const state = reactive<Schema>({
  name: '',
  students: [],
})

const originalName = ref('')
const originalStudents = ref<FormSchema['students']>([])

const loading = ref(false)
const formRef = useTemplateRef<Form<typeof UpdateGroupRequestSchema>>('form')

watch(
  group,
  (g) => {
    if (!g)
      return
    state.name = g.name ?? ''
    state.students = (g.students ?? []).map(s => ({
      id: s.id,
      username: s.username ?? '',
      subgroupId: s.subgroupId ?? undefined,
    }))
    originalName.value = state.name
    originalStudents.value = state.students.map(s => ({ ...s }))
  },
  { immediate: true },
)

function isStudentsChanged(a: FormSchema['students'], b: FormSchema['students']): boolean {
  if (a.length !== b.length)
    return true
  for (let i = 0; i < a.length; i++) {
    const sa = a[i]!
    const sb = b[i]!
    if (sa.username !== sb.username || sa.subgroupId !== sb.subgroupId || sa.id !== sb.id)
      return true
  }
  return false
}

const subgroupOptions = computed(() => {
  return (group.value?.subgroups ?? []).map((sg, idx) => ({
    value: sg.id!,
    label: `Подгруппа ${sg.index ?? (idx + 1)}`,
  }))
})

const hasSubgroups = computed(() => subgroupOptions.value.length > 0)

// Student management
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

function removeStudent(draftIndex: number) {
  state.students.splice(draftIndex, 1)
}

// new students
const newStudentsInput = ref('')

const { addStudents: addStudentsRaw, handlePaste: handlePasteRaw } = useStudentInput<Schema['students'][number]>({ separator: /\n+/ })

function addStudents(raw: string, subgroupId: string | undefined) {
  addStudentsRaw(raw, subgroupId, state.students, (username, sid) => ({
    id: undefined,
    username,
    subgroupId: sid as string | undefined,
  }))
}

// Tabs
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

// Submit
async function handleSave() {
  const data = await formRef.value?.validate({ transform: true })
  if (!data)
    return

  loading.value = true
  try {
    const body: UpdateGroupRequest = {}
    if (data.name !== originalName.value)
      body.name = data.name
    if (isStudentsChanged(data.students, originalStudents.value))
      body.students = data.students

    await $backend('/api/groups/{id}', {
      method: 'PATCH',
      path: { id: groupId.value },
      body,
    })
    toast.add({
      title: 'Группа обновлена',
      color: 'success',
      icon: 'i-lucide-check',
    })
    await refresh()
    await navigateTo(`/dashboard/groups/${groupId.value}`)
  }
  catch (e) {
    toastError(e as FetchError)
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
      <UPageHeader :title="state.name || 'Редактирование'">
        <template #links>
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
            :disabled="!state.name.trim()"
            @click="handleSave"
          >
            Сохранить
          </UButton>
        </template>
      </UPageHeader>

      <UForm
        ref="form"
        :schema="UpdateGroupRequestSchema"
        :state="state"
        class="flex flex-col gap-4"
      >
        <UFormField name="name">
          <UInput
            v-model="state.name"
            placeholder="Название группы"
            class="w-full sm:w-96"
          />
        </UFormField>
        <UTabs v-if="groupTabs.length" v-model="activeTab" :items="groupTabs" />

        <UCard v-if="groupTabs.length && activeTabData">
          <template #header>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold">
                {{ activeTabData.title }}
              </h3>
            </div>
          </template>

          <UInput
            v-model="studentSearch"
            icon="i-lucide-search"
            placeholder="Поиск по имени..."
            class="w-full sm:w-72 mb-4"
          />

          <div class="flex flex-col gap-2">
            <div
              v-for="row in filteredTabRows"
              :key="row.key"
              class="flex items-center gap-2"
              :class="row.id === undefined ? 'rounded-lg bg-success/5 px-2 py-1 -mx-2' : ''"
            >
              <span class="text-muted w-8 text-center">{{ row.index }}</span>
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
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                :aria-label="`Удалить ${row.username}`"
                @click="removeStudent(row.draftIndex)"
              />
            </div>

            <p v-if="filteredTabRows.length === 0" class="text-muted py-4">
              {{ activeTabData.emptyDescription }}
            </p>

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
