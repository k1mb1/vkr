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
  <div class="flex flex-col gap-6 p-4 sm:p-6">
    <UPageHeader
      title="Предметы"
      description="Управление вашими предметами"
    >
      <template #links>
        <SubjectsCreateSubjectToolbarForm />
      </template>
    </UPageHeader>

    <UAlert
      v-if="!teacherId"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Сессия не инициализирована"
      description="Предметы будут загружены после инициализации OIDC-сессии."
    />

    <UAlert
      v-if="activeSubjectsError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="Ошибка загрузки"
      :description="activeSubjectsError.message"
    />

    <UPageCard :ui="{ header: 'mb-4 flex items-center gap-2' }">
      <template #header>
        <span class="font-medium text-highlighted">Активные предметы</span>
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
          size="sm"
          :loading="activeSubjectsPending"
          :disabled="!teacherId"
          class="ms-auto"
          @click="onRefreshActive"
        />
      </template>

      <UPageColumns v-if="activeSubjectsPending">
        <USkeleton class="h-24 w-full rounded-lg" />
        <USkeleton class="h-24 w-full rounded-lg" />
        <USkeleton class="h-24 w-full rounded-lg" />
      </UPageColumns>

      <UEmpty
        v-else-if="!activeSubjects.length"
        icon="i-lucide-book-open"
        title="Активных предметов нет"
        description="Создайте первый предмет с помощью кнопки выше."
        variant="naked"
        class="py-8"
      />

      <UPageColumns v-else>
        <UPageCard
          v-for="subject in activeSubjects"
          :key="subject.id"
          :title="subject.name"
          :description="subject.description || 'Без описания'"
          :to="`/dashboard/subjects/${subject.id}`"
        />
      </UPageColumns>
    </UPageCard>

    <UCard>
      <UAccordion
        v-model="openedAccordion"
        :items="archivedAccordionItems"
        :unmount-on-hide="false"
      >
        <template #body="{ item }">
          <div
            v-if="item.value === ARCHIVED_ACCORDION_VALUE"
            class="space-y-4 px-4 pb-4"
          >
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
              class="py-6"
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

            <div class="flex justify-end">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-refresh-cw"
                :loading="archivedSubjectsPending"
                :disabled="!teacherId"
                @click="onRefreshArchived"
              >
                Обновить
              </UButton>
            </div>
          </div>
        </template>
      </UAccordion>
    </UCard>
  </div>
</template>
