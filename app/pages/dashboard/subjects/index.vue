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

function openSubject(subjectId: string) {
  return navigateTo(`/dashboard/subjects/${subjectId}`)
}

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
  <div class="flex h-full flex-col gap-4 p-4 sm:p-6">
    <UAlert
      v-if="!teacherId"
      color="warning"
      variant="soft"
      title="Teacher ID not found"
      description="Предметы будут загружены после инициализации OIDC-сессии."
    />

    <UAlert
      v-if="activeSubjectsError"
      color="error"
      variant="soft"
      title="Failed to load subjects"
      :description="activeSubjectsError.message"
    />

    <UPageCard
      title="Активные предметы"
      description="По умолчанию отображаются только неархивированные предметы."
      class="space-y-4"
    >
      <template #extra>
        <UButton
          icon="i-lucide-refresh-cw"
          :loading="activeSubjectsPending"
          :disabled="!teacherId"
          @click="onRefreshActive"
        >
          Refresh
        </UButton>
      </template>

      <div
        v-if="activeSubjectsPending"
        class="space-y-3"
      >
        <USkeleton class="h-20 w-full" />
        <USkeleton class="h-20 w-full" />
      </div>

      <UEmpty
        v-else-if="!activeSubjects.length"
        icon="i-lucide-book-open"
        title="Активных предметов нет"
        description="Создайте первый предмет или обновите список."
      />

      <div
        v-else
        class="space-y-3"
      >
        <UCard
          v-for="subject in activeSubjects"
          :key="subject.id"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-highlighted">
                {{ subject.name }}
              </p>
              <p class="text-sm text-muted">
                {{ subject.description || 'Без описания' }}
              </p>
            </div>

            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-arrow-right"
              @click="openSubject(subject.id)"
            >
              Open
            </UButton>
          </div>
        </UCard>
      </div>
    </UPageCard>

    <UPageCard title="Архив">
      <UAccordion
        v-model="openedAccordion"
        :items="archivedAccordionItems"
        :unmount-on-hide="false"
      >
        <template #body="{ item }">
          <div
            v-if="item.value === ARCHIVED_ACCORDION_VALUE"
            class="space-y-3"
          >
            <UAlert
              v-if="archivedSubjectsError"
              color="error"
              variant="soft"
              title="Failed to load archived subjects"
              :description="archivedSubjectsError.message"
            />

            <div class="flex justify-end">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                :loading="archivedSubjectsPending"
                :disabled="!teacherId"
                @click="onRefreshArchived"
              >
                Refresh archived
              </UButton>
            </div>

            <div
              v-if="archivedSubjectsPending"
              class="space-y-3"
            >
              <USkeleton class="h-20 w-full" />
              <USkeleton class="h-20 w-full" />
            </div>

            <UEmpty
              v-else-if="!archivedSubjects.length"
              icon="i-lucide-archive"
              title="Архивных предметов нет"
              description=""
            />

            <div
              v-else
              class="space-y-3"
            >
              <UCard
                v-for="subject in archivedSubjects"
                :key="subject.id"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="space-y-1">
                    <p class="text-sm font-semibold text-highlighted">
                      {{ subject.name }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ subject.description || 'Без описания' }}
                    </p>
                  </div>

                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-arrow-right"
                    @click="openSubject(subject.id)"
                  >
                    Open
                  </UButton>
                </div>
              </UCard>
            </div>
          </div>
        </template>
      </UAccordion>
    </UPageCard>
  </div>
</template>
