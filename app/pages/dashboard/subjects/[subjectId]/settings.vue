<script setup lang="ts">
import type { UpdateSubjectRequestPayload } from '#shared/types/backend'
import { updateSubjectRequestSchema } from '#shared/types/backend'
import { ref } from 'vue'
import { deleteSubject, updateSubject, useSubjectAttendance } from '~/composables/api/useSubjectsApi'
import { useSubjectsStore } from '~/stores/subjects'

const subjectsStore = useSubjectsStore()
const toast = useToast()
const { toastError } = useApiError()
const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const subject = computed(() =>
  subjectsStore.activeSubjects.find(s => s.id === subjectId.value)
  ?? subjectsStore.archivedSubjects.find(s => s.id === subjectId.value)
  ?? null,
)

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
  const { error } = await updateSubject(subjectId.value, {
    name: event.data.name,
    description: event.data.description || null,
  })
  editPending.value = false
  if (error.value) {
    toastError(error.value, 'Ошибка')
    return
  }
  await Promise.all([subjectsStore.loadActiveSubjects(), subjectsStore.loadArchivedSubjectsOnce()])
  toast.add({ title: 'Изменения сохранены', color: 'success', icon: 'i-lucide-check' })
}

const { data: attendanceData, pending: studentsPending } = useSubjectAttendance(subjectId)
const attachedStudents = computed(() => attendanceData.value?.students ?? [])

// ── Archive / Unarchive ───────────────────────────────────────────────────────

const archivePending = ref(false)

async function onArchiveConfirm(close: () => void) {
  if (archivePending.value)
    return
  archivePending.value = true
  const { error } = await updateSubject(subjectId.value, { archived: true, archivedAt: new Date().toISOString() })
  archivePending.value = false
  if (error.value) {
    toastError(error.value, 'Ошибка')
    return
  }
  await Promise.all([subjectsStore.loadActiveSubjects(), subjectsStore.loadArchivedSubjects()])
  toast.add({ title: 'Предмет архивирован', color: 'success', icon: 'i-lucide-check' })
  close()
  await navigateTo('/dashboard/subjects')
}

const unarchivePending = ref(false)

async function onUnarchiveConfirm(close: () => void) {
  if (unarchivePending.value)
    return
  unarchivePending.value = true
  const { error } = await updateSubject(subjectId.value, { archived: false, archivedAt: null })
  unarchivePending.value = false
  if (error.value) {
    toastError(error.value, 'Ошибка')
    return
  }
  await Promise.all([subjectsStore.loadActiveSubjects(), subjectsStore.loadArchivedSubjects()])
  toast.add({ title: 'Предмет разархивирован', color: 'success', icon: 'i-lucide-check' })
  close()
}

// ── Delete ────────────────────────────────────────────────────────────────────

const deletePending = ref(false)

async function onDeleteConfirm(close: () => void) {
  if (deletePending.value)
    return
  deletePending.value = true
  const { error } = await deleteSubject(subjectId.value)
  deletePending.value = false
  if (error.value) {
    toastError(error.value, 'Ошибка')
    return
  }
  await Promise.all([subjectsStore.loadActiveSubjects(), subjectsStore.loadArchivedSubjects()])
  toast.add({ title: 'Предмет удалён', color: 'success', icon: 'i-lucide-check' })
  close()
  await navigateTo('/dashboard/subjects')
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

    <!-- 2. Студенты -->
    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold">
            Студенты
          </h2>
          <p class="mt-0.5 text-sm text-muted">
            Прикрепляйте группы и просматривайте студентов предмета.
          </p>
        </div>
      </template>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm">
          <UIcon name="i-lucide-users" class="size-4 text-muted" />
          <span v-if="studentsPending" class="text-muted">Загрузка...</span>
          <span v-else>
            Прикреплено студентов:
            <strong>{{ attachedStudents.length }}</strong>
          </span>
        </div>

        <SubjectStudentsModal :subject-id="subjectId" />
      </div>
    </UCard>

    <!-- 3. Архивирование -->
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

    <!-- 4. Удалить предмет -->
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
