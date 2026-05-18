<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import type { FetchError } from 'ofetch'
import * as v from 'valibot'

import { useApiError } from '~/composables/useApiError'
import { arrayMinLength, nonNegativeInteger, string } from '~/utils/validation'

type CreateGroupRequest = components['schemas']['CreateGroupRequest']
type Student = components['schemas']['StudentGroupMemberRequest']
type SubgroupId = Student['subgroupIndex']

const CreateGroupRequestSchema: SchemaFor<CreateGroupRequest> = v.object({
  name: string('Введите название группы'),
  students: arrayMinLength(
    v.object({
      username: string('Введите username студента'),
      subgroupIndex: v.optional(v.pipe(nonNegativeInteger(), v.minValue(1))),
    }),
    1,
    'Добавьте хотя бы одного студента',
  ),
})
type Schema = v.InferOutput<typeof CreateGroupRequestSchema>

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

const state = reactive<Schema>({ name: '', students: [] })
const loading = ref(false)
const formRef = useTemplateRef<Form<typeof CreateGroupRequestSchema>>('form')

const { subgroups, cards, cardLabel, addCard, removeCard, resetCards } = useSubgroupCards()
const { addStudents, handlePaste: handleStudentPaste } = useStudentInput<Student>({ separator: /\n+/ })

function getStudents(index: SubgroupId) {
  return state.students.filter(s => s.subgroupIndex === index)
}

function doAddStudents(subgroupId: SubgroupId, raw: string) {
  addStudents(raw, subgroupId, state.students, (username, sid) =>
    ({ username, subgroupIndex: sid as SubgroupId }) as Student)
}

function removeStudent(username: string, subgroupId: SubgroupId) {
  const idx = state.students.findIndex(
    s => s.username === username && s.subgroupIndex === subgroupId,
  )
  if (idx !== -1)
    state.students.splice(idx, 1)
}

function handleEnter(card: { subgroupIndex: SubgroupId, input: string }) {
  const text = card.input.trim()
  if (!text || text.includes('\n'))
    return
  doAddStudents(card.subgroupIndex, text)
  card.input = ''
}

function handlePaste(card: { subgroupIndex: SubgroupId, input: string }, e: ClipboardEvent) {
  const handled = handleStudentPaste(e, card.subgroupIndex, state.students, (username, sid) =>
    ({ username, subgroupIndex: sid as SubgroupId }) as Student)
  if (handled)
    card.input = ''
}

function handleAddCard() {
  const hadUndefined = subgroups.value.includes(undefined)
  addCard()
  if (hadUndefined) {
    for (const s of state.students) {
      if (s.subgroupIndex === undefined)
        s.subgroupIndex = 1
    }
  }
}

function removeCardAndMigrate(subgroupIndex: SubgroupId) {
  if (subgroupIndex == null)
    return
  for (const s of state.students) {
    if (s.subgroupIndex === subgroupIndex)
      s.subgroupIndex = undefined
  }
  removeCard(subgroupIndex)
  if (subgroups.value.length === 1) {
    for (const s of state.students) {
      if (s.subgroupIndex !== undefined)
        s.subgroupIndex = undefined
    }
  }
}

function resetForm() {
  state.name = ''
  state.students = []
  resetCards()
}

async function handleCreate() {
  const data = await formRef.value?.validate({ transform: true })
  if (!data)
    return
  loading.value = true
  try {
    const result = await $backend('/api/groups', { method: 'POST', body: data })
    toast.add({ title: 'Группа создана', color: 'success', icon: 'i-lucide-check' })
    await navigateTo(`/dashboard/groups/${result.id}`)
    resetForm()
  }
  catch (e) {
    toastError(e as FetchError)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <UPageHeader title="Создать группу">
      <template #links>
        <UButton
          to="/dashboard/groups"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
      </template>
    </UPageHeader>

    <UForm
      ref="form"
      :schema="CreateGroupRequestSchema"
      :state="state"
      class="flex flex-1 flex-col gap-4 overflow-hidden"
    >
      <UFormField label="Название группы" name="groupName" required>
        <UInput
          v-model="state.name"
          placeholder="Например: ИВТ-21"
          class="w-full sm:w-96"
        />
      </UFormField>

      <UFormField name="students" />

      <div class="flex flex-1 gap-3 overflow-x-auto pb-1">
        <div
          v-for="card in cards"
          :key="card.id"
          class="flex h-full w-64 shrink-0 flex-col"
        >
          <UCard
            :ui="{
              root: 'h-full flex flex-col',
              body: 'flex-1 flex flex-col gap-1 overflow-y-auto',
              header: 'flex items-center justify-between',
            }"
          >
            <template #header>
              <span class="font-medium truncate">{{ cardLabel(card.subgroupIndex) }}</span>
              <div class="flex items-center gap-1 shrink-0">
                <UBadge :label="String(getStudents(card.subgroupIndex).length)" variant="subtle" />
                <UButton
                  v-if="cards.length > 1 && card.subgroupIndex !== null"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  :aria-label="`Удалить ${cardLabel(card.subgroupIndex)}`"
                  @click="removeCardAndMigrate(card.subgroupIndex)"
                />
              </div>
            </template>

            <TransitionGroup
              v-if="getStudents(card.subgroupIndex).length"
              name="student"
              tag="div"
              class="flex flex-col gap-1"
            >
              <div
                v-for="student in getStudents(card.subgroupIndex)"
                :key="student.username"
                class="group flex items-center gap-1 rounded-md bg-(--ui-bg-elevated) px-2 py-1"
              >
                <span class="flex-1 truncate text-sm">{{ student.username }}</span>
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  :aria-label="`Удалить ${student.username}`"
                  @click="removeStudent(student.username, student.subgroupIndex)"
                />
              </div>
            </TransitionGroup>

            <UEmpty
              v-else
              variant="naked"
              icon="i-lucide-users"
              description="Добавьте студентов ниже"
              class="flex-1"
            />

            <template #footer>
              <UInput
                v-model="card.input"
                placeholder="Имя / вставьте список"
                icon="i-lucide-user-plus"
                @keydown.enter.prevent="handleEnter(card)"
                @paste="handlePaste(card, $event)"
              />
            </template>
          </UCard>
        </div>

        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          class="shrink-0 self-stretch"
          @click="handleAddCard"
        >
          Добавить подгруппу
        </UButton>
      </div>

      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" type="button" @click="resetForm">
          Очистить
        </UButton>
        <UButton type="button" icon="i-lucide-check" :loading="loading" @click="handleCreate">
          Создать группу
        </UButton>
      </div>
    </UForm>
  </div>
</template>
