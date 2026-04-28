<script setup lang="ts">
import type { LessonResponse, LessonType, UpdateIssuedTaskIndexRequestPayload } from '#shared/types/backend'
import { updateIssuedTaskIndexRequestSchema } from '#shared/types/backend'
import { useLessonsApi } from '~/composables/api/useLessonsApi'

const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))
const lessonId = computed(() => String(route.params.lessonId ?? ''))

const { findAll, updateIssuedTaskIndex } = useLessonsApi()
const { data, pending, error, refresh } = findAll({ subjectId: subjectId.value })

const lesson = computed<LessonResponse | null>(() =>
  data.value?.find(l => l.id === lessonId.value) ?? null,
)

const notFound = computed(() => !pending.value && !error.value && data.value !== null && !lesson.value)

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  NONE: 'Без типа',
  LECTURE: 'Лекция',
  PRACTICE: 'Практика',
}

const LESSON_TYPE_COLORS: Record<LessonType, 'neutral' | 'primary' | 'secondary'> = {
  NONE: 'neutral',
  LECTURE: 'primary',
  PRACTICE: 'secondary',
}

function formatDateTime(dt: string | null): string {
  if (!dt)
    return '—'
  return new Date(dt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}

function formatDate(dt: string): string {
  return new Date(dt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}

function formatPenaltyMode(mode: LessonResponse['penaltyMode']): string {
  if (mode === 'NONE')
    return 'Без штрафа'
  if (mode === 'SUBTRACT')
    return 'Линейный (SUBTRACT)'
  return 'Геометрический (MULTIPLY)'
}

// Issued task index form
const toast = useToast()
const issuedTaskIndexPending = ref(false)
const issuedTaskIndexState = reactive<UpdateIssuedTaskIndexRequestPayload>({ issuedTaskIndex: 0 })

watch(lesson, (val) => {
  if (val)
    issuedTaskIndexState.issuedTaskIndex = val.issuedTaskIndex
}, { immediate: true })

function getErrorMessage(e: unknown): string {
  if (e instanceof Error)
    return e.message
  const err = e as { data?: { statusMessage?: string, message?: string }, message?: string }
  return err.data?.statusMessage || err.data?.message || err.message || 'Что-то пошло не так'
}

async function onSaveIssuedTaskIndex(event: { data: UpdateIssuedTaskIndexRequestPayload }) {
  if (issuedTaskIndexPending.value)
    return
  issuedTaskIndexPending.value = true
  try {
    const { data: updated, error: err } = await updateIssuedTaskIndex(lessonId, event.data)
    if (err.value || !updated.value)
      throw err.value || new Error('Нет ответа от сервера')
    toast.add({ title: 'Индекс выданного задания обновлён', color: 'success', icon: 'i-lucide-check' })
    await refresh()
  }
  catch (e) {
    toast.add({ title: 'Ошибка', description: getErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    issuedTaskIndexPending.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-6">
    <div class="flex items-center gap-3">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        :to="`/dashboard/subjects/${subjectId}/lessons`"
      />
      <div v-if="pending && !lesson" class="flex gap-3 items-center">
        <USkeleton class="h-7 w-48" />
        <USkeleton class="h-5 w-16 rounded-full" />
      </div>
      <template v-else-if="lesson">
        <h1 class="text-xl font-semibold">
          {{ lesson.name }}
        </h1>
        <UBadge
          :label="LESSON_TYPE_LABELS[lesson.type]"
          :color="LESSON_TYPE_COLORS[lesson.type]"
          variant="soft"
        />
      </template>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Ошибка загрузки"
      :description="error.message"
    />

    <UEmpty
      v-else-if="notFound"
      icon="i-lucide-search-x"
      title="Занятие не найдено"
      description="Проверьте ссылку или вернитесь к списку занятий."
      variant="naked"
    />

    <template v-else-if="lesson">
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Информация
          </h2>
        </template>

        <dl class="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          <div>
            <dt class="text-sm text-muted">
              Тип
            </dt>
            <dd class="mt-0.5">
              <UBadge
                :label="LESSON_TYPE_LABELS[lesson.type]"
                :color="LESSON_TYPE_COLORS[lesson.type]"
                variant="soft"
                size="sm"
              />
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted">
              Дата и время
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ formatDateTime(lesson.dateTime) }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted">
              ID группы
            </dt>
            <dd class="mt-0.5 text-sm font-mono">
              {{ lesson.groupId ?? '—' }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted">
              Подгруппа
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ lesson.subgroupNumber ?? '—' }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted">
              Режим выдачи
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ lesson.issuanceMode }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted">
              Выдано в
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ lesson.issuedAt ? formatDate(lesson.issuedAt) : '—' }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted">
              Текущий индекс задания
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ lesson.issuedTaskIndex }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted">
              Штраф смещения
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ formatPenaltyMode(lesson.penaltyMode) }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted">
              Шаг штрафа
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ lesson.penaltyStep }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted">
              Создано
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ formatDate(lesson.createdAt) }}
            </dd>
          </div>

          <div>
            <dt class="text-sm text-muted">
              Обновлено
            </dt>
            <dd class="mt-0.5 text-sm">
              {{ formatDate(lesson.updatedAt) }}
            </dd>
          </div>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold">
              Индекс выданного задания
            </h2>
            <p class="mt-0.5 text-sm text-muted">
              Поле управляет смещением относительно позиции задания и влияет на коэффициент по penalty-правилу.
            </p>
          </div>
        </template>

        <UForm
          :schema="updateIssuedTaskIndexRequestSchema"
          :state="issuedTaskIndexState"
          class="flex items-end gap-3"
          @submit="onSaveIssuedTaskIndex"
        >
          <UFormField name="issuedTaskIndex" label="Индекс (>= 0)" class="w-48">
            <UInput
              v-model.number="issuedTaskIndexState.issuedTaskIndex"
              type="number"
              :min="0"
              :step="1"
              :disabled="issuedTaskIndexPending"
              class="w-full"
            />
          </UFormField>

          <UButton
            type="submit"
            icon="i-lucide-check"
            :loading="issuedTaskIndexPending"
            :disabled="issuedTaskIndexPending"
          >
            Сохранить
          </UButton>
        </UForm>
      </UCard>
    </template>

    <template v-else-if="pending">
      <UCard>
        <template #header>
          <USkeleton class="h-5 w-24" />
        </template>
        <div class="grid grid-cols-2 gap-4">
          <USkeleton v-for="i in 6" :key="i" class="h-10" />
        </div>
      </UCard>
      <UCard>
        <template #header>
          <USkeleton class="h-5 w-40" />
        </template>
        <USkeleton class="h-10 w-64" />
      </UCard>
    </template>
  </section>
</template>
