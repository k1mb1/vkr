<script setup lang="ts">
import type { CreateGroupRequestPayload, StudentGroupResponse } from '#shared/types/backend'
import { createGroupRequestSchema } from '#shared/types/backend'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'

const props = defineProps<{
  afterCreate?: () => void | Promise<void>
}>()

type Mode = 'direct' | 'subgroups'

const mode = ref<Mode>('subgroups')
const subgroupCount = ref(2)

const state = reactive<CreateGroupRequestPayload>({
  groupName: '',
  students: [],
})

const drafts = ref<string[]>(['', ''])
const draftRefs = ref<Array<{ inputRef?: HTMLInputElement | null }>>([])

const pending = ref(false)
const { create } = useStudentsGroupsApi()
const toast = useToast()

const displaySubgroups = computed(() => {
  if (mode.value === 'direct') {
    return [{ index: 0, names: state.students.map(s => s.username), label: 'Студенты' }]
  }
  return Array.from({ length: subgroupCount.value }, (_, i) => ({
    index: i,
    names: state.students.filter(s => s.subgroupIndex === i).map(s => s.username),
    label: `${state.groupName || 'ГРУППА'}/${i + 1}`,
  }))
})

const totalStudents = computed(() => state.students.length)

const modeTabs = [
  { value: 'direct', label: 'Один список' },
  { value: 'subgroups', label: 'Подгруппы' },
]

function setMode(next: Mode) {
  if (next === mode.value)
    return
  if (next === 'direct') {
    state.students.forEach(s => s.subgroupIndex = null)
    subgroupCount.value = 1
    drafts.value = ['']
  }
  else {
    state.students.forEach(s => s.subgroupIndex = s.subgroupIndex ?? 0)
    if (subgroupCount.value < 2) {
      subgroupCount.value = 2
    }
    if (drafts.value.length < subgroupCount.value) {
      drafts.value.push(...Array.from({ length: subgroupCount.value - drafts.value.length }).fill(''))
    }
  }
  mode.value = next
}

function addNames(sgIndex: number, raw: string) {
  const names = raw.split(/[,\n\t]+/).map(s => s.trim()).filter(Boolean)
  if (!names.length)
    return
  for (const name of names) {
    state.students.push({
      username: name,
      subgroupIndex: mode.value === 'direct' ? null : sgIndex,
    })
  }
  drafts.value[sgIndex] = ''
}

function removeName(sgIndex: number, nameIndex: number) {
  if (mode.value === 'direct') {
    state.students.splice(nameIndex, 1)
    return
  }
  const subgroupStudents = state.students.filter(s => s.subgroupIndex === sgIndex)
  const toRemove = subgroupStudents[nameIndex]
  if (toRemove) {
    const realIndex = state.students.indexOf(toRemove)
    if (realIndex !== -1)
      state.students.splice(realIndex, 1)
  }
}

function onDraftKeydown(e: KeyboardEvent, sgIndex: number) {
  const draft = drafts.value[sgIndex] ?? ''
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addNames(sgIndex, draft)
  }
  else if (e.key === 'Backspace' && draft === '') {
    const subgroupStudents = mode.value === 'direct'
      ? state.students
      : state.students.filter(s => s.subgroupIndex === sgIndex)
    if (subgroupStudents.length > 0) {
      const last = subgroupStudents[subgroupStudents.length - 1]!
      const realIndex = state.students.indexOf(last)
      if (realIndex !== -1)
        state.students.splice(realIndex, 1)
    }
  }
}

function onDraftBlur(sgIndex: number) {
  const draft = drafts.value[sgIndex] ?? ''
  if (draft)
    addNames(sgIndex, draft)
}

function onDraftPaste(e: ClipboardEvent, sgIndex: number) {
  e.preventDefault()
  addNames(sgIndex, e.clipboardData?.getData('text') ?? '')
}

function addSubgroup() {
  subgroupCount.value++
  drafts.value.push('')
}

function removeSubgroup(index: number) {
  if (subgroupCount.value <= 1)
    return
  state.students = state.students.filter(s => s.subgroupIndex !== index)
  state.students.forEach((s) => {
    if (s.subgroupIndex !== null && s.subgroupIndex > index) {
      s.subgroupIndex--
    }
  })
  subgroupCount.value--
  drafts.value.splice(index, 1)
}

function resetForm() {
  state.groupName = ''
  state.students = []
  mode.value = 'subgroups'
  subgroupCount.value = 2
  drafts.value = ['', '']
}

