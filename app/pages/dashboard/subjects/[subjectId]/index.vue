<script setup lang="ts">
import { useSubjectsStore } from '~/stores/subjects'

const subjectsStore = useSubjectsStore()
const route = useRoute()
const subjectId = computed(() => String(route.params.subjectId ?? ''))

const subject = computed(() =>
  subjectsStore.activeSubjects.find(s => s.id === subjectId.value)
  ?? subjectsStore.archivedSubjects.find(s => s.id === subjectId.value)
  ?? null,
)

const isLoading = computed(() =>
  subjectsStore.activeSubjectsPending || subjectsStore.archivedSubjectsPending,
)

function formatDate(value: string | null): string {
  if (!value)
    return '—'
  return new Date(value).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div>
      <h1 class="text-xl font-semibold">
        Общее
      </h1>
    </div>

    <UCard>
      <template v-if="isLoading">
        <div class="flex flex-col gap-3">
          <USkeleton class="h-5 w-48" />
          <USkeleton class="h-4 w-80" />
          <USkeleton class="h-4 w-32" />
        </div>
      </template>

      <template v-else-if="subject">
        <dl class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <dt class="text-sm text-muted">
              Название
            </dt>
            <dd class="font-medium">
              {{ subject.name }}
            </dd>
          </div>

          <div class="flex flex-col gap-1">
            <dt class="text-sm text-muted">
              Описание
            </dt>
            <dd :class="subject.description ? '' : 'text-muted'">
              {{ subject.description ?? '—' }}
            </dd>
          </div>

          <div class="flex flex-col gap-1">
            <dt class="text-sm text-muted">
              Статус
            </dt>
            <dd>
              <UBadge
                :label="subject.archived ? 'Архивный' : 'Активный'"
                :color="subject.archived ? 'neutral' : 'success'"
                variant="soft"
              />
            </dd>
          </div>

          <div class="flex flex-col gap-1">
            <dt class="text-sm text-muted">
              Создан
            </dt>
            <dd>{{ formatDate(subject.createdAt) }}</dd>
          </div>

          <div class="flex flex-col gap-1">
            <dt class="text-sm text-muted">
              Обновлён
            </dt>
            <dd>{{ formatDate(subject.updatedAt) }}</dd>
          </div>

          <div v-if="subject.archived" class="flex flex-col gap-1">
            <dt class="text-sm text-muted">
              Архивирован
            </dt>
            <dd>{{ formatDate(subject.archivedAt) }}</dd>
          </div>
        </dl>
      </template>

      <template v-else>
        <UEmpty
          icon="i-lucide-book"
          title="Предмет не найден"
          variant="naked"
          class="py-8"
        />
      </template>
    </UCard>
  </section>
</template>
