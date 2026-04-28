<script setup lang="ts">
import type { SubjectResponse } from '#shared/types/backend'
import type { BreadcrumbItem } from '@nuxt/ui'
import { useSubjectsStore } from '~/stores/subjects'

const subjectsStore = useSubjectsStore()

const activeTab = ref<string>('active')
const searchQuery = ref('')

const activeSubjects = computed(() => subjectsStore.activeSubjects)
const archivedSubjects = computed(() => subjectsStore.archivedSubjects)

function filter(list: SubjectResponse[]) {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q)
    return list
  return list.filter(s =>
    s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q),
  )
}

const filteredActive = computed(() => filter(activeSubjects.value))
const filteredArchived = computed(() => filter(archivedSubjects.value))

const tabs = computed(() => [
  {
    label: 'Активные',
    value: 'active',
    icon: 'i-lucide-book-open',
    badge: activeSubjects.value.length || undefined,
  },
  {
    label: 'Архивные',
    value: 'archived',
    icon: 'i-lucide-archive',
    badge: archivedSubjects.value.length || undefined,
  },
])

const isArchived = computed(() => activeTab.value === 'archived')
const currentSubjects = computed(() => isArchived.value ? filteredArchived.value : filteredActive.value)
const currentPending = computed(() => isArchived.value ? subjectsStore.archivedSubjectsPending : subjectsStore.activeSubjectsPending)
const currentError = computed(() => isArchived.value ? subjectsStore.archivedSubjectsError : subjectsStore.activeSubjectsError)

function setActiveSubject(subject: SubjectResponse): void {
  subjectsStore.setActiveSubject(subject)
}

watch(activeTab, async (value) => {
  if (value !== 'archived')
    return
  await subjectsStore.loadArchivedSubjectsOnce()
})

async function onRefresh() {
  if (!subjectsStore.teacherId)
    return
  await subjectsStore.refreshForCurrentTab(isArchived.value)
}

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  return [
    { label: 'Предметы', to: '/dashboard/subjects' },
  ]
})
</script>

<template>
  <NuxtLayout name="dashboard" panel-id="dashboard-subjects" panel-title="Предметы">
    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <template #navbar-right>
      <SubjectsCreateToolbarForm />
    </template>

    <div class="flex flex-col gap-6">
      <UTabs
        v-model="activeTab"
        :items="tabs"
        :content="false"
      />

      <div class="flex items-center gap-3 flex-wrap">
        <UInput
          v-model="searchQuery"
          placeholder="Поиск предметов..."
          icon="i-lucide-search"
          color="neutral"
          variant="outline"
          class="w-full sm:w-80"
          :disabled="!subjectsStore.teacherId"
        />

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="currentPending"
          :disabled="!subjectsStore.teacherId"
          @click="onRefresh"
        />
      </div>

      <UAlert
        v-if="currentError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-x"
        title="Ошибка загрузки"
        :description="currentError.message"
      />

      <div v-if="currentPending && currentSubjects.length === 0" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <USkeleton v-for="i in 6" :key="i" class="h-32" />
      </div>

      <div v-else-if="currentSubjects.length === 0" class="py-12">
        <UEmpty
          :icon="isArchived ? 'i-lucide-archive' : 'i-lucide-book-open'"
          :title="isArchived ? 'Архивных предметов нет' : 'Активных предметов нет'"
          :description="!isArchived ? 'Создайте первый предмет с помощью кнопки выше.' : undefined"
          variant="naked"
        />
      </div>

      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="subject in currentSubjects"
          :key="subject.id"
          class="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
          :ui="{ body: 'p-0' }"
          @click="setActiveSubject(subject); navigateTo(`/dashboard/subjects/${subject.id}`)"
        >
          <div class="flex flex-col gap-3 p-5">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UIcon name="i-lucide-book-open" class="size-5" />
                </div>
                <div class="min-w-0">
                  <h3 class="truncate font-semibold">
                    {{ subject.name }}
                  </h3>
                  <p class="text-xs text-muted">
                    {{ new Date(subject.createdAt).toLocaleDateString('ru-RU') }}
                  </p>
                </div>
              </div>
              <UBadge
                v-if="subject.archived"
                label="Архив"
                color="neutral"
                variant="soft"
                size="sm"
              />
            </div>

            <p class="line-clamp-2 text-sm text-muted">
              {{ subject.description || 'Нет описания' }}
            </p>

            <div class="flex items-center justify-between pt-1">
              <span class="text-xs text-muted">
                Обновлено {{ new Date(subject.updatedAt).toLocaleDateString('ru-RU') }}
              </span>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-chevron-right"
                class="opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </NuxtLayout>
</template>
