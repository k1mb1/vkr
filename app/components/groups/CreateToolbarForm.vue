<script setup lang="ts">
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CreateGroupRequestPayload } from '#shared/types/backend'
import { CreateGroupRequestSchema } from '#shared/types/backend/student-groups/schemas'
import { create } from '~/composables/api/useStudentsGroups'
import { useApiError } from '~/composables/useApiError'

const schema = CreateGroupRequestSchema
type Schema = CreateGroupRequestPayload

const open = ref(false)
const submitting = ref(false)
const { toastError } = useApiError()

interface SubgroupState {
  students: string[]
  input: string
}

// Разделяем UI-состояние от данных формы
const groupName = ref('')
const mode = ref<'simple' | 'subgroups'>('simple')
const simpleStudents = ref<string[]>([])
const subgroups = ref<SubgroupState[]>([
  { students: [], input: '' },
  { students: [], input: '' },
])

// Вычисляемые студенты — единственный источник правды
const students = computed<CreateGroupRequestPayload['students']>(() =>
  mode.value === 'simple'
    ? simpleStudents.value.map(u => ({ username: u, subgroupIndex: null }))
    : subgroups.value.flatMap((sg, i) =>
        sg.students.map(u => ({ username: u, subgroupIndex: i })),
      ),
)

// Объект состояния для UForm — только поля схемы
const state = computed(() => ({
  groupName: groupName.value,
  students: students.value,
}))

const modeTabs = [
  { value: 'simple', label: 'Без подгрупп', icon: 'i-lucide-users' },
  { value: 'subgroups', label: 'С подгруппами', icon: 'i-lucide-layout-grid' },
]

const subgroupLabel = (index: number) => `${groupName.value}${index + 1}`

function addStudentsToSubgroup(sgIndex: number, raw: string) {
  const sg = subgroups.value[sgIndex]
  if (!sg) return
  const existing = new Set(subgroups.value.flatMap(s => s.students))
  const names = raw.split(/[\n\r\t,]+/).map(s => s.trim()).filter(Boolean)
  for (const name of names) {
    if (!existing.has(name)) sg.students.push(name)
  }
  sg.input = ''
}

function onSubgroupInputEnter(sgIndex: number) {
  const sg = subgroups.value[sgIndex]
  if (!sg?.input.trim()) return
  addStudentsToSubgroup(sgIndex, sg.input)
}

function onSubgroupInputPaste(sgIndex: number, e: ClipboardEvent) {
  e.preventDefault()
  addStudentsToSubgroup(sgIndex, e.clipboardData?.getData('text') ?? '')
}

function removeFromSubgroup(sgIndex: number, student: string) {
  const sg = subgroups.value[sgIndex]
  if (sg) sg.students = sg.students.filter(s => s !== student)
}

function addSubgroup() {
  subgroups.value.push({ students: [], input: '' })
}

function removeSubgroup(index: number) {
  const [removed] = subgroups.value.splice(index, 1)
  const first = subgroups.value[0]
  if (!removed || !first) return
  for (const student of removed.students) {
    if (!first.students.includes(student)) first.students.push(student)
  }
}

// Drag & Drop
const dragging = ref<{ student: string; fromIndex: number } | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(student: string, fromIndex: number) {
  dragging.value = { student, fromIndex }
}

function onDragOver(e: DragEvent, toIndex: number) {
  e.preventDefault()
  dragOverIndex.value = toIndex
}

function onDrop(toIndex: number) {
  if (!dragging.value) return
  const { student, fromIndex } = dragging.value
  const from = subgroups.value[fromIndex]
  const to = subgroups.value[toIndex]
  if (!from || !to || fromIndex === toIndex) return
  from.students = from.students.filter(s => s !== student)
  if (!to.students.includes(student)) to.students.push(student)
  dragging.value = null
  dragOverIndex.value = null
}

function onDragEnd() {
  dragging.value = null
  dragOverIndex.value = null
}

function resetForm() {
  groupName.value = ''
  mode.value = 'simple'
  simpleStudents.value = []
  subgroups.value = [
    { students: [], input: '' },
    { students: [], input: '' },
  ]
}

// Нет ручной валидации — схема сама блокирует сабмит
async function onSubmit(_: FormSubmitEvent<Schema>) {
  submitting.value = true
  const { error } = await create({
    groupName: groupName.value,
    students: students.value,
  })
  submitting.value = false

  if (error.value) {
    toastError(error.value, 'Ошибка создания группы')
    return
  }

  open.value = false
  resetForm()
}

const totalSubgroupStudents = computed(() =>
  subgroups.value.reduce((acc, sg) => acc + sg.students.length, 0),
)
</script>

