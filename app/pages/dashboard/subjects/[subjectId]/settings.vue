<script setup lang="ts">
import type { AttachGroupToSubjectResponse, StudentGroupPageResponse, UpdateSubjectRequestPayload } from '#shared/types/backend'
import type { TableColumn } from '@nuxt/ui'
import { updateSubjectRequestSchema } from '#shared/types/backend'
import { h, resolveComponent } from 'vue'
import { useStudentsApi } from '~/composables/api/useStudentsApi'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'
import { useSubjectsStore } from '~/stores/subjects'

const subjectsStore = useSubjectsStore()
const { attachGroup, detachGroup, findGroups, remove, update } = useSubjectsApi()
const { findAll: findAllGroups } = useStudentsGroupsApi()
const { findSubjectSubgroups } = useStudentsApi()
const toast = useToast()
const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const subject = computed(() =>
  subjectsStore.activeSubjects.find(s => s.id === subjectId.value)
  ?? subjectsStore.archivedSubjects.find(s => s.id === subjectId.value)
  ?? null,
)

function getErrorMessage(err: unknown): string {
  if (err instanceof Error)
    return err.message
  const e = err as { data?: { statusMessage?: string, message?: string }, message?: string }
  return e?.data?.statusMessage || e?.data?.message || e?.message || 'Что-то пошло не так'
}

// ── Edit info ─────────────────────────────────────────────────────────────────

const editState = reactive<{ name: string, description: string }>({ name: '', description: '' })
const editPending = ref(false)

watch(subject, (val) => {
  if (val) {
    editState.name = val.name
    editState.description = val.description ?? ''
  }
}, { immediate: true })

async function onSaveInfo(event: { data: UpdateSubjectRequestPayload }) {
  if (editPending.value)
    return
  editPending.value = true
  try {
    const { data, error } = await update(subjectId.value, {
      name: event.data.name,
      description: event.data.description || null,
    })
    if (error.value)
      throw error.value
    if (!data.value)
      throw new Error('Нет ответа от сервера')
    await Promise.all([subjectsStore.loadActiveSubjects(), subjectsStore.loadArchivedSubjectsOnce()])
    toast.add({ title: 'Изменения сохранены', color: 'success', icon: 'i-lucide-check' })
  }
  catch (err) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(err), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    editPending.value = false
  }
}

// ── Attached groups ───────────────────────────────────────────────────────────

const {
  data: attachedGroupsData,
  pending: attachedGroupsPending,
  error: attachedGroupsError,
  refresh: refreshAttachedGroups,
} = findGroups(subjectId)

const attachedGroups = computed<StudentGroupPageResponse[]>(() => attachedGroupsData.value ?? [])
const attachedGroupIds = computed(() => new Set(attachedGroups.value.map(g => g.id)))

const detachingId = ref<string | null>(null)
const UButton = resolveComponent('UButton')

const attachedGroupsColumns: TableColumn<StudentGroupPageResponse>[] = [
  {
    accessorKey: 'name',
    header: 'Группа',
    meta: { class: { th: 'w-2/3', td: 'w-2/3' } },
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-32', td: 'w-32' } },
    cell: ({ row }) =>
      h(UButton, {
        color: 'error',
        variant: 'ghost',
        size: 'sm',
        icon: 'i-lucide-unlink',
        loading: detachingId.value === row.original.id,
        disabled: detachingId.value !== null,
        onClick: () => onDetachGroup(row.original.id, row.original.name),
      }, () => 'Открепить'),
  },
]

async function onDetachGroup(groupId: string, groupName: string) {
  if (detachingId.value)
    return
  detachingId.value = groupId
  try {
    const { error } = await detachGroup(subjectId.value, groupId)
    if (error.value)
      throw error.value
    await Promise.all([refreshAttachedGroups(), refreshSubgroups()])
    toast.add({ title: `Группа «${groupName}» откреплена`, color: 'success', icon: 'i-lucide-check' })
  }
  catch (err) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(err), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    detachingId.value = null
  }
}

