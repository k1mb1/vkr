<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { Form } from '#ui/types'
import * as v from 'valibot'

import { useApiError } from '~/composables/useApiError'

type CreateGroupRequest = components['schemas']['CreateGroup']

const CreateGroupRequestSchema: SchemaFor<CreateGroupRequest> = v.object({
  groupName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'Введите название группы'),
  ),

  students: v.pipe(
    v.array(
      v.object({
        username: v.pipe(
          v.string(),
          v.trim(),
          v.minLength(1, 'Введите username студента'),
        ),

        subgroupIndex: v.optional(
          v.pipe(
            v.number(),
            v.minValue(0, 'Индекс подгруппы не может быть отрицательным'),
          ),
        ),
      }),
    ),
    v.minLength(1, 'Добавьте хотя бы одного студента'),
  ),
})
type Schema = v.InferOutput<typeof CreateGroupRequestSchema>

const open = ref(false)

const { toastError } = useApiError()
const toast = useToast()

// ── State ──────────────────────────────────────────────────
const state = reactive<Schema>({
  groupName: '',
  students: [],
})

const loading = ref(false)
const formRef = useTemplateRef<Form<typeof CreateGroupRequestSchema>>('form')

// ── Subgroup Cards ─────────────────────────────────────────
interface SubgroupCard {
  id: number
  subgroupIndex: number | undefined
  input: string
}

let nextId = 1
const cards = ref<SubgroupCard[]>([
  { id: nextId++, subgroupIndex: undefined, input: '' },
])

const hasSubgroups = computed(() =>
  cards.value.some(c => c.subgroupIndex !== undefined),
)

function cardLabel(card: SubgroupCard): string {
  if (!hasSubgroups.value)
    return 'Без подгруппы'

  const pos = (card.subgroupIndex ?? 0) + 1
  return `Подгруппа ${pos}`
}

// ── Students by subgroup (computed for perf) ────────────────
const studentsBySubgroup = computed(() => {
  const map = new Map<number | undefined, Schema['students']>()
  for (const student of state.students) {
    const list = map.get(student.subgroupIndex) ?? []
    list.push(student)
    map.set(student.subgroupIndex, list)
  }
  return map
})

function getStudents(index: number | undefined) {
  return studentsBySubgroup.value.get(index) ?? []
}

// ── Add / Remove Students ──────────────────────────────────
function parseUsernames(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function addStudents(index: number | undefined, raw: string) {
  const usernames = parseUsernames(raw)
  const existing = new Set(state.students.map(s => s.username))

  for (const username of usernames) {
    if (!existing.has(username)) {
      state.students.push({ username, subgroupIndex: index })
      existing.add(username)
    }
  }
}

function handleEnter(card: SubgroupCard) {
  const text = card.input.trim()
  if (!text)
    return
  addStudents(card.subgroupIndex, text)
  card.input = ''
}

function handlePaste(card: SubgroupCard, e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!text.includes('\n'))
    return

  e.preventDefault()
  addStudents(card.subgroupIndex, text)
  card.input = ''
}

function removeStudent(username: string, subgroupIndex: number | undefined) {
  const idx = state.students.findIndex(
    s => s.username === username && s.subgroupIndex === subgroupIndex,
  )
  if (idx !== -1)
    state.students.splice(idx, 1)
}

// ── Drag & Drop ─────────────────────────────────────────────
interface DragPayload {
  username: string
  subgroupIndex: number | undefined
}

const dragging = ref<DragPayload | null>(null)
const dragOverId = ref<number | null>(null)

function onDragStart(student: Schema['students'][number]) {
  dragging.value = {
    username: student.username,
    subgroupIndex: student.subgroupIndex,
  }
}

function onDragEnd() {
  dragging.value = null
  dragOverId.value = null
}

function onDragOver(e: DragEvent, id: number) {
  e.preventDefault()
  dragOverId.value = id
}

function onDragLeave(e: DragEvent, cardId: number) {
  const related = e.relatedTarget as HTMLElement | null
  const current = e.currentTarget as HTMLElement
  if (!related || !current.contains(related)) {
    if (dragOverId.value === cardId)
      dragOverId.value = null
  }
}

function onDrop(card: SubgroupCard) {
  dragOverId.value = null
  if (!dragging.value)
    return

  const student = state.students.find(
    s =>
      s.username === dragging.value!.username
      && s.subgroupIndex === dragging.value!.subgroupIndex,
  )

  if (student && student.subgroupIndex !== card.subgroupIndex) {
    student.subgroupIndex = card.subgroupIndex
  }

  dragging.value = null
}

// ── Card Management ─────────────────────────────────────────
function addCard() {
  const nonNullCount = cards.value.filter(
    c => c.subgroupIndex !== undefined,
  ).length

  if (nonNullCount === 0) {
    // Первое добавление подгруппы — конвертируем undefined-карточку в индекс 0
    const nullCard = cards.value.find(c => c.subgroupIndex === undefined)
    if (nullCard) {
      for (const student of state.students) {
        if (student.subgroupIndex === undefined)
          student.subgroupIndex = 0
      }
      nullCard.subgroupIndex = 0
    }
    cards.value.push({ id: nextId++, subgroupIndex: 1, input: '' })
  }
  else {
    cards.value.push({ id: nextId++, subgroupIndex: nonNullCount, input: '' })
  }
}

