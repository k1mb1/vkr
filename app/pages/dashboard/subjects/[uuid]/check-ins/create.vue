<script setup lang="ts">
import type { components } from '#open-fetch-schemas/backend'
import type { FetchError } from 'ofetch'

type StartCheckInRequest = components['schemas']['StartCheckInRequest']
type LessonResponse = components['schemas']['LessonResponse']

const route = useRoute()
const subjectId = String(route.params.uuid ?? '')

const { $backend } = useNuxtApp()
const { toastError } = useApiError()
const toast = useToast()

const { permission, permissionId, pending: permissionPending } = usePermissions()

const { data: lessonsData, pending: lessonsPending, refresh } = useBackend('/api/lessons', {
  method: 'GET',
  query: computed(() => ({ permissionId: permissionId.value })),
  immediate: false,
})

watch(permissionId, (pid) => {
  if (pid)
    refresh()
}, { immediate: true })

const lessons = computed<LessonResponse[]>(() => {
  const arr = [...(lessonsData.value ?? [])]
  arr.sort((a, b) => {
    const at = a.startedAt ? new Date(a.startedAt).getTime() : 0
    const bt = b.startedAt ? new Date(b.startedAt).getTime() : 0
    return bt - at
  })
  return arr
})

function formatAudience(l: LessonResponse): string {
  if (l.allGroups)
    return 'Все группы'
  const list = (l.scopes ?? []).map((s) => {
    const parts: string[] = [s.groupName ?? '—']
    if (s.allowedSubgroupIndex != null)
      parts.push(`Подгруппа ${s.allowedSubgroupIndex}`)
    return parts.join(' · ')
  })
  return list.join(', ') || '—'
}

function formatLesson(l: LessonResponse): string {
  const parts: string[] = []
  if (l.startedAt) {
    parts.push(new Intl.DateTimeFormat('ru', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(l.startedAt)))
  }
  parts.push(l.type === 'LECTURE' ? 'Лекция' : 'Практика')
  parts.push(formatAudience(l))
  if (l.topic)
    parts.push(l.topic)
  return parts.join(' · ')
}

const state = reactive({
  lessonId: '' as string,
  onTimeMinutes: 5,
  lateMinutes: 5,
})

const lessonOptions = computed(() =>
  lessons.value.map(l => ({ value: l.id!, label: formatLesson(l) })),
)

const selectedLessonOption = computed({
  get: () => lessonOptions.value.find(o => o.value === state.lessonId),
  set: (val) => {
    state.lessonId = val?.value ?? ''
  },
})

const selectedLesson = computed<LessonResponse | undefined>(() =>
  lessons.value.find(l => l.id === state.lessonId),
)

const loading = ref(false)

const errors = ref<string[]>([])

function validate(): boolean {
  errors.value = []
  if (!state.lessonId)
    errors.value.push('Выберите занятие')
  if (state.onTimeMinutes < 1)
    errors.value.push('Длительность основного окна — минимум 1 минута')
  if (state.lateMinutes < 0)
    errors.value.push('Окно для опоздавших не может быть отрицательным')
  return errors.value.length === 0
}

async function handleStart() {
  if (!validate())
    return

  loading.value = true
  try {
    const body: StartCheckInRequest = {
      lessonId: state.lessonId,
      onTimeSeconds: state.onTimeMinutes * 60,
      lateSeconds: state.lateMinutes * 60,
    }
    const result = await $backend('/api/check-in-sessions', { method: 'POST', body })
    toast.add({ title: 'Опрос запущен', color: 'success', icon: 'i-lucide-check' })
    await navigateTo(`/dashboard/subjects/${subjectId}/check-ins/${result.id}`)
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
  <div class="flex flex-col gap-6">
    <UPageHeader title="Запустить check-in">
      <template #links>
        <UButton
          :to="`/dashboard/subjects/${subjectId}/check-ins`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          label="Назад"
        />
      </template>
    </UPageHeader>

    <div v-if="permissionPending" class="flex flex-col gap-4">
      <USkeleton v-for="i in 3" :key="i" class="h-12" />
    </div>

    <UAlert
      v-else-if="!permission"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Нет назначения"
      description="У вас нет назначения по данному предмету."
    />

    <div v-else class="flex flex-col gap-4">
      <UAlert
        v-if="errors.length"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Исправьте ошибки"
        :description="errors.join(' · ')"
      />

      <UFormField label="Занятие" required>
        <USelectMenu
          v-model="selectedLessonOption"
          :items="lessonOptions"
          :loading="lessonsPending"
          :disabled="lessonsPending || lessonOptions.length === 0"
          placeholder="Выберите занятие..."
          class="w-full"
        />
      </UFormField>

      <UFormField v-if="selectedLesson" label="Аудитория">
        <UInput
          :model-value="formatAudience(selectedLesson)"
          disabled
          class="w-full"
        />
        <template #help>
          Аудитория опроса берётся из занятия
        </template>
      </UFormField>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Основное окно (минуты)" required>
          <UInput
            v-model.number="state.onTimeMinutes"
            type="number"
            :min="1"
            class="w-full"
          />
          <template #help>
            Студенты, отметившиеся здесь, получат статус «Присутствовал»
          </template>
        </UFormField>

        <UFormField label="Окно для опоздавших (минуты)">
          <UInput
            v-model.number="state.lateMinutes"
            type="number"
            :min="0"
            class="w-full"
          />
          <template #help>
            Отметившиеся здесь получат статус «Опоздал»
          </template>
        </UFormField>
      </div>

      <UButton
        icon="i-lucide-play"
        :loading="loading"
        :disabled="lessonOptions.length === 0"
        class="ml-auto"
        @click="handleStart"
      >
        Запустить опрос
      </UButton>
    </div>
  </div>
</template>
