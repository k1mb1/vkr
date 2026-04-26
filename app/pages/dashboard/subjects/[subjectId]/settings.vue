<script setup lang="ts">
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'
import { useSubjectsStore } from '~/stores/subjects'

const subjectsStore = useSubjectsStore()
const { archive } = useSubjectsApi()
const toast = useToast()
const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const subject = computed(() =>
  subjectsStore.activeSubjects.find(s => s.id === subjectId.value)
  ?? subjectsStore.archivedSubjects.find(s => s.id === subjectId.value)
  ?? null,
)

const pending = ref(false)

async function onArchiveConfirm(close: () => void) {
  if (pending.value)
    return

  pending.value = true
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
    pending.value = false
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

    <UCard>
      <div class="flex flex-col gap-3">
        <div>
          <p class="font-medium">
            Архивировать предмет
          </p>
          <p class="text-sm text-muted mt-1">
            Архивированный предмет скрывается из активного списка. Данные сохраняются.
          </p>
        </div>

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
                  :disabled="pending"
                  @click="close()"
                >
                  Отмена
                </UButton>

                <UButton
                  color="error"
                  icon="i-lucide-archive"
                  :loading="pending"
                  :disabled="pending"
                  @click="onArchiveConfirm(close)"
                >
                  Архивировать
                </UButton>
              </div>
            </div>
          </template>
        </UModal>
      </div>
    </UCard>
  </section>
</template>