function removeCard(card: SubgroupCard) {
  if (card.subgroupIndex === undefined)
    return

  for (const student of state.students) {
    if (student.subgroupIndex === card.subgroupIndex) {
      student.subgroupIndex = undefined
    }
  }

  const idx = cards.value.findIndex(c => c.id === card.id)
  if (idx === -1)
    return
  cards.value.splice(idx, 1)

  // Если осталась одна карточка — возвращаем её в null (нет подгрупп)
  const lastCard = cards.value.length === 1 ? cards.value[0] : undefined
  if (lastCard) {
    if (lastCard.subgroupIndex !== undefined) {
      for (const student of state.students) {
        if (student.subgroupIndex === lastCard.subgroupIndex)
          student.subgroupIndex = undefined
      }
      lastCard.subgroupIndex = undefined
    }
    return
  }

  let newIndex = 0
  for (const c of cards.value) {
    if (c.subgroupIndex !== undefined) {
      const oldIndex = c.subgroupIndex
      if (oldIndex !== newIndex) {
        for (const student of state.students) {
          if (student.subgroupIndex === oldIndex) {
            student.subgroupIndex = newIndex
          }
        }
        c.subgroupIndex = newIndex
      }
      newIndex++
    }
  }
}

function resetForm() {
  state.groupName = ''
  state.students = []
  cards.value = [{ id: nextId++, subgroupIndex: undefined, input: '' }]
}

// ── Submit ────────────────────────────────────────────────
async function handleCreate() {
  const form = formRef.value
  if (!form)
    return

  const data = await form.validate({ transform: true })
  if (!data)
    return

  loading.value = true
  try {
    const result = await useBackend('/api/groups', { method: 'POST', body: data })
    if (result.error.value) {
      toastError(result.error.value)
      return
    }
    if (result.data.value) {
      toast.add({
        title: 'Группа создана',
        color: 'success',
        icon: 'i-lucide-check',
      })
      open.value = false
      await navigateTo(`/dashboard/groups/${result.data.value.id}`)
    }
    resetForm()
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    fullscreen
    title="Создать группу"
    :ui="{ body: 'flex-1 p-4 overflow-hidden' }"
  >
    <UButton label="Создать группу" icon="i-lucide-users" />

    <template #body>
      <UForm
        ref="form"
        :schema="CreateGroupRequestSchema"
        :state="state"
        class="flex h-full flex-col gap-4"
      >
        <UFormField label="Название группы" name="groupName" required>
          <UInput
            v-model="state.groupName"
            placeholder="Например: ИВТ-21"
            class="w-full"
          />
        </UFormField>

        <UFormField name="students" />

        <div class="flex flex-1 gap-3 overflow-x-auto pb-1">
          <div
            v-for="card in cards"
            :key="card.id"
            class="flex h-full w-64 shrink-0 flex-col"
            @dragover.prevent="onDragOver($event, card.id)"
            @dragleave="onDragLeave($event, card.id)"
            @drop.prevent="onDrop(card)"
          >
            <UCard
              :ui="{
                root: [
                  'h-full flex flex-col transition-colors duration-200',
                  dragOverId === card.id ? 'ring-2 ring-(--ui-primary)' : '',
                ],
                body: 'flex-1 flex flex-col gap-1 overflow-y-auto',
                header: 'flex items-center justify-between',
              }"
            >
              <template #header>
                <span class="font-medium truncate">{{ cardLabel(card) }}</span>
                <div class="flex items-center gap-1 shrink-0">
                  <UBadge
                    :label="String(getStudents(card.subgroupIndex).length)"
                    variant="subtle"
                  />
                  <UButton
                    v-if="cards.length > 1 && card.subgroupIndex !== undefined"
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    :aria-label="`Удалить ${cardLabel(card)}`"
                    @click="removeCard(card)"
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
                  draggable="true"
                  class="group flex cursor-grab items-center gap-1 rounded-md bg-(--ui-bg-elevated) px-2 py-1 select-none active:cursor-grabbing"
                  :class="[
                    dragging?.username === student.username
                      && dragging?.subgroupIndex === student.subgroupIndex
                      ? 'opacity-40'
                      : '',
                  ]"
                  @dragstart="onDragStart(student)"
                  @dragend="onDragEnd"
                >
                  <UIcon
                    name="i-lucide-grip-vertical"
                    class="shrink-0 text-(--ui-text-muted)"
                  />
                  <span class="flex-1 truncate text-sm">{{
                    student.username
                  }}</span>
                  <UButton
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    :aria-label="`Удалить ${student.username}`"
                    @click="
                      removeStudent(student.username, student.subgroupIndex)
                    "
                  />
                </div>
              </TransitionGroup>

              <UEmpty
                v-else
                variant="naked"
                icon="i-lucide-users"
                description="Перетащите сюда или добавьте студентов"
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
            @click="addCard"
          >
            Добавить подгруппу
          </UButton>
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            type="button"
            @click="resetForm"
          >
            Очистить
          </UButton>
          <UButton
            type="button"
            icon="i-lucide-check"
            :loading="loading"
            @click="handleCreate"
          >
            Создать группу
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
