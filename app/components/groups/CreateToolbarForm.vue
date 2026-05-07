<!-- components/CreateGroupModal.vue -->
<script setup lang="ts">
import type { CreateGroupRequest } from '#shared/types/backend/student-groups'
import type { Form } from '#ui/types'
import { CreateGroupRequestSchema } from '#shared/types/backend/student-groups'
import { create } from '~/composables/api/useStudentsGroups'
import { useApiError } from '~/composables/useApiError'

const { toastError } = useApiError()

const schema = CreateGroupRequestSchema

// ── Internal card model ─────────────────────────────────────
interface SubgroupCard {
  uid: number
  subgroupIndex: number | null
  input: string
}

let uidSeq = 0
function mkCard(subgroupIndex: number | null): SubgroupCard {
  return { uid: uidSeq++, subgroupIndex, input: '' }
}

function cardLabel(card: SubgroupCard): string {
  const hasSubgroups = cards.value.some(c => c.subgroupIndex !== null)
  if (!hasSubgroups)
    return 'Без подгруппы'
  const pos = card.subgroupIndex === null ? 1 : card.subgroupIndex + 2
  const name = state.groupName.trim()
  return name ? `${name}/${pos}` : `Подгруппа ${pos}`
}

const cards = ref<SubgroupCard[]>([mkCard(null)])

// ── Reactive form state ─────────────────────────────────────
const state = reactive<CreateGroupRequest>({ groupName: '', students: [] })

function studentsOf(subgroupIndex: number | null) {
  return state.students.filter(s => s.subgroupIndex === subgroupIndex)
}

// ── Adding students ─────────────────────────────────────────
function pushStudents(subgroupIndex: number | null, raw: string) {
  raw
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .forEach((username) => {
      if (!state.students.some(s => s.username === username))
        state.students.push({ username, subgroupIndex })
    })
}

function handleEnter(card: SubgroupCard) {
  if (!card.input.trim())
    return
  pushStudents(card.subgroupIndex, card.input)
  card.input = ''
}

function handlePaste(card: SubgroupCard, e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!text.includes('\n'))
    return
  e.preventDefault()
  pushStudents(card.subgroupIndex, text)
  card.input = ''
}

function removeStudent(username: string, subgroupIndex: number | null) {
  const i = state.students.findIndex(
    s => s.username === username && s.subgroupIndex === subgroupIndex,
  )
  if (i !== -1)
    state.students.splice(i, 1)
}

// ── Drag & Drop ─────────────────────────────────────────────
const dragging = ref<{ username: string, subgroupIndex: number | null } | null>(null)
const dragOverUid = ref<number | null>(null)

function onDragStart(s: { username: string, subgroupIndex: number | null }) {
  dragging.value = { ...s }
}
function onDragEnd() {
  dragging.value = null
  dragOverUid.value = null
}
function onDragOver(e: DragEvent, uid: number) {
  e.preventDefault()
  dragOverUid.value = uid
}
function onDrop(card: SubgroupCard) {
  if (!dragging.value)
    return
  const student = state.students.find(
    s => s.username === dragging.value!.username && s.subgroupIndex === dragging.value!.subgroupIndex,
  )
  if (student)
    student.subgroupIndex = card.subgroupIndex
  dragging.value = null
  dragOverUid.value = null
}

// ── Manage cards ────────────────────────────────────────────
function addCard() {
  const nextIdx = cards.value.filter(c => c.subgroupIndex !== null).length
  cards.value.push(mkCard(nextIdx))
}

function removeCard(card: SubgroupCard) {
  state.students.forEach((s) => {
    if (s.subgroupIndex === card.subgroupIndex)
      s.subgroupIndex = null
  })
  cards.value = cards.value.filter(c => c.uid !== card.uid)
  let i = 0
  cards.value.forEach((c) => {
    if (c.subgroupIndex !== null) {
      const old = c.subgroupIndex
      state.students.forEach((s) => {
        if (s.subgroupIndex === old)
          s.subgroupIndex = i
      })
      c.subgroupIndex = i
      i++
    }
  })
}

const loading = ref(false)
const form = useTemplateRef<Form<typeof schema>>('form')

async function handleCreate() {
  const data = await form.value!.validate({ transform: true })
  if (!data)
    return
  loading.value = true
  const result = await create(data)
  loading.value = false
  if (result.error.value) {
    toastError(result.error.value)
    return
  }
  state.groupName = ''
  state.students = []
}
</script>

<template>
  <UModal fullscreen title="Создать группу" :ui="{ body: 'flex-1 p-4 overflow-hidden' }">
    <UButton label="Создать группу" icon="i-lucide-users" />

    <template #body>
      <UForm ref="form" :schema="schema" :state="state" class="flex h-full flex-col gap-4">
        <UFormField label="Название группы" name="groupName" required>
          <UInput v-model="state.groupName" placeholder="Например: ИВТ-21" class="w-full" />
        </UFormField>

        <UFormField name="students" />

        <div class="flex flex-1 gap-3 overflow-x-auto pb-1">
          <div
            v-for="card in cards"
            :key="card.uid"
            class="flex h-full w-64 shrink-0 flex-col"
            @dragover="onDragOver($event, card.uid)"
            @dragleave="dragOverUid = null"
            @drop.prevent="onDrop(card)"
          >
            <UCard
              :ui="{
                root: ['h-full flex flex-col transition-colors', dragOverUid === card.uid ? 'ring-2 ring-(--ui-primary)' : ''],
                body: 'flex-1 flex flex-col gap-1 overflow-y-auto',
                header: 'flex items-center justify-between',
              }"
            >
              <template #header>
                <span class="font-medium truncate">{{ cardLabel(card) }}</span>
                <div class="flex items-center gap-1 shrink-0">
                  <UBadge :label="String(studentsOf(card.subgroupIndex).length)" variant="subtle" />
                  <UButton
                    v-if="cards.length > 1"
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    @click="removeCard(card)"
                  />
                </div>
              </template>

              <TransitionGroup name="student">
                <div
                  v-for="student in studentsOf(card.subgroupIndex)"
                  :key="student.username"
                  draggable="true"
                  class="group flex cursor-grab items-center gap-1 rounded-md bg-(--ui-bg-elevated) select-none active:cursor-grabbing"
                  :class="dragging?.username === student.username && dragging?.subgroupIndex === student.subgroupIndex ? 'opacity-40' : ''"
                  @dragstart="onDragStart(student)"
                  @dragend="onDragEnd"
                >
                  <UIcon name="i-lucide-grip-vertical" class="shrink-0 text-(--ui-text-muted)" />
                  <span class="flex-1 truncate">{{ student.username }}</span>
                  <UButton
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    class="shrink-0 opacity-0 group-hover:opacity-100"
                    @click="removeStudent(student.username, student.subgroupIndex)"
                  />
                </div>
              </TransitionGroup>

              <UEmpty
              variant="naked"
                v-if="studentsOf(card.subgroupIndex).length === 0"
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
          <UButton color="neutral" variant="ghost" type="button" @click="state.groupName = ''; state.students = []">
            Очистить
          </UButton>
          <UButton type="button" icon="i-lucide-check" :loading="loading" @click="handleCreate">
            Создать группу
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>