function onAfterLeave() {
  if (!pending.value)
    resetForm()
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'string')
    return error
  const e = error as { data?: { statusMessage?: string, message?: string }, message?: string }
  return e.data?.statusMessage || e.data?.message || e.message || 'Failed to create group'
}

async function onSubmit(event: { data: CreateGroupRequestPayload }, close: () => void) {
  if (pending.value)
    return
  pending.value = true
  try {
    const { data, error } = await create(event.data)
    if (error.value || !data.value)
      throw error.value || new Error('Group was not returned by API')
    const created: StudentGroupResponse = data.value
    toast.add({ title: 'Группа создана', description: `«${created.name}» готова.`, color: 'success', icon: 'i-lucide-check' })
    close()
    resetForm()
    if (props.afterCreate)
      await props.afterCreate()
  }
  catch (e) {
    toast.add({ title: 'Ошибка создания', description: getErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    title="Создать группу"
    description="Введите название и добавьте студентов."
    @after:leave="onAfterLeave"
  >
    <UButton icon="i-lucide-plus" color="primary">
      Создать группу
    </UButton>

    <template #body="{ close }">
      <UForm
        :schema="createGroupRequestSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit($event, close)"
      >
        <UFormField name="groupName" label="Название группы" required>
          <UInput
            v-model="state.groupName"
            placeholder="например, ИСТ-21"
            :disabled="pending"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Режим добавления">
          <UTabs
            :model-value="mode"
            :items="modeTabs"
            :disabled="pending"
            @update:model-value="setMode($event as Mode)"
          />
        </UFormField>

        <UFormField name="students" hint="Enter или запятая — добавить имя; вставка списка столбиком работает автоматически">
          <div class="space-y-3">
            <div v-for="sg in displaySubgroups" :key="sg.index">
              <div class="mb-1.5 flex items-center justify-between">
                <span class="text-sm font-medium">
                  {{ sg.label }}
                  <UBadge color="neutral" variant="soft" size="sm" class="ml-1">
                    {{ sg.names.length }}
                  </UBadge>
                </span>
                <UButton
                  v-if="mode === 'subgroups' && subgroupCount > 1"
                  icon="i-lucide-trash-2"
                  color="neutral"
                  variant="ghost"
                  :disabled="pending"
                  @click="removeSubgroup(sg.index)"
                />
              </div>

              <div
                class="flex min-h-12 cursor-text flex-wrap gap-1.5 rounded-md border border-default bg-default p-2"
                @click="draftRefs[sg.index]?.inputRef?.focus()"
              >
                <UBadge
                  v-for="(name, j) in sg.names"
                  :key="j"
                  color="neutral"
                  variant="soft"
                >
                  {{ name }}
                  <button
                    type="button"
                    class="ml-1 opacity-50 hover:opacity-100"
                    :disabled="pending"
                    @click.stop="removeName(sg.index, j)"
                  >
                    <UIcon name="i-lucide-x" class="size-3" />
                  </button>
                </UBadge>

                <UInput
                  :ref="(el: unknown) => { if (el) draftRefs[sg.index] = el as { inputRef?: HTMLInputElement | null } }"
                  v-model="drafts[sg.index]"
                  variant="none"
                  :ui="{ root: 'flex-1 min-w-32', base: 'p-0 text-sm placeholder:text-dimmed' }"
                  :placeholder="sg.names.length === 0 ? 'Имя + Enter, или вставьте список…' : '+ добавить…'"
                  :disabled="pending"
                  @keydown="onDraftKeydown($event, sg.index)"
                  @blur="onDraftBlur(sg.index)"
                  @paste="onDraftPaste($event, sg.index)"
                />
              </div>
            </div>

            <UButton
              v-if="mode === 'subgroups'"
              icon="i-lucide-plus"
              color="neutral"
              variant="soft"
              :disabled="pending"
              @click="addSubgroup"
            >
              Добавить подгруппу
            </UButton>
          </div>
        </UFormField>

        <div class="flex items-center justify-between">
          <p class="text-sm text-muted">
            {{ totalStudents }} студент{{ totalStudents === 1 ? '' : totalStudents > 1 && totalStudents < 5 ? 'а' : 'ов' }}
            <template v-if="mode === 'subgroups'">
              в {{ subgroupCount }} подгрупп{{ subgroupCount === 1 ? 'е' : 'ах' }}
            </template>
          </p>

          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="pending"
              @click="close()"
            >
              Отмена
            </UButton>

            <UButton
              type="submit"
              icon="i-lucide-check"
              :loading="pending"
              :disabled="pending || !state.groupName || totalStudents === 0"
            >
              Создать
            </UButton>
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