// ── Attach group ──────────────────────────────────────────────────────────────

const { data: groupsData, pending: groupsPending } = findAllGroups({ size: 100 })

const groupOptions = computed(() =>
  (groupsData.value?.content ?? [])
    .filter(g => !attachedGroupIds.value.has(g.id))
    .map(g => ({ label: g.name, value: g.id })),
)

const selectedGroupId = ref<string | undefined>(undefined)
const attachPending = ref(false)
const lastAttachResult = ref<AttachGroupToSubjectResponse | null>(null)

async function onAttachGroup() {
  if (!selectedGroupId.value || attachPending.value)
    return
  attachPending.value = true
  try {
    const { data, error } = await attachGroup(subjectId.value, selectedGroupId.value)
    if (error.value)
      throw error.value
    if (!data.value)
      throw new Error('Нет ответа от сервера')
    lastAttachResult.value = data.value
    toast.add({
      title: 'Группа прикреплена',
      description: `${data.value.groupName}: добавлено ${data.value.addedStudentsCount} студентов. Всего: ${data.value.totalStudentsInSubject}.`,
      color: 'success',
      icon: 'i-lucide-check',
    })
    selectedGroupId.value = undefined
    await Promise.all([refreshAttachedGroups(), refreshSubgroups()])
  }
  catch (err) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(err), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    attachPending.value = false
  }
}

// ── Subgroups ─────────────────────────────────────────────────────────────────

const {
  data: subgroupsData,
  pending: subgroupsPending,
  error: subgroupsError,
  refresh: refreshSubgroups,
} = findSubjectSubgroups(subjectId)

interface SubgroupRow { id: string, name: string, studentCount: number, students: string[] }

const subgroupRows = computed<SubgroupRow[]>(() =>
  (subgroupsData.value?.subgroups ?? []).map(sg => ({
    id: sg.id,
    name: sg.name,
    studentCount: sg.students.length,
    students: sg.students,
  })),
)

const subgroupColumns: TableColumn<SubgroupRow>[] = [
  { accessorKey: 'name', header: 'Подгруппа', meta: { class: { th: 'w-1/3', td: 'w-1/3' } } },
  { accessorKey: 'studentCount', header: 'Студентов', meta: { class: { th: 'w-28', td: 'w-28' } } },
  {
    accessorKey: 'students',
    header: 'Состав',
    meta: { class: { td: 'max-w-0 overflow-hidden text-ellipsis whitespace-nowrap' } },
    cell: ({ row }) => row.original.students.join(', ') || '—',
  },
]

// ── Archive / Unarchive ───────────────────────────────────────────────────────

const archivePending = ref(false)

async function onArchiveConfirm(close: () => void) {
  if (archivePending.value)
    return
  archivePending.value = true
  try {
    const { error } = await update(subjectId.value, { archived: true, archivedAt: new Date().toISOString() })
    if (error.value)
      throw error.value
    await Promise.all([subjectsStore.loadActiveSubjects(), subjectsStore.loadArchivedSubjects()])
    toast.add({ title: 'Предмет архивирован', color: 'success', icon: 'i-lucide-check' })
    close()
    await navigateTo('/dashboard/subjects')
  }
  catch (err) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(err), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    archivePending.value = false
  }
}

const unarchivePending = ref(false)

