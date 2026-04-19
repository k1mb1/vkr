<script setup lang="ts">
import type {
  FindSubjectsFilter,
} from '#shared/types/backend'
import type { AccordionItem } from '@nuxt/ui'
import { useSubjectsApi } from '~/composables/api/useSubjectsApi'

const ARCHIVED_ACCORDION_VALUE = 'archived-subjects'

const { user } = useOidcAuth()
const { findAllByTeacherId } = useSubjectsApi()

const openedAccordion = ref<string | undefined>()
const archivedLoaded = ref(false)

const teacherId = computed(() => {
  const value = user.value?.sub
  return typeof value === 'string' && value.length > 0 ? value : null
})

const safeTeacherId = computed(() => teacherId.value ?? '')

const activeFilter = computed<FindSubjectsFilter>(() => ({ archived: false }))
const archivedFilter = computed<FindSubjectsFilter>(() => ({ archived: true }))

const {
  data: activeSubjectsData,
  pending: activeSubjectsPending,
  error: activeSubjectsError,
  refresh: refreshActiveSubjects,
} = findAllByTeacherId(
  safeTeacherId,
  activeFilter,
  {
    immediate: false,
  },
)

const {
  data: archivedSubjectsData,
  pending: archivedSubjectsPending,
  error: archivedSubjectsError,
  refresh: refreshArchivedSubjects,
} = findAllByTeacherId(
  safeTeacherId,
  archivedFilter,
  {
    immediate: false,
  },
)

const activeSubjects = computed(() => activeSubjectsData.value ?? [])
const archivedSubjects = computed(() => archivedSubjectsData.value ?? [])

const archivedAccordionItems = computed<AccordionItem[]>(() => {
  const archivedCount = archivedSubjects.value.length

  return [
    {
      value: ARCHIVED_ACCORDION_VALUE,
      label: archivedCount > 0 ? `Архивные предметы (${archivedCount})` : 'Архивные предметы',
      icon: 'i-lucide-archive',
    },
  ]
})

watch(teacherId, async (value) => {
  if (!value) {
    archivedLoaded.value = false
    return
  }

  await refreshActiveSubjects()
}, { immediate: true })

watch(openedAccordion, async (value) => {
  if (value !== ARCHIVED_ACCORDION_VALUE || archivedLoaded.value || !teacherId.value) {
    return
  }

  archivedLoaded.value = true
  await refreshArchivedSubjects()
})

async function onRefreshActive() {
  if (!teacherId.value) {
    return
  }

  await refreshActiveSubjects()
}

async function onRefreshArchived() {
  if (!teacherId.value) {
    return
  }

  archivedLoaded.value = true
  await refreshArchivedSubjects()
}
</script>

<template>
  <UPageCard :ui="{ header: 'flex items-center gap-2' }">
    <template #header>
      <span class="font-semibold text-highlighted">Активные предметы</span>
      <UBadge
        v-if="activeSubjects.length"
        :label="String(activeSubjects.length)"
        color="primary"
        variant="subtle"
      />
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        :loading="activeSubjectsPending"
        :disabled="!teacherId"
        class="ms-auto"
        @click="onRefreshActive"
      />
    </template>

    <UAlert
      v-if="!teacherId"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Сессия не инициализирована"
      description="Предметы будут загружены после инициализации OIDC-сессии."
      class="mb-4"
    />

    <UAlert
      v-if="activeSubjectsError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Ошибка загрузки"
      :description="activeSubjectsError.message"
      class="mb-4"
    />

    <UPageColumns v-if="activeSubjectsPending">
      <USkeleton class="h-24 w-full rounded-lg" />
      <USkeleton class="h-24 w-full rounded-lg" />
      <USkeleton class="h-24 w-full rounded-lg" />
    </UPageColumns>

    <UEmpty
      v-else-if="!activeSubjects.length && !activeSubjectsPending"
      icon="i-lucide-book-open"
      title="Активных предметов нет"
      description="Создайте первый предмет с помощью кнопки выше."
      variant="naked"
    />

    <UPageColumns v-else-if="activeSubjects.length">
      <UPageCard
        v-for="subject in activeSubjects"
        :key="subject.id"
        :title="subject.name"
        :description="subject.description || 'Без описания'"
        :to="`/dashboard/subjects/${subject.id}`"
      />
    </UPageColumns>
  </UPageCard>

  <UPageCard class="mt-4">
    <UAccordion
      v-model="openedAccordion"
      :items="archivedAccordionItems"
      :unmount-on-hide="false"
    >
      <template #body>
        <UAlert
          v-if="archivedSubjectsError"
          color="error"
          variant="soft"
          icon="i-lucide-circle-x"
          title="Ошибка загрузки архива"
          :description="archivedSubjectsError.message"
        />

        <UPageColumns v-if="archivedSubjectsPending">
          <USkeleton class="h-24 w-full rounded-lg" />
          <USkeleton class="h-24 w-full rounded-lg" />
        </UPageColumns>

        <UEmpty
          v-else-if="!archivedSubjects.length"
          icon="i-lucide-archive"
          title="Архивных предметов нет"
          variant="naked"
        />

        <UPageColumns v-else>
          <UPageCard
            v-for="subject in archivedSubjects"
            :key="subject.id"
            :title="subject.name"
            :description="subject.description || 'Без описания'"
            :to="`/dashboard/subjects/${subject.id}`"
            class="opacity-60 transition-opacity hover:opacity-100"
          />
        </UPageColumns>

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="archivedSubjectsPending"
          :disabled="!teacherId"
          class="ms-auto"
          @click="onRefreshArchived"
        >
          Обновить
        </UButton>
      </template>
    </UAccordion>
  </UPageCard>
</template>
