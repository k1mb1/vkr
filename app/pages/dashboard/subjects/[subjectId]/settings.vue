<script setup lang="ts">
import type { AttachGroupToSubjectResponse } from '#shared/types/backend'
import { useStudentsGroupsApi } from '~/composables/api/useStudentsGroups'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'
import { useSubjectsStore } from '~/stores/subjects'

const subjectsStore = useSubjectsStore()
const { archive, attachGroup } = useSubjectsApi()
const { findAll: findAllGroups } = useStudentsGroupsApi()
const toast = useToast()
const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const subject = computed(() =>
  subjectsStore.activeSubjects.find(s => s.id === subjectId.value)
  ?? subjectsStore.archivedSubjects.find(s => s.id === subjectId.value)
  ?? null,
)

// ── Archive ───────────────────────────────────────────────────────────────────

const archivePending = ref(false)

async function onArchiveConfirm(close: () => void) {
  if (archivePending.value)
    return

  archivePending.value = true
  try {
    const { error } = await archive(subjectId.value)

    if (error.value)
      throw error.value

    await Promise.all([
      subjectsStore.loadActiveSubjects(),
      subjectsStore.loadArchivedSubjects(),
    ])

    toast.add({
      title: 'Предмет архивирован',
      description: `"${subject.value?.name}" перемещён в архив.`,
      color: 'success',
      icon: 'i-lucide-check',
    })

    close()
    await navigateTo('/dashboard/subjects')
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Не удалось архивировать предмет'
    toast.add({
      title: 'Ошибка',
      description: message,
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }
  finally {
    archivePending.value = false
  }
}

// ── Attach group ──────────────────────────────────────────────────────────────

const { data: groupsData, pending: groupsPending } = findAllGroups({ size: 100 })

const groupOptions = computed(() =>
  (groupsData.value?.content ?? []).map(g => ({ label: g.name, value: g.id })),
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
      description: `${data.value.groupName}: добавлено ${data.value.addedStudentsCount} студентов. Всего в предмете: ${data.value.totalStudentsInSubject}.`,
      color: 'success',
      icon: 'i-lucide-check',
    })

    selectedGroupId.value = undefined
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Не удалось прикрепить группу'
    toast.add({
      title: 'Ошибка',
      description: message,
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }
  finally {
    attachPending.value = false
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

    <!-- Прикрепить группу -->
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

    <!-- Архивировать -->
    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold">
            Архивировать предмет
          </h2>
          <p class="mt-0.5 text-sm text-muted">
            Архивированный предмет скрывается из активного списка. Данные сохраняются.
          </p>
        </div>
      </template>

      <UModal title="Архивировать предмет?">
        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-archive"
          :disabled="subject?.archived"
        >
          Архивировать
        </UButton>

        <template #body="{ close }">
          <div class="flex flex-col gap-4">
            <p>
              Предмет <strong>{{ subject?.name }}</strong> будет перемещён в архив.
              Данные занятий и оценок сохранятся.
            </p>

            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="soft"
                :disabled="archivePending"
                @click="close()"
              >
                Отмена
              </UButton>

              <UButton
                color="error"
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
    </UCard>
  </section>
</template>