<template>
  <UModal v-model:open="open" title="Создать группу" :ui="{ content: 'max-w-4xl' }">
    <UButton label="Создать группу" icon="i-lucide-users" />

    <template #body>
      <UForm
        id="create-group-form"
        :schema="schema"
        :state="state"
        class="flex flex-col gap-5"
        @submit="onSubmit"
      >
        <UFormField name="groupName" label="Название группы">
          <UInput
            v-model="groupName"
            placeholder="Например: ИС-21"
            icon="i-lucide-graduation-cap"
            class="w-full"
          />
        </UFormField>

        <!-- error-pattern чтобы ошибки students.0, students.1 матчились -->
        <UFormField name="students" :error-pattern="/^students(\..+)?$/">
          <div class="flex flex-col gap-5">
            <UTabs
              v-model="mode"
              :items="modeTabs"
              :content="false"
              color="neutral"
              variant="pill"
            />

            <template v-if="mode === 'simple'">
              <UFormField
                label="Студенты"
                description="Вставьте список из Excel или вводите по одному через Enter"
              >
                <UInputTags
                  v-model="simpleStudents"
                  placeholder="username студента..."
                  :add-on-paste="true"
                  :add-on-blur="true"
                  :duplicate="false"
                  :delimiter="/[\n\r\t,]+/"
                  icon="i-lucide-user"
                  class="w-full"
                />
              </UFormField>

              <div v-if="simpleStudents.length" class="text-xs text-muted">
                Всего студентов: <strong>{{ simpleStudents.length }}</strong>
              </div>
            </template>

            <template v-else>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">
                  Подгруппы
                  <span v-if="totalSubgroupStudents" class="text-muted font-normal">
                    · {{ totalSubgroupStudents }} студентов
                  </span>
                </span>
                <UButton
                  size="xs"
                  icon="i-lucide-plus"
                  variant="soft"
                  label="Добавить подгруппу"
                  @click="addSubgroup"
                />
              </div>

              <div class="flex gap-3 overflow-x-auto pb-2">
                <UCard
                  v-for="(sg, sgIndex) in subgroups"
                  :key="sgIndex"
                  class="shrink-0 w-56 transition-colors"
                  :ui="{ root: 'flex flex-col', body: 'p-2 flex-1', header: 'px-3 py-2', footer: 'p-2' }"
                  :class="dragOverIndex === sgIndex ? 'ring-2 ring-primary bg-primary/5' : ''"
                  @dragover="onDragOver($event, sgIndex)"
                  @drop="onDrop(sgIndex)"
                >
                  <template #header>
                    <div class="flex items-center justify-between gap-1">
                      <span class="font-semibold text-sm truncate">{{ subgroupLabel(sgIndex) }}</span>
                      <div class="flex items-center gap-1 shrink-0">
                        <UBadge :label="String(sg.students.length)" color="neutral" variant="soft" size="sm" />
                        <UButton
                          v-if="subgroups.length > 1"
                          size="xs"
                          icon="i-lucide-x"
                          variant="ghost"
                          color="error"
                          @click="removeSubgroup(sgIndex)"
                        />
                      </div>
                    </div>
                  </template>

                  <div class="flex flex-col gap-1 min-h-12">
                    <div
                      v-for="student in sg.students"
                      :key="student"
                      draggable="true"
                      class="flex items-center justify-between gap-1 px-2 py-1.5 rounded-md bg-elevated cursor-grab active:cursor-grabbing text-sm select-none group"
                      :class="dragging?.student === student ? 'opacity-40' : ''"
                      @dragstart="onDragStart(student, sgIndex)"
                      @dragend="onDragEnd"
                    >
                      <div class="flex items-center gap-1.5 min-w-0">
                        <UIcon name="i-lucide-grip-vertical" class="text-muted shrink-0 size-3.5" />
                        <span class="truncate text-xs">{{ student }}</span>
                      </div>
                      <UButton
                        size="xs"
                        icon="i-lucide-x"
                        variant="ghost"
                        color="neutral"
                        class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        @click="removeFromSubgroup(sgIndex, student)"
                      />
                    </div>

                    <div
                      v-if="dragging && dragging.fromIndex !== sgIndex && sg.students.length === 0"
                      class="text-xs text-center text-muted py-3 border border-dashed border-muted rounded-md"
                    >
                      Перетащите сюда
                    </div>
                  </div>

                  <template #footer>
                    <UInput
                      v-model="sg.input"
                      size="sm"
                      variant="soft"
                      placeholder="Добавить студентов..."
                      icon="i-lucide-user-plus"
                      @keydown.enter.prevent="onSubgroupInputEnter(sgIndex)"
                      @paste="onSubgroupInputPaste(sgIndex, $event)"
                    />
                  </template>
                </UCard>
              </div>
            </template>
          </div>
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end items-center gap-2 w-full">
        <UButton
          label="Отмена"
          color="neutral"
          variant="ghost"
          @click="close(); resetForm()"
        />
        <UButton
          type="submit"
          form="create-group-form"
          label="Создать группу"
          icon="i-lucide-check"
          :loading="submitting"
        />
      </div>
    </template>
  </UModal>
</template>