async function onUnarchiveConfirm(close: () => void) {
  if (unarchivePending.value)
    return
  unarchivePending.value = true
  try {
    const { error } = await update(subjectId.value, { archived: false, archivedAt: null })
    if (error.value)
      throw error.value
    await Promise.all([subjectsStore.loadActiveSubjects(), subjectsStore.loadArchivedSubjects()])
    toast.add({ title: 'Предмет разархивирован', color: 'success', icon: 'i-lucide-check' })
    close()
  }
  catch (err) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(err), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    unarchivePending.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

const deletePending = ref(false)

async function onDeleteConfirm(close: () => void) {
  if (deletePending.value)
    return
  deletePending.value = true
  try {
    const { error } = await remove(subjectId.value)
    if (error.value)
      throw error.value
    await Promise.all([subjectsStore.loadActiveSubjects(), subjectsStore.loadArchivedSubjects()])
    toast.add({ title: 'Предмет удалён', color: 'success', icon: 'i-lucide-check' })
    close()
    await navigateTo('/dashboard/subjects')
  }
  catch (err) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(err), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    deletePending.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div>
      <h1 class="text-xl font-semibold">
        Настройки
      </h1>
    </div>

    <!-- 1. Основная информация -->
    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold">
            Основная информация
          </h2>
          <p class="mt-0.5 text-sm text-muted">
            Название и описание предмета.
          </p>
        </div>
      </template>

      <UForm
        :schema="updateSubjectRequestSchema"
        :state="editState"
        class="flex flex-col gap-4"
        @submit="onSaveInfo"
      >
        <UFormField name="name" label="Название" required>
          <UInput
            v-model="editState.name"
            placeholder="Например, Алгебра"
            :disabled="editPending"
            class="w-full"
          />
        </UFormField>

        <UFormField name="description" label="Описание">
          <UTextarea
            v-model="editState.description"
            placeholder="Краткое описание (необязательно)"
            :rows="3"
            :disabled="editPending"
            class="w-full"
          />
        </UFormField>

        <div>
          <UButton
            type="submit"
            icon="i-lucide-check"
            :loading="editPending"
            :disabled="editPending"
          >
            Сохранить
          </UButton>
        </div>
      </UForm>
    </UCard>

    <!-- 2. Прикреплённые группы -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-semibold">
              Прикреплённые группы
            </h2>
            <p class="mt-0.5 text-sm text-muted">
              Группы, студенты которых участвуют в этом предмете.
            </p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            :loading="attachedGroupsPending"
            @click="() => refreshAttachedGroups()"
          />
        </div>
      </template>

      <UAlert
        v-if="attachedGroupsError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-x"
        title="Ошибка загрузки"
        :description="attachedGroupsError.message"
        class="mb-4"
      />

      <UTable
        :data="attachedGroups"
        :columns="attachedGroupsColumns"
        :loading="attachedGroupsPending"
      >
        <template #empty>
          <UEmpty
            icon="i-lucide-users"
            title="Групп нет"
            description="Прикрепите группу ниже."
            variant="naked"
            class="py-6"
          />
        </template>
      </UTable>
    </UCard>

    <!-- 3. Прикрепить группу -->
    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold">
            Прикрепить группу
          </h2>
          <p class="mt-0.5 text-sm text-muted">
            Студенты выбранной группы будут добавлены к предмету.
          </p>
        </div>
      </template>

      <div class="flex flex-wrap items-end gap-3">
        <USelectMenu
          v-model="selectedGroupId"
          :items="groupOptions"
          value-key="value"
          searchable
          :loading="groupsPending"
          :disabled="groupsPending || attachPending"
          placeholder="Выберите группу"
          class="w-64"
        />

        <UButton
          icon="i-lucide-link"
          :loading="attachPending"
          :disabled="!selectedGroupId || attachPending"
          @click="onAttachGroup"
        >
          Прикрепить
        </UButton>
      </div>

      <div v-if="lastAttachResult" class="mt-4">
        <UAlert
          color="success"
          variant="soft"
          icon="i-lucide-users"
          :title="`Группа «${lastAttachResult.groupName}» прикреплена`"
          :description="`Добавлено студентов: ${lastAttachResult.addedStudentsCount}. Всего в предмете: ${lastAttachResult.totalStudentsInSubject}.`"
        />
      </div>
    </UCard>

    <!-- 4. Подгруппы предмета -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-semibold">
              Подгруппы предмета
            </h2>
            <p class="mt-0.5 text-sm text-muted">
              Распределение студентов по подгруппам.
            </p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            :loading="subgroupsPending"
            @click="() => refreshSubgroups()"
          />
        </div>
      </template>

      <UAlert
        v-if="subgroupsError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-x"
        title="Ошибка загрузки"
        :description="subgroupsError.message"
        class="mb-4"
      />

      <UTable
        :data="subgroupRows"
        :columns="subgroupColumns"
        :loading="subgroupsPending"
      >
        <template #empty>
          <UEmpty
            icon="i-lucide-users"
            title="Подгруппы не найдены"
            description="Подгруппы появятся после прикрепления группы."
            variant="naked"
            class="py-6"
          />
        </template>
      </UTable>
    </UCard>

    <!-- 5. Архивирование -->
    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold">
            {{ subject?.archived ? 'Разархивировать предмет' : 'Архивировать предмет' }}
          </h2>
          <p class="mt-0.5 text-sm text-muted">
            {{ subject?.archived
              ? 'Вернёт предмет в активный список.'
              : 'Скрывает предмет из активного списка. Данные сохраняются.' }}
          </p>
        </div>
      </template>

      <template v-if="subject?.archived">
        <UModal title="Разархивировать предмет?">
          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-archive-restore"
          >
            Разархивировать
          </UButton>

          <template #body="{ close }">
            <div class="flex flex-col gap-4">
              <p>Предмет <strong>{{ subject?.name }}</strong> будет возвращён в активный список.</p>
              <div class="flex justify-end gap-2">
                <UButton color="neutral" variant="soft" :disabled="unarchivePending" @click="close()">
                  Отмена
                </UButton>
                <UButton
                  icon="i-lucide-archive-restore"
                  :loading="unarchivePending"
                  :disabled="unarchivePending"
                  @click="onUnarchiveConfirm(close)"
                >
                  Разархивировать
                </UButton>
              </div>
            </div>
          </template>
        </UModal>
      </template>

      <template v-else>
        <UModal title="Архивировать предмет?">
          <UButton color="neutral" variant="soft" icon="i-lucide-archive">
            Архивировать
          </UButton>

          <template #body="{ close }">
            <div class="flex flex-col gap-4">
              <p>
                Предмет <strong>{{ subject?.name }}</strong> будет перемещён в архив.
                Данные занятий и оценок сохранятся.
              </p>
              <div class="flex justify-end gap-2">
                <UButton color="neutral" variant="soft" :disabled="archivePending" @click="close()">
                  Отмена
                </UButton>
                <UButton
                  color="neutral"
                  icon="i-lucide-archive"
                  :loading="archivePending"
                  :disabled="archivePending"
                  @click="onArchiveConfirm(close)"
                >
                  Архивировать
                </UButton>
              </div>
            </div>
          </template>
        </UModal>
      </template>
    </UCard>

    <!-- 6. Удалить предмет -->
    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold text-red-500 dark:text-red-400">
            Удалить предмет
          </h2>
          <p class="mt-0.5 text-sm text-muted">
            Необратимое действие. Все данные занятий, оценок и посещаемости будут удалены.
          </p>
        </div>
      </template>

      <UModal title="Удалить предмет?">
        <UButton color="error" variant="soft" icon="i-lucide-trash-2">
          Удалить
        </UButton>

        <template #body="{ close }">
          <div class="flex flex-col gap-4">
            <UAlert
              color="error"
              variant="soft"
              icon="i-lucide-triangle-alert"
              title="Это действие необратимо"
              description="Все занятия, задания, оценки и данные посещаемости этого предмета будут удалены навсегда."
            />
            <p>Вы уверены, что хотите удалить предмет <strong>{{ subject?.name }}</strong>?</p>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="soft" :disabled="deletePending" @click="close()">
                Отмена
              </UButton>
              <UButton
                color="error"
                icon="i-lucide-trash-2"
                :loading="deletePending"
                :disabled="deletePending"
                @click="onDeleteConfirm(close)"
              >
                Удалить навсегда
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </UCard>
  </section>
</template